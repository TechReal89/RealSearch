from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.tier import MembershipTierConfig
from app.models.user import User
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
    """Lấy danh sách tier và giá cho user."""
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
            "price_yearly": float(t.price_yearly), "priority_level": t.priority_level,
            "daily_credit_limit": t.daily_credit_limit, "max_jobs": t.max_jobs,
            "max_urls_per_job": t.max_urls_per_job, "max_clients": t.max_clients,
            "credit_earn_multiplier": float(t.credit_earn_multiplier),
            "allow_keyword_seo": t.allow_keyword_seo, "allow_backlink": t.allow_backlink,
            "allow_social_media": t.allow_social_media,
            "allow_internal_click": t.allow_internal_click,
            "allow_proxy": t.allow_proxy, "allow_scheduling": t.allow_scheduling,
            "allow_priority_boost": t.allow_priority_boost,
            "allow_detailed_report": t.allow_detailed_report,
        }
        for t in tiers
    ]
