from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MembershipTierConfig(Base):
    __tablename__ = "membership_tiers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Pricing (VND - thanh toán tiền thật)
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 0), default=0, server_default="0")
    price_yearly: Mapped[float] = mapped_column(Numeric(12, 0), default=0, server_default="0")

    # Pricing (Credits - thanh toán bằng credit kiếm được)
    credit_price_monthly: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    credit_price_yearly: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Benefits
    priority_level: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    daily_credit_limit: Mapped[int] = mapped_column(Integer, default=50, server_default="50")
    max_jobs: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    max_urls_per_job: Mapped[int] = mapped_column(Integer, default=10, server_default="10")
    max_clients: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    credit_earn_multiplier: Mapped[float] = mapped_column(
        Numeric(3, 1), default=1.0, server_default="1.0"
    )

    # Features
    allow_keyword_seo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    allow_backlink: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    allow_social_media: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    allow_internal_click: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    allow_proxy: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    allow_scheduling: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    allow_priority_boost: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    allow_detailed_report: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
