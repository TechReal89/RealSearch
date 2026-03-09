from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.credit import CreditTransaction, CreditType
from app.models.payment import Payment, PaymentChannel
from app.models.user import MembershipTier, User
from app.schemas.payment import PaymentListResponse, PaymentResponse
from app.services.payment_service import _complete_payment

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])


# ====== Payment Channels CRUD ======

class PaymentChannelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    icon_url: str | None = None
    config: dict = {}
    is_active: bool = True
    fee_percent: float = 0
    min_amount: float = 10000
    max_amount: float = 10000000
    sort_order: int = 0


class PaymentChannelUpdate(BaseModel):
    display_name: str | None = None
    icon_url: str | None = None
    config: dict | None = None
    is_active: bool | None = None
    fee_percent: float | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    sort_order: int | None = None


@router.get("/channels")
async def list_payment_channels(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách tất cả kênh thanh toán (kể cả đã tắt)."""
    result = await db.execute(
        select(PaymentChannel).order_by(PaymentChannel.sort_order)
    )
    channels = result.scalars().all()
    return {
        "channels": [
            {
                "id": c.id,
                "name": c.name,
                "display_name": c.display_name,
                "icon_url": c.icon_url,
                "config": c.config or {},
                "is_active": c.is_active,
                "fee_percent": float(c.fee_percent),
                "min_amount": float(c.min_amount),
                "max_amount": float(c.max_amount),
                "sort_order": c.sort_order,
                "created_at": c.created_at.isoformat(),
            }
            for c in channels
        ]
    }


@router.post("/channels", status_code=201)
async def create_payment_channel(
    data: PaymentChannelCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo kênh thanh toán mới."""
    existing = (await db.execute(
        select(PaymentChannel).where(PaymentChannel.name == data.name)
    )).scalar_one_or_none()
    if existing:
        raise BadRequestError(f"Kênh '{data.name}' đã tồn tại")

    channel = PaymentChannel(
        name=data.name,
        display_name=data.display_name,
        icon_url=data.icon_url,
        config=data.config,
        is_active=data.is_active,
        fee_percent=data.fee_percent,
        min_amount=data.min_amount,
        max_amount=data.max_amount,
        sort_order=data.sort_order,
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return {"detail": "Channel created", "id": channel.id}


@router.put("/channels/{channel_id}")
async def update_payment_channel(
    channel_id: int,
    data: PaymentChannelUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật cấu hình kênh thanh toán."""
    channel = await db.get(PaymentChannel, channel_id)
    if not channel:
        raise NotFoundError("Channel not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(channel, key, value)

    await db.commit()
    return {"detail": "Channel updated"}


@router.delete("/channels/{channel_id}")
async def delete_payment_channel(
    channel_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Vô hiệu hóa kênh thanh toán."""
    channel = await db.get(PaymentChannel, channel_id)
    if not channel:
        raise NotFoundError("Channel not found")

    channel.is_active = False
    await db.commit()
    return {"detail": "Channel deactivated"}


# ====== Payment Transactions ======


@router.get("", response_model=PaymentListResponse)
async def list_all_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    user_id: int | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment)
    count_query = select(func.count()).select_from(Payment)

    if status:
        query = query.where(Payment.status == status)
        count_query = count_query.where(Payment.status == status)
    if user_id:
        query = query.where(Payment.user_id == user_id)
        count_query = count_query.where(Payment.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    payments = result.scalars().all()

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total=total, page=page, page_size=page_size,
    )


@router.get("/stats")
async def payment_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.net_amount), 0))
        .where(Payment.status == "completed")
    )).scalar()

    total_payments = (await db.execute(
        select(func.count()).select_from(Payment)
    )).scalar()

    pending = (await db.execute(
        select(func.count()).select_from(Payment).where(Payment.status == "pending")
    )).scalar()

    return {
        "total_revenue": float(total_revenue or 0),
        "total_payments": total_payments or 0,
        "pending_payments": pending or 0,
    }


@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise NotFoundError("Payment not found")
    if payment.status != "pending":
        raise BadRequestError("Can only confirm pending payments")

    result = await _complete_payment(db, payment, "Admin")
    await db.commit()

    if not result["success"]:
        raise BadRequestError(result.get("reason", "Error"))

    return {"detail": "Payment confirmed", **result}


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise NotFoundError("Payment not found")
    if payment.status != "completed":
        raise BadRequestError("Can only refund completed payments")

    payment.status = "refunded"

    user = await db.get(User, payment.user_id)
    if not user:
        raise NotFoundError("User not found")

    # Refund credits
    if payment.credit_amount:
        total_credit = payment.credit_amount + payment.bonus_credit
        user.credit_balance -= total_credit
        user.total_spent += total_credit

        txn = CreditTransaction(
            user_id=user.id,
            type=CreditType.REFUND,
            amount=-total_credit,
            balance_after=user.credit_balance,
            description=f"Refund payment #{payment.id}",
            reference_type="payment",
            reference_id=payment.id,
        )
        db.add(txn)

    # Downgrade tier if was tier purchase
    if payment.purpose in ("buy_tier", "buy_both") and payment.tier_id:
        user.tier = MembershipTier.BRONZE
        user.tier_expires = None

    await db.commit()
    return {"detail": "Payment refunded"}
