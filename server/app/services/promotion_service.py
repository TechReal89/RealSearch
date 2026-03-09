"""Promotion service - validate & apply promotions/coupons."""
import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promotion import Promotion, PromotionUsage
from app.models.user import User

logger = logging.getLogger(__name__)


async def validate_promotion(
    db: AsyncSession,
    code: str,
    user: User,
    amount: float = 0,
) -> dict:
    """
    Validate a promotion code for a user.
    Returns {"valid": True, "promotion": Promotion} or {"valid": False, "reason": str}.
    """
    result = await db.execute(
        select(Promotion).where(
            Promotion.code == code.upper(),
            Promotion.is_active == True,
        )
    )
    promo = result.scalar_one_or_none()

    if not promo:
        return {"valid": False, "reason": "Mã khuyến mãi không tồn tại hoặc đã hết hạn"}

    now = datetime.now(timezone.utc)

    # Check date range
    if now < promo.start_date:
        return {"valid": False, "reason": "Khuyến mãi chưa bắt đầu"}
    if now > promo.end_date:
        return {"valid": False, "reason": "Khuyến mãi đã hết hạn"}

    # Check max uses
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        return {"valid": False, "reason": "Khuyến mãi đã hết lượt sử dụng"}

    # Check per-user usage
    user_usage_count = (await db.execute(
        select(func.count()).select_from(PromotionUsage).where(
            PromotionUsage.promotion_id == promo.id,
            PromotionUsage.user_id == user.id,
        )
    )).scalar() or 0

    if user_usage_count >= promo.max_uses_per_user:
        return {"valid": False, "reason": "Bạn đã sử dụng hết lượt cho mã này"}

    # Check min_purchase
    if promo.min_purchase and amount < float(promo.min_purchase):
        return {
            "valid": False,
            "reason": f"Đơn hàng tối thiểu {int(promo.min_purchase):,} VND",
        }

    # Check min_tier
    tier_order = {"bronze": 0, "silver": 1, "gold": 2, "diamond": 3}
    if promo.min_tier:
        user_tier_rank = tier_order.get(user.tier.value, 0)
        required_rank = tier_order.get(promo.min_tier, 0)
        if user_tier_rank < required_rank:
            return {"valid": False, "reason": f"Yêu cầu cấp bậc tối thiểu: {promo.min_tier}"}

    return {"valid": True, "promotion": promo}


def calculate_promotion_bonus(promo: Promotion, amount: float, credit_amount: int = 0) -> dict:
    """
    Calculate bonus from promotion based on type.
    Returns dict with calculated values.
    """
    result = {
        "bonus_credit": 0,
        "discount_amount": 0,
        "description": "",
    }

    ptype = promo.type
    value = float(promo.value)

    if ptype == "credit_bonus_percent":
        result["bonus_credit"] = int(credit_amount * value / 100)
        result["description"] = f"+{value:.0f}% bonus credit"

    elif ptype == "credit_bonus_flat":
        result["bonus_credit"] = int(value)
        result["description"] = f"+{int(value)} bonus credit"

    elif ptype == "tier_discount_percent":
        result["discount_amount"] = amount * value / 100
        result["description"] = f"-{value:.0f}% giảm giá"

    elif ptype == "tier_discount_flat":
        result["discount_amount"] = min(value, amount)
        result["description"] = f"-{int(value):,} VND giảm giá"

    elif ptype == "free_credits":
        result["bonus_credit"] = int(value)
        result["description"] = f"Tặng {int(value)} credit miễn phí"

    elif ptype == "double_earn":
        result["description"] = f"Nhân x{value} credit khi cày view"

    return result


async def apply_promotion(
    db: AsyncSession,
    promo: Promotion,
    user_id: int,
    payment_id: int | None = None,
) -> None:
    """Record promotion usage and increment counter."""
    usage = PromotionUsage(
        promotion_id=promo.id,
        user_id=user_id,
        payment_id=payment_id,
    )
    db.add(usage)
    promo.current_uses += 1


async def get_active_promotions(db: AsyncSession) -> list[Promotion]:
    """Get all currently active promotions."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Promotion).where(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now,
        ).order_by(Promotion.created_at.desc())
    )
    return list(result.scalars().all())
