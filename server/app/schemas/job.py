from datetime import datetime

from pydantic import BaseModel, Field

from app.models.job import JobStatus, JobType


class JobCreate(BaseModel):
    job_type: JobType
    title: str = Field(min_length=1, max_length=255)
    target_url: str = Field(min_length=1)
    target_count: int = Field(ge=1, le=100000, default=100)
    daily_limit: int | None = None
    credit_per_view: int = Field(ge=1, default=1)
    total_credit_budget: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    config: dict = Field(default_factory=dict)
    priority: int = Field(ge=1, le=10, default=5)


class JobUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    target_url: str | None = None
    target_count: int | None = Field(None, ge=1)
    daily_limit: int | None = None
    credit_per_view: int | None = Field(None, ge=1)
    total_credit_budget: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    config: dict | None = None
    priority: int | None = Field(None, ge=1, le=10)


class JobResponse(BaseModel):
    id: int
    user_id: int
    job_type: JobType
    status: JobStatus
    title: str
    target_url: str
    target_count: int
    completed_count: int
    daily_limit: int | None
    today_count: int
    credit_per_view: int
    total_credit_budget: int | None
    credit_spent: int
    start_date: datetime | None
    end_date: datetime | None
    config: dict
    priority: int
    admin_priority: int
    is_exchange: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    page_size: int
