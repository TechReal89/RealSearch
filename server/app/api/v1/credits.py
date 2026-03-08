from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.credit import CreditTransaction
from app.models.package import CreditPackage
from app.models.user import User
from app.schemas.credit import (
    CreditBalanceResponse,
    CreditHistoryResponse,
    CreditPackageResponse,
    CreditTransactionResponse,
)

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalanceResponse)
async def get_balance(current_user: User = Depends(get_current_user)):
    return CreditBalanceResponse(
        credit_balance=current_user.credit_balance,
        total_earned=current_user.total_earned,
        total_spent=current_user.total_spent,
    )


@router.get("/history", response_model=CreditHistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(CreditTransaction).where(CreditTransaction.user_id == current_user.id)
    count_q = select(func.count()).select_from(CreditTransaction).where(
        CreditTransaction.user_id == current_user.id
    )

    total = (await db.execute(count_q)).scalar() or 0
    query = base.order_by(CreditTransaction.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size)
    result = await db.execute(query)
    txns = result.scalars().all()

    return CreditHistoryResponse(
        transactions=[CreditTransactionResponse.model_validate(t) for t in txns],
        total=total, page=page, page_size=page_size,
    )


@router.get("/packages", response_model=list[CreditPackageResponse])
async def get_packages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CreditPackage)
        .where(CreditPackage.is_active == True)
        .order_by(CreditPackage.sort_order)
    )
    return [CreditPackageResponse.model_validate(p) for p in result.scalars().all()]
