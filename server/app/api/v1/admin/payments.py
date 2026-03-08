from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.credit import CreditTransaction, CreditType
from app.models.payment import Payment, PaymentChannel
from app.models.user import User
from app.schemas.payment import PaymentListResponse, PaymentResponse

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])


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

    payment.status = "completed"
    payment.completed_at = datetime.now(timezone.utc)

    # Credit user if buying credits
    if payment.credit_amount:
        user = await db.get(User, payment.user_id)
        total_credit = payment.credit_amount + payment.bonus_credit
        user.credit_balance += total_credit
        user.total_earned += total_credit

        txn = CreditTransaction(
            user_id=user.id,
            type=CreditType.PURCHASE,
            amount=total_credit,
            balance_after=user.credit_balance,
            description=f"Purchased {payment.credit_amount} + {payment.bonus_credit} bonus credits",
            reference_type="payment",
            reference_id=payment.id,
        )
        db.add(txn)

    await db.commit()
    return {"detail": "Payment confirmed"}


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

    if payment.credit_amount:
        user = await db.get(User, payment.user_id)
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

    await db.commit()
    return {"detail": "Payment refunded"}
