from datetime import datetime, timezone

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.credit import CreditTransaction, CreditType
from app.models.tier import MembershipTierConfig
from app.models.user import MembershipTier, User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    full_name: str | None = None,
    phone: str | None = None,
    avatar_url: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if full_name is not None:
        current_user.full_name = full_name
    if phone is not None:
        current_user.phone = phone
    if avatar_url is not None:
        current_user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/referral")
async def get_referral_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin referral của user."""
    from sqlalchemy import func, select
    from app.models.credit import CreditTransaction, CreditType
    from app.models.task import Task, TaskStatus

    # Đếm số người đã giới thiệu
    referred_count = (await db.execute(
        select(func.count()).select_from(User).where(User.referred_by == current_user.id)
    )).scalar() or 0

    # Đếm số referral đã nhận thưởng (có CreditTransaction REFERRAL)
    rewarded_count = (await db.execute(
        select(func.count()).select_from(CreditTransaction).where(
            CreditTransaction.user_id == current_user.id,
            CreditTransaction.type == CreditType.REFERRAL,
            CreditTransaction.reference_type == "referral",
        )
    )).scalar() or 0

    # Pending = referred but not yet rewarded
    pending_count = max(0, referred_count - rewarded_count)

    # Tổng credit từ referral
    total_referral_credit = (await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.amount), 0))
        .where(
            CreditTransaction.user_id == current_user.id,
            CreditTransaction.type == CreditType.REFERRAL,
        )
    )).scalar() or 0

    return {
        "referral_code": current_user.referral_code,
        "referral_link": f"https://realsearch.techreal.vn/?ref={current_user.referral_code}",
        "referred_count": referred_count,
        "rewarded_count": rewarded_count,
        "pending_count": pending_count,
        "total_referral_credit": int(total_referral_credit),
        "required_tasks": 10,
    }


@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func, select
    from app.models.job import Job, JobStatus
    from app.models.task import Task, TaskStatus

    jobs_result = await db.execute(
        select(func.count()).select_from(Job).where(Job.user_id == current_user.id)
    )
    active_jobs_result = await db.execute(
        select(func.count()).select_from(Job).where(
            Job.user_id == current_user.id, Job.status == JobStatus.ACTIVE
        )
    )
    tasks_result = await db.execute(
        select(func.count()).select_from(Task).where(
            Task.assigned_to == current_user.id, Task.status == TaskStatus.COMPLETED
        )
    )

    return {
        "credit_balance": current_user.credit_balance,
        "total_earned": current_user.total_earned,
        "total_spent": current_user.total_spent,
        "tier": current_user.tier.value,
        "total_jobs": jobs_result.scalar() or 0,
        "active_jobs": active_jobs_result.scalar() or 0,
        "tasks_completed": tasks_result.scalar() or 0,
    }


@router.get("/tiers")
async def list_available_tiers(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tier và giá cho user (cả VND và credit)."""
    result = await db.execute(
        select(MembershipTierConfig)
        .where(MembershipTierConfig.is_active == True)
        .order_by(MembershipTierConfig.sort_order)
    )
    tiers = result.scalars().all()
    return [
        {
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
            "max_internal_clicks": t.max_internal_clicks,
            "max_keywords": t.max_keywords,
        }
        for t in tiers
    ]


class TierUpgradeRequest(BaseModel):
    tier_id: int
    duration: str = Field(default="monthly", pattern="^(monthly|yearly)$")


@router.post("/tier/upgrade-by-credit")
async def upgrade_tier_by_credit(
    data: TierUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Nâng cấp tier bằng credit nạp tiền (CreditsX) - KHÔNG dùng credit cày task."""
    tier_config = await db.get(MembershipTierConfig, data.tier_id)
    if not tier_config or not tier_config.is_active:
        raise BadRequestError("Gói không tồn tại hoặc đã ngừng")

    # Tính giá credit
    if data.duration == "monthly":
        credit_cost = tier_config.credit_price_monthly
    else:
        credit_cost = tier_config.credit_price_yearly

    if credit_cost <= 0:
        raise BadRequestError("Gói này không hỗ trợ thanh toán bằng credit")

    # Tính tổng credit nạp tiền (purchased + promotion + bonus + referral + admin_adjust + refund)
    # KHÔNG bao gồm earn_task (tiền cày job)
    from sqlalchemy import func as sqlfunc
    purchased_credits = (await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(CreditTransaction.amount), 0))
        .where(
            CreditTransaction.user_id == current_user.id,
            CreditTransaction.type.in_([
                CreditType.PURCHASE,
                CreditType.PROMOTION,
                CreditType.BONUS,
                CreditType.REFERRAL,
                CreditType.ADMIN_ADJUST,
                CreditType.REFUND,
            ]),
        )
    )).scalar() or 0

    # Trừ đi credit đã chi (spend_job dùng cả 2 loại, nhưng tier upgrade dùng riêng)
    spent_on_tiers = (await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(sqlfunc.abs(CreditTransaction.amount)), 0))
        .where(
            CreditTransaction.user_id == current_user.id,
            CreditTransaction.type == CreditType.SPEND_JOB,
            CreditTransaction.reference_type == "tier_upgrade",
        )
    )).scalar() or 0

    available_purchased = int(purchased_credits) - int(spent_on_tiers)
    available_purchased = min(available_purchased, current_user.credit_balance)

    if available_purchased < credit_cost:
        raise BadRequestError(
            f"Không đủ credit nạp tiền (CreditsX). "
            f"Bạn có {available_purchased} credit nạp tiền khả dụng, "
            f"cần {credit_cost} credit cho gói {tier_config.display_name} "
            f"({'tháng' if data.duration == 'monthly' else 'năm'}). "
            f"Credit kiếm từ chạy task không thể dùng để nâng cấp cấp bậc."
        )

    # Kiểm tra tổng số dư cũng đủ
    if current_user.credit_balance < credit_cost:
        raise BadRequestError(
            f"Không đủ credit. Bạn có {current_user.credit_balance} credit, "
            f"cần {credit_cost} credit cho gói {tier_config.display_name} "
            f"({'tháng' if data.duration == 'monthly' else 'năm'})."
        )

    # Trừ credit
    current_user.credit_balance -= credit_cost
    current_user.total_spent += credit_cost

    # Nâng tier
    tier_map = {
        "bronze": MembershipTier.BRONZE,
        "silver": MembershipTier.SILVER,
        "gold": MembershipTier.GOLD,
        "diamond": MembershipTier.DIAMOND,
    }
    old_tier = current_user.tier.value
    new_tier_enum = tier_map.get(tier_config.name)
    if new_tier_enum:
        current_user.tier = new_tier_enum

    # Tính thời hạn
    duration_months = 1 if data.duration == "monthly" else 12
    now = datetime.now(timezone.utc)
    base_date = (
        current_user.tier_expires
        if current_user.tier_expires and current_user.tier_expires > now
        else now
    )
    current_user.tier_expires = base_date + relativedelta(months=duration_months)

    # Ghi transaction
    txn = CreditTransaction(
        user_id=current_user.id,
        type=CreditType.SPEND_JOB,
        amount=-credit_cost,
        balance_after=current_user.credit_balance,
        description=(
            f"Nâng cấp {tier_config.display_name} "
            f"({'tháng' if data.duration == 'monthly' else 'năm'}) "
            f"bằng {credit_cost} credit"
        ),
        reference_type="tier_upgrade",
        reference_id=tier_config.id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "old_tier": old_tier,
        "new_tier": current_user.tier.value,
        "credit_deducted": credit_cost,
        "credit_balance": current_user.credit_balance,
        "tier_expires": current_user.tier_expires.isoformat(),
    }
