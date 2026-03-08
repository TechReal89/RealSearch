from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PaymentChannel(Base):
    __tablename__ = "payment_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    config: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    fee_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0, server_default="0")
    min_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=10000, server_default="10000")
    max_amount: Mapped[float] = mapped_column(
        Numeric(12, 0), default=10000000, server_default="10000000"
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    channel_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("payment_channels.id"), nullable=False
    )

    amount: Mapped[float] = mapped_column(Numeric(12, 0), nullable=False)
    fee: Mapped[float] = mapped_column(Numeric(12, 0), default=0, server_default="0")
    net_amount: Mapped[float] = mapped_column(Numeric(12, 0), nullable=False)

    # Purpose
    purpose: Mapped[str] = mapped_column(String(50), nullable=False)
    credit_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("membership_tiers.id"), nullable=True
    )
    tier_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    payment_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    # Promotion
    promotion_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("promotions.id"), nullable=True
    )
    bonus_credit: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
