import logging
import uuid

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
    generate_bank_transfer_info,
    process_sepay_webhook,
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

    payment = Payment(
        user_id=current_user.id,
        channel_id=data.channel_id,
        amount=data.amount,
        fee=fee,
        net_amount=net_amount,
        purpose=data.purpose,
        credit_amount=data.credit_amount,
        tier_id=data.tier_id,
        tier_duration=data.tier_duration,
        transaction_id=f"RS-{uuid.uuid4().hex[:12].upper()}",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    response = PaymentResponse.model_validate(payment).model_dump()

    # Thêm thông tin chuyển khoản nếu là bank_transfer hoặc sepay
    if channel.name in ("bank_transfer", "sepay"):
        response["transfer_info"] = generate_bank_transfer_info(
            payment, channel.config or {}
        )

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
