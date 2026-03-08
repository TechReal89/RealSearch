from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, INET
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClientSession(Base):
    __tablename__ = "client_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    machine_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    country: Mapped[str | None] = mapped_column(String(5), nullable=True)

    is_online: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_heartbeat: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    disconnected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    tasks_failed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    credits_earned: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    client_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    browser_mode: Mapped[str] = mapped_column(
        String(20), default="headed_hidden", server_default="headed_hidden"
    )
    enabled_job_types: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    max_concurrent: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
