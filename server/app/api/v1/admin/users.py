from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.credit import CreditTransaction, CreditType
from app.models.user import MembershipTier, User, UserRole
from app.schemas.admin import AdminCreditAdjust, AdminUserUpdate
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    tier: str | None = None,
    is_active: bool | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        flt = or_(User.username.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
        query = query.where(flt)
        count_query = count_query.where(flt)
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    if tier:
        query = query.where(User.tier == tier)
        count_query = count_query.where(User.tier == tier)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "users": [UserResponse.model_validate(u).model_dump() for u in users],
        "total": total, "page": page, "page_size": page_size,
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = UserRole(data.role)
    if data.tier is not None:
        user.tier = MembershipTier(data.tier)
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_verified is not None:
        user.is_verified = data.is_verified

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/credit")
async def adjust_credit(
    user_id: int,
    data: AdminCreditAdjust,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")

    user.credit_balance += data.amount
    if data.amount > 0:
        user.total_earned += data.amount
    else:
        user.total_spent += abs(data.amount)

    txn = CreditTransaction(
        user_id=user.id,
        type=CreditType.ADMIN_ADJUST,
        amount=data.amount,
        balance_after=user.credit_balance,
        description=f"Admin adjust: {data.description}",
        reference_type="admin",
        reference_id=admin.id,
    )
    db.add(txn)
    await db.commit()

    return {
        "detail": "Credit adjusted",
        "new_balance": user.credit_balance,
        "amount": data.amount,
    }


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    user.is_active = False
    await db.commit()
    return {"detail": "User deactivated"}
