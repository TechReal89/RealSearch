from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)

    type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Conditions
    min_purchase: Mapped[float | None] = mapped_column(Numeric(12, 0), nullable=True)
    min_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    current_uses: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Time
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PromotionUsage(Base):
    __tablename__ = "promotion_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    promotion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("promotions.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payments.id"), nullable=True
    )
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("promotion_id", "user_id", "payment_id", name="uq_promotion_user_payment"),
    )
