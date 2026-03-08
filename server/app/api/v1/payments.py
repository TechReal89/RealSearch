import uuid

from fastapi import APIRouter, Depends, Query
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

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/channels", response_model=list[PaymentChannelResponse])
async def get_channels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentChannel)
        .where(PaymentChannel.is_active == True)
        .order_by(PaymentChannel.sort_order)
    )
    return [PaymentChannelResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/create", response_model=PaymentResponse, status_code=201)
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
    return PaymentResponse.model_validate(payment)


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
