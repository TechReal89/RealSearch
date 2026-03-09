import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.payment import Payment, PaymentChannel
from app.models.user import User
from app.schemas.payment import (
    PaymentChannelResponse,
    PaymentCreate,
    PaymentListResponse,
    PaymentResponse,
)
from app.services.payment_service import (
    create_momo_payment_request,
    generate_bank_transfer_info,
    process_momo_webhook,
    process_sepay_webhook,
)
from app.services.promotion_service import (
    apply_promotion,
    calculate_promotion_bonus,
    validate_promotion,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/channels", response_model=list[PaymentChannelResponse])
async def get_channels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentChannel)
        .where(PaymentChannel.is_active == True)
        .order_by(PaymentChannel.sort_order)
    )
    return [PaymentChannelResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/create", status_code=201)
async def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    channel = await db.get(PaymentChannel, data.channel_id)
    if not channel or not channel.is_active:
        raise NotFoundError("Payment channel not found or inactive")

    if data.amount < float(channel.min_amount) or data.amount > float(channel.max_amount):
        raise BadRequestError(
            f"Amount must be between {channel.min_amount} and {channel.max_amount}"
        )

    fee = data.amount * float(channel.fee_percent) / 100
    net_amount = data.amount - fee

    # Validate & apply promotion if provided
    bonus_credit = 0
    promotion_id = None
    actual_amount = data.amount

    if data.promotion_code:
        promo_result = await validate_promotion(
            db, data.promotion_code, current_user, data.amount
        )
        if not promo_result["valid"]:
            raise BadRequestError(promo_result["reason"])

        promo = promo_result["promotion"]
        bonus = calculate_promotion_bonus(promo, data.amount, data.credit_amount or 0)
        bonus_credit = bonus["bonus_credit"]
        promotion_id = promo.id

        # Apply discount if applicable
        if bonus["discount_amount"] > 0:
            actual_amount = data.amount - bonus["discount_amount"]
            net_amount = actual_amount - (actual_amount * float(channel.fee_percent) / 100)

    transaction_id = f"RS-{uuid.uuid4().hex[:12].upper()}"

    payment = Payment(
        user_id=current_user.id,
        channel_id=data.channel_id,
        amount=actual_amount,
        fee=fee,
        net_amount=net_amount,
        purpose=data.purpose,
        credit_amount=data.credit_amount,
        tier_id=data.tier_id,
        tier_duration=data.tier_duration,
        transaction_id=transaction_id,
        promotion_id=promotion_id,
        bonus_credit=bonus_credit,
    )
    db.add(payment)
    await db.flush()

    # Record promotion usage
    if promotion_id and data.promotion_code:
        promo_result = await validate_promotion(
            db, data.promotion_code, current_user, data.amount
        )
        if promo_result["valid"]:
            await apply_promotion(db, promo_result["promotion"], current_user.id, payment.id)

    await db.commit()
    await db.refresh(payment)

    response = PaymentResponse.model_validate(payment).model_dump()

    # Thêm thông tin chuyển khoản nếu là bank_transfer hoặc sepay
    if channel.name in ("bank_transfer", "sepay"):
        response["transfer_info"] = generate_bank_transfer_info(
            payment, channel.config or {}
        )

    # Tạo MoMo payment link nếu là momo
    if channel.name == "momo":
        config = channel.config or {}
        return_url = config.get("return_url", "https://realsearch.techreal.vn/payments/result")
        notify_url = config.get("notify_url", "https://api.realsearch.techreal.vn/api/v1/payments/callback/momo")

        momo_req = create_momo_payment_request(
            payment, config, return_url, notify_url
        )
        if momo_req:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    momo_res = await client.post(
                        momo_req["endpoint"],
                        json=momo_req["body"],
                    )
                    momo_data = momo_res.json()
                    if momo_data.get("resultCode") == 0:
                        response["momo_pay_url"] = momo_data.get("payUrl", "")
                        response["momo_qr_url"] = momo_data.get("qrCodeUrl", "")
                    else:
                        logger.error(f"MoMo create payment failed: {momo_data}")
                        response["momo_error"] = momo_data.get("message", "MoMo error")
            except Exception as e:
                logger.error(f"MoMo API error: {e}")
                response["momo_error"] = "Không thể kết nối MoMo"

    return response


@router.post("/callback/sepay")
async def sepay_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    SePay webhook callback - tự động xác nhận thanh toán.
    SePay gọi endpoint này khi có giao dịch mới trên tài khoản ngân hàng.
    """
    try:
        data = await request.json()
    except Exception:
        return {"success": False, "reason": "Invalid JSON"}

    # Lấy API key từ channel config để verify
    result = await db.execute(
        select(PaymentChannel).where(PaymentChannel.name == "sepay")
    )
    channel = result.scalar_one_or_none()

    api_key = ""
    if channel and channel.config:
        api_key = channel.config.get("api_key", "")

    # Verify Authorization header nếu có api_key
    if api_key:
        auth_header = request.headers.get("Authorization", "")
        expected = f"Bearer {api_key}"
        if auth_header != expected:
            logger.warning("SePay webhook: invalid API key")
            return {"success": False, "reason": "Unauthorized"}

    result = await process_sepay_webhook(db, data, api_key)
    logger.info(f"SePay webhook result: {result}")
    return result


@router.post("/callback/momo")
async def momo_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    MoMo IPN webhook callback - tự động xác nhận thanh toán MoMo.
    MoMo gọi endpoint này khi giao dịch hoàn tất.
    """
    try:
        data = await request.json()
    except Exception:
        return {"resultCode": 1, "message": "Invalid JSON"}

    logger.info(f"MoMo webhook received: orderId={data.get('orderId')}")

    # Lấy secret key từ channel config
    result = await db.execute(
        select(PaymentChannel).where(PaymentChannel.name == "momo")
    )
    channel = result.scalar_one_or_none()

    secret_key = ""
    if channel and channel.config:
        secret_key = channel.config.get("secret_key", "")

    webhook_result = await process_momo_webhook(db, data, secret_key)
    logger.info(f"MoMo webhook result: {webhook_result}")

    # MoMo expects resultCode in response
    if webhook_result.get("success"):
        return {"resultCode": 0, "message": "OK"}
    return {"resultCode": 1, "message": webhook_result.get("reason", "Error")}


@router.post("/promotions/validate")
async def validate_promo_code(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate a promotion code before payment."""
    data = await request.json()
    code = data.get("code", "")
    amount = data.get("amount", 0)
    credit_amount = data.get("credit_amount", 0)

    if not code:
        raise BadRequestError("Vui lòng nhập mã khuyến mãi")

    result = await validate_promotion(db, code, current_user, amount)

    if not result["valid"]:
        return {"valid": False, "reason": result["reason"]}

    promo = result["promotion"]
    bonus = calculate_promotion_bonus(promo, amount, credit_amount)

    return {
        "valid": True,
        "promotion": {
            "id": promo.id,
            "name": promo.name,
            "type": promo.type,
            "value": float(promo.value),
        },
        "bonus": bonus,
    }


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.user_id == current_user.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment not found")
    return PaymentResponse.model_validate(payment)


@router.get("/history", response_model=PaymentListResponse)
async def get_payment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = Payment.user_id == current_user.id
    count_q = select(func.count()).select_from(Payment).where(base)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(Payment).where(base)
        .order_by(Payment.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    result = await db.execute(query)
    payments = result.scalars().all()

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total=total, page=page, page_size=page_size,
    )
