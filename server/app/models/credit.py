import enum
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CreditType(str, enum.Enum):
    EARN_TASK = "earn_task"
    SPEND_JOB = "spend_job"
    PURCHASE = "purchase"
    BONUS = "bonus"
    REFERRAL = "referral"
    REFUND = "refund"
    ADMIN_ADJUST = "admin_adjust"
    PROMOTION = "promotion"


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[CreditType] = mapped_column(
        Enum(CreditType, values_callable=lambda x: [e.value for e in x], name="credit_type"),
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)

    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
