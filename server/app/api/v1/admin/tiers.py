from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.tier import MembershipTierConfig
from app.models.user import User
from app.schemas.admin import TierConfigCreate, TierConfigUpdate

router = APIRouter(prefix="/admin/tiers", tags=["admin-tiers"])


def _tier_to_dict(t: MembershipTierConfig) -> dict:
    return {
        "id": t.id, "name": t.name, "display_name": t.display_name,
        "color": t.color, "price_monthly": float(t.price_monthly),
        "price_yearly": float(t.price_yearly),
        "credit_price_monthly": t.credit_price_monthly,
        "credit_price_yearly": t.credit_price_yearly,
        "priority_level": t.priority_level,
        "daily_credit_limit": t.daily_credit_limit, "max_jobs": t.max_jobs,
        "max_urls_per_job": t.max_urls_per_job, "max_clients": t.max_clients,
        "credit_earn_multiplier": float(t.credit_earn_multiplier),
        "allow_keyword_seo": t.allow_keyword_seo, "allow_backlink": t.allow_backlink,
        "allow_social_media": t.allow_social_media,
        "allow_internal_click": t.allow_internal_click,
        "allow_proxy": t.allow_proxy, "allow_scheduling": t.allow_scheduling,
        "allow_priority_boost": t.allow_priority_boost,
        "allow_detailed_report": t.allow_detailed_report,
        "sort_order": t.sort_order, "is_active": t.is_active,
    }


@router.get("")
async def list_tiers(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MembershipTierConfig).order_by(MembershipTierConfig.sort_order)
    )
    return [_tier_to_dict(t) for t in result.scalars().all()]


@router.post("", status_code=201)
async def create_tier(
    data: TierConfigCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(MembershipTierConfig).where(MembershipTierConfig.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Tier name already exists")

    tier = MembershipTierConfig(**data.model_dump())
    db.add(tier)
    await db.commit()
    await db.refresh(tier)
    return _tier_to_dict(tier)


@router.put("/{tier_id}")
async def update_tier(
    tier_id: int,
    data: TierConfigUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tier = await db.get(MembershipTierConfig, tier_id)
    if not tier:
        raise NotFoundError("Tier not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tier, key, value)

    await db.commit()
    await db.refresh(tier)
    return _tier_to_dict(tier)


@router.delete("/{tier_id}")
async def delete_tier(
    tier_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tier = await db.get(MembershipTierConfig, tier_id)
    if not tier:
        raise NotFoundError("Tier not found")
    tier.is_active = False
    await db.commit()
    return {"detail": "Tier deactivated"}
