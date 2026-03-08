from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.job import Job, JobStatus, JobType
from app.models.user import User
from app.schemas.admin import AdminJobPriority
from app.schemas.job import JobListResponse, JobResponse

router = APIRouter(prefix="/admin/jobs", tags=["admin-jobs"])


class AdminCreateJob(BaseModel):
    user_id: int
    title: str
    job_type: str
    target_url: str
    target_count: int = 100
    credit_per_view: int = 1
    priority: int = 5
    admin_priority: int = 0
    config: dict = {}


class AdminUpdateJob(BaseModel):
    title: str | None = None
    target_url: str | None = None
    target_count: int | None = None
    credit_per_view: int | None = None
    priority: int | None = None
    admin_priority: int | None = None
    config: dict | None = None


@router.get("", response_model=JobListResponse)
async def list_all_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: JobStatus | None = None,
    job_type: JobType | None = None,
    user_id: int | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job)
    count_query = select(func.count()).select_from(Job)

    if status:
        query = query.where(Job.status == status)
        count_query = count_query.where(Job.status == status)
    if job_type:
        query = query.where(Job.job_type == job_type)
        count_query = count_query.where(Job.job_type == job_type)
    if user_id:
        query = query.where(Job.user_id == user_id)
        count_query = count_query.where(Job.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=JobResponse)
async def admin_create_job(
    data: AdminCreateJob,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, data.user_id)
    if not user:
        raise NotFoundError("User not found")
    job = Job(
        user_id=data.user_id,
        title=data.title,
        job_type=JobType(data.job_type),
        target_url=data.target_url,
        target_count=data.target_count,
        credit_per_view=data.credit_per_view,
        priority=data.priority,
        admin_priority=data.admin_priority,
        config=data.config,
        status=JobStatus.DRAFT,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobResponse)
async def admin_update_job(
    job_id: int,
    data: AdminUpdateJob,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    return JobResponse.model_validate(job)


@router.put("/{job_id}/priority", response_model=JobResponse)
async def set_job_priority(
    job_id: int,
    data: AdminJobPriority,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    job.admin_priority = data.admin_priority
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.post("/{job_id}/start", response_model=JobResponse)
async def admin_start_job(
    job_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    if job.status not in (JobStatus.DRAFT, JobStatus.PAUSED):
        raise BadRequestError("Chỉ có thể bắt đầu job ở trạng thái nháp hoặc tạm dừng")
    job.status = JobStatus.ACTIVE
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.post("/{job_id}/pause", response_model=JobResponse)
async def admin_pause_job(
    job_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    if job.status != JobStatus.ACTIVE:
        raise BadRequestError("Can only pause active jobs")
    job.status = JobStatus.PAUSED
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.post("/{job_id}/resume", response_model=JobResponse)
async def admin_resume_job(
    job_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    if job.status != JobStatus.PAUSED:
        raise BadRequestError("Can only resume paused jobs")
    job.status = JobStatus.ACTIVE
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}")
async def admin_delete_job(
    job_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise NotFoundError("Job not found")
    job.status = JobStatus.CANCELLED
    await db.commit()
    return {"detail": "Job cancelled"}
