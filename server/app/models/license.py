"""License management models - Quản lý license cho nhiều phần mềm."""
import enum
import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LicenseStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"


class LicenseLogAction(str, enum.Enum):
    ACTIVATE = "activate"
    DEACTIVATE = "deactivate"
    VALIDATE = "validate"
    REVOKE = "revoke"
    SUSPEND = "suspend"
    REACTIVATE = "reactivate"
    EXTEND = "extend"
    DEVICE_ADDED = "device_added"
    DEVICE_REMOVED = "device_removed"


def generate_license_key() -> str:
    """Generate a license key in format XXXX-XXXX-XXXX-XXXX."""
    chars = string.ascii_uppercase + string.digits
    segments = []
    for _ in range(4):
        segment = "".join(secrets.choice(chars) for _ in range(4))
        segments.append(segment)
    return "-".join(segments)


class Product(Base):
    """Phần mềm được quản lý license."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latest_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    download_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class LicensePlan(Base):
    """Gói license cho từng product."""
    __tablename__ = "license_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = lifetime
    price: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # VND
    max_devices: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class License(Base):
    """License key."""
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    license_key: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
        default=generate_license_key,
    )
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    plan_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("license_plans.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Customer info (for non-registered users)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[LicenseStatus] = mapped_column(
        Enum(LicenseStatus, values_callable=lambda x: [e.value for e in x]),
        default=LicenseStatus.ACTIVE,
        server_default="active",
    )
    max_devices: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    current_devices: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class LicenseDevice(Base):
    """Hardware binding cho license."""
    __tablename__ = "license_devices"
    __table_args__ = (
        UniqueConstraint("license_id", "machine_id", name="uq_license_device"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"), nullable=False, index=True)
    machine_id: Mapped[str] = mapped_column(String(255), nullable=False)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class LicenseLog(Base):
    """Audit trail cho license."""
    __tablename__ = "license_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"), nullable=False, index=True)
    action: Mapped[LicenseLogAction] = mapped_column(
        Enum(LicenseLogAction, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    machine_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
