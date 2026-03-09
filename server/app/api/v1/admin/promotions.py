"""Admin promotion management routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.promotion import Promotion, PromotionUsage
from app.models.user import User

router = APIRouter(prefix="/admin/promotions", tags=["admin-promotions"])


class PromotionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: str | None = Field(None, max_length=50)
    type: str = Field(
        pattern=r"^(credit_bonus_percent|credit_bonus_flat|tier_discount_percent|tier_discount_flat|free_credits|double_earn)$"
    )
    value: float = Field(gt=0)
    min_purchase: float | None = None
    min_tier: str | None = None
    max_uses: int | None = None
    max_uses_per_user: int = 1
    start_date: datetime
    end_date: datetime
    is_active: bool = True


class PromotionUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    type: str | None = None
    value: float | None = None
    min_purchase: float | None = None
    min_tier: str | None = None
    max_uses: int | None = None
    max_uses_per_user: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


@router.get("")
async def list_promotions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Promotion)
    count_query = select(func.count()).select_from(Promotion)

    if is_active is not None:
        query = query.where(Promotion.is_active == is_active)
        count_query = count_query.where(Promotion.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Promotion.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    promotions = result.scalars().all()

    return {
        "promotions": [
            {
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "type": p.type,
                "value": float(p.value),
                "min_purchase": float(p.min_purchase) if p.min_purchase else None,
                "min_tier": p.min_tier,
                "max_uses": p.max_uses,
                "max_uses_per_user": p.max_uses_per_user,
                "current_uses": p.current_uses,
                "start_date": p.start_date.isoformat(),
                "end_date": p.end_date.isoformat(),
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat(),
            }
            for p in promotions
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=201)
async def create_promotion(
    data: PromotionCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if data.end_date <= data.start_date:
        raise BadRequestError("Ngày kết thúc phải sau ngày bắt đầu")

    # Uppercase code for consistency
    code = data.code.upper().strip() if data.code else None

    if code:
        existing = (await db.execute(
            select(Promotion).where(Promotion.code == code)
        )).scalar_one_or_none()
        if existing:
            raise BadRequestError(f"Mã khuyến mãi '{code}' đã tồn tại")

    promo = Promotion(
        name=data.name,
        code=code,
        type=data.type,
        value=data.value,
        min_purchase=data.min_purchase,
        min_tier=data.min_tier,
        max_uses=data.max_uses,
        max_uses_per_user=data.max_uses_per_user,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)

    return {
        "id": promo.id,
        "name": promo.name,
        "code": promo.code,
        "type": promo.type,
        "detail": "Promotion created",
    }


@router.put("/{promotion_id}")
async def update_promotion(
    promotion_id: int,
    data: PromotionUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise NotFoundError("Promotion not found")

    update_data = data.model_dump(exclude_unset=True)

    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].upper().strip()
        existing = (await db.execute(
            select(Promotion).where(
                Promotion.code == update_data["code"],
                Promotion.id != promotion_id,
            )
        )).scalar_one_or_none()
        if existing:
            raise BadRequestError(f"Mã '{update_data['code']}' đã tồn tại")

    for key, value in update_data.items():
        setattr(promo, key, value)

    await db.commit()
    return {"detail": "Promotion updated"}


@router.delete("/{promotion_id}")
async def delete_promotion(
    promotion_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise NotFoundError("Promotion not found")

    promo.is_active = False
    await db.commit()
    return {"detail": "Promotion deactivated"}


@router.get("/{promotion_id}/usage")
async def promotion_usage(
    promotion_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise NotFoundError("Promotion not found")

    total = (await db.execute(
        select(func.count()).select_from(PromotionUsage)
        .where(PromotionUsage.promotion_id == promotion_id)
    )).scalar() or 0

    result = await db.execute(
        select(PromotionUsage)
        .where(PromotionUsage.promotion_id == promotion_id)
        .order_by(PromotionUsage.used_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    usages = result.scalars().all()

    return {
        "promotion": {
            "id": promo.id,
            "name": promo.name,
            "code": promo.code,
            "current_uses": promo.current_uses,
            "max_uses": promo.max_uses,
        },
        "usages": [
            {
                "id": u.id,
                "user_id": u.user_id,
                "payment_id": u.payment_id,
                "used_at": u.used_at.isoformat(),
            }
            for u in usages
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
