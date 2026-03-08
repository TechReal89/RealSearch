from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
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
