from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job, JobStatus, JobType
from app.models.setting import SystemSetting
from app.models.tier import MembershipTierConfig
from app.models.user import User
from app.schemas.job import JobCreate, JobListResponse, JobResponse, JobUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _get_user_job(job_id: int, user: User, db: AsyncSession) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found")
    return job


async def _get_setting(db: AsyncSession, key: str, default: int = 0) -> int:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    return int(setting.value) if setting else default


async def _get_user_tier_config(db: AsyncSession, user: User) -> MembershipTierConfig | None:
    result = await db.execute(
        select(MembershipTierConfig).where(MembershipTierConfig.name == user.tier.value)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: JobStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job).where(Job.user_id == current_user.id)
    count_query = select(func.count()).select_from(Job).where(Job.user_id == current_user.id)

    if status:
        query = query.where(Job.status == status)
        count_query = count_query.where(Job.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total, page=page, page_size=page_size,
    )


@router.get("/pricing")
async def get_job_pricing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get job pricing config and user's tier limits for the job creation form."""
    tier_config = await _get_user_tier_config(db, current_user)

    return {
        "min_cost_viewlink": await _get_setting(db, "min_cost_viewlink", 10),
        "min_cost_keyword": await _get_setting(db, "min_cost_keyword", 20),
        "extra_internal_click_cost": await _get_setting(db, "extra_internal_click_cost", 5),
        "extra_keyword_cost": await _get_setting(db, "extra_keyword_cost", 10),
        "tier": current_user.tier.value,
        "tier_max_internal_clicks": tier_config.max_internal_clicks if tier_config else 0,
        "tier_max_keywords": tier_config.max_keywords if tier_config else 1,
        "allow_internal_click": tier_config.allow_internal_click if tier_config else False,
        "allow_keyword_seo": tier_config.allow_keyword_seo if tier_config else False,
    }


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tier_config = await _get_user_tier_config(db, current_user)

    # Enforce minimum credit_per_view based on job type
    if data.job_type == JobType.VIEWLINK:
        min_cost = await _get_setting(db, "min_cost_viewlink", 10)
        if data.credit_per_view < min_cost:
            raise BadRequestError(
                f"ViewLink yêu cầu tối thiểu {min_cost} credit/lượt. "
                f"Bạn đang đặt {data.credit_per_view} credit/lượt."
            )
    elif data.job_type == JobType.KEYWORD_SEO:
        min_cost = await _get_setting(db, "min_cost_keyword", 20)
        if data.credit_per_view < min_cost:
            raise BadRequestError(
                f"Keyword SEO yêu cầu tối thiểu {min_cost} credit/lượt. "
                f"Bạn đang đặt {data.credit_per_view} credit/lượt."
            )

    # Validate internal clicks against tier
    config = data.config or {}
    if config.get("click_internal_links"):
        if tier_config and not tier_config.allow_internal_click:
            raise BadRequestError(
                "Cấp bậc của bạn không hỗ trợ tính năng click link nội bộ. "
                "Vui lòng nâng cấp tài khoản."
            )
        max_clicks = config.get("max_internal_clicks", 0)
        tier_limit = tier_config.max_internal_clicks if tier_config else 0
        extra_internal_click_cost = await _get_setting(db, "extra_internal_click_cost", 5)
        extra_clicks = max(0, max_clicks - tier_limit)
        if extra_clicks > 0:
            extra_cost = extra_clicks * extra_internal_click_cost
            # Extra cost is added per view on top of credit_per_view
            # We just validate and inform, the actual cost is credit_per_view
            # which the user should have set appropriately

    # Validate keywords against tier
    if data.job_type == JobType.KEYWORD_SEO:
        keywords = config.get("keywords", [])
        tier_limit = tier_config.max_keywords if tier_config else 1
        extra_keyword_cost = await _get_setting(db, "extra_keyword_cost", 10)
        extra_keywords = max(0, len(keywords) - tier_limit)

    # Check credit balance
    estimated_cost = data.total_credit_budget or (data.credit_per_view * data.target_count)
    if current_user.credit_balance < data.credit_per_view:
        raise BadRequestError(
            f"Không đủ credit. Bạn có {current_user.credit_balance} credit, "
            f"cần ít nhất {data.credit_per_view} credit/lượt để tạo job."
        )

    job = Job(
        user_id=current_user.id,
        job_type=data.job_type,
        title=data.title,
        target_url=data.target_url,
        target_count=data.target_count,
        daily_limit=data.daily_limit,
        credit_per_view=data.credit_per_view,
        total_credit_budget=data.total_credit_budget or estimated_cost,
        start_date=data.start_date,
        end_date=data.end_date,
        config=data.config,
        priority=data.priority,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return JobResponse.model_validate(await _get_user_job(job_id, current_user, db))


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(job_id, current_user, db)
    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        raise BadRequestError("Cannot edit completed or cancelled jobs")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(job_id, current_user, db)
    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        raise BadRequestError("Job already finished")
    job.status = JobStatus.CANCELLED
    await db.commit()
    return {"detail": "Job cancelled"}


@router.post("/{job_id}/start", response_model=JobResponse)
async def start_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(job_id, current_user, db)
    if job.status not in (JobStatus.DRAFT, JobStatus.PAUSED):
        raise BadRequestError(f"Cannot start job with status '{job.status.value}'")

    # Kiểm tra credit trước khi start
    remaining_tasks = job.target_count - job.completed_count
    cost_per_task = job.credit_per_view
    if current_user.credit_balance < cost_per_task:
        raise BadRequestError(
            f"Không đủ credit để chạy job. Bạn có {current_user.credit_balance} credit, "
            f"cần ít nhất {cost_per_task} credit/lượt. "
            f"Còn {remaining_tasks} lượt chưa hoàn thành."
        )

    job.status = JobStatus.ACTIVE
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.post("/{job_id}/pause", response_model=JobResponse)
async def pause_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(job_id, current_user, db)
    if job.status != JobStatus.ACTIVE:
        raise BadRequestError("Can only pause active jobs")

    job.status = JobStatus.PAUSED
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.post("/{job_id}/resume", response_model=JobResponse)
async def resume_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(job_id, current_user, db)
    if job.status != JobStatus.PAUSED:
        raise BadRequestError("Can only resume paused jobs")

    # Kiểm tra credit trước khi resume
    if current_user.credit_balance < job.credit_per_view:
        raise BadRequestError(
            f"Không đủ credit để tiếp tục job. Bạn có {current_user.credit_balance} credit, "
            f"cần ít nhất {job.credit_per_view} credit/lượt."
        )

    job.status = JobStatus.ACTIVE
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.get("/{job_id}/tasks")
async def get_job_tasks(
    job_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_job(job_id, current_user, db)

    from app.models.task import Task
    count_q = select(func.count()).select_from(Task).where(Task.job_id == job_id)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(Task).where(Task.job_id == job_id)
        .order_by(Task.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    result = await db.execute(query)
    tasks = result.scalars().all()

    return {
        "tasks": [
            {
                "id": t.id, "status": t.status.value, "assigned_to": t.assigned_to,
                "time_spent": t.time_spent, "credits_earned": t.credits_earned,
                "error_message": t.error_message, "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in tasks
        ],
        "total": total, "page": page, "page_size": page_size,
    }
