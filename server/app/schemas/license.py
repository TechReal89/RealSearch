"""Pydantic schemas cho License API."""
from datetime import datetime

from pydantic import BaseModel, Field


# === Product ===
class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9\-]+$")
    description: str | None = None
    icon_url: str | None = None
    latest_version: str | None = None
    download_url: str | None = None
    features: dict | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9\-]+$")
    description: str | None = None
    icon_url: str | None = None
    latest_version: str | None = None
    download_url: str | None = None
    features: dict | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    icon_url: str | None
    latest_version: str | None
    download_url: str | None
    features: dict | None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# === License Plan ===
class LicensePlanCreate(BaseModel):
    product_id: int
    name: str = Field(min_length=1, max_length=200)
    duration_days: int = Field(ge=0)  # 0 = lifetime
    price: int = Field(ge=0)
    max_devices: int = Field(ge=1, default=1)
    features: dict | None = None


class LicensePlanUpdate(BaseModel):
    name: str | None = None
    duration_days: int | None = Field(default=None, ge=0)
    price: int | None = Field(default=None, ge=0)
    max_devices: int | None = Field(default=None, ge=1)
    features: dict | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class LicensePlanResponse(BaseModel):
    id: int
    product_id: int
    name: str
    duration_days: int
    price: int
    max_devices: int
    features: dict | None
    is_active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# === License ===
class LicenseCreate(BaseModel):
    product_id: int
    plan_id: int | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    max_devices: int = Field(ge=1, default=1)
    duration_days: int | None = Field(default=None, ge=0)  # Override plan duration
    features: dict | None = None
    note: str | None = None


class LicenseBatchCreate(BaseModel):
    product_id: int
    plan_id: int | None = None
    quantity: int = Field(ge=1, le=500)
    max_devices: int = Field(ge=1, default=1)
    duration_days: int | None = Field(default=None, ge=0)
    features: dict | None = None
    note: str | None = None


class LicenseUpdate(BaseModel):
    customer_name: str | None = None
    customer_email: str | None = None
    status: str | None = Field(default=None, pattern=r"^(active|expired|revoked|suspended)$")
    max_devices: int | None = Field(default=None, ge=1)
    features: dict | None = None
    note: str | None = None
    expires_at: datetime | None = None


class LicenseResponse(BaseModel):
    id: int
    license_key: str
    product_id: int
    plan_id: int | None
    user_id: int | None
    customer_name: str | None
    customer_email: str | None
    status: str
    max_devices: int
    current_devices: int
    features: dict | None
    note: str | None
    activated_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Joined fields
    product_name: str | None = None
    plan_name: str | None = None

    model_config = {"from_attributes": True}


class LicenseListResponse(BaseModel):
    licenses: list[LicenseResponse]
    total: int
    page: int
    page_size: int


# === License Device ===
class LicenseDeviceResponse(BaseModel):
    id: int
    license_id: int
    machine_id: str
    device_name: str | None
    os_info: str | None
    ip_address: str | None
    is_active: bool
    first_seen: datetime
    last_seen: datetime

    model_config = {"from_attributes": True}


# === License Log ===
class LicenseLogResponse(BaseModel):
    id: int
    license_id: int
    action: str
    machine_id: str | None
    ip_address: str | None
    detail: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# === Client-side (phần mềm Windows gọi) ===
class LicenseActivateRequest(BaseModel):
    license_key: str = Field(min_length=1)
    product_slug: str = Field(min_length=1)
    machine_id: str = Field(min_length=1)
    device_name: str | None = None
    os_info: str | None = None


class LicenseValidateRequest(BaseModel):
    license_key: str = Field(min_length=1)
    product_slug: str = Field(min_length=1)
    machine_id: str = Field(min_length=1)


class LicenseDeactivateRequest(BaseModel):
    license_key: str = Field(min_length=1)
    product_slug: str = Field(min_length=1)
    machine_id: str = Field(min_length=1)


class LicenseInfoRequest(BaseModel):
    license_key: str = Field(min_length=1)
    product_slug: str = Field(min_length=1)


class LicenseClientResponse(BaseModel):
    valid: bool
    license_key: str
    product: str
    plan: str | None = None
    status: str
    expires_at: datetime | None = None
    days_remaining: int | None = None
    max_devices: int = 1
    current_devices: int = 0
    features: dict | None = None
    message: str | None = None
