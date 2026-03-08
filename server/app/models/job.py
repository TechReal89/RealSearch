import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobType(str, enum.Enum):
    VIEWLINK = "viewlink"
    KEYWORD_SEO = "keyword_seo"
    BACKLINK = "backlink"
    SOCIAL_MEDIA = "social_media"


class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    job_type: Mapped[JobType] = mapped_column(
        Enum(JobType, values_callable=lambda x: [e.value for e in x], name="job_type"),
        nullable=False,
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, values_callable=lambda x: [e.value for e in x], name="job_status"),
        default=JobStatus.DRAFT,
        server_default="draft",
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Target
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, default=100, server_default="100")
    completed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    daily_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    today_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Credit
    credit_per_view: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    total_credit_budget: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credit_spent: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Time
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Advanced config (JSONB)
    config: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    # Priority
    priority: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    admin_priority: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_exchange: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
