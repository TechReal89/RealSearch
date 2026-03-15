from datetime import datetime

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_jobs: int
    active_jobs: int
    total_credits_circulating: int
    total_revenue: float
    online_clients: int


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    tier: str | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class AdminCreditAdjust(BaseModel):
    amount: int
    description: str = Field(min_length=1)


class AdminJobPriority(BaseModel):
    admin_priority: int = Field(ge=0, le=10)


class UserListResponse(BaseModel):
    users: list[dict]
    total: int
    page: int
    page_size: int


class TierConfigCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    color: str | None = None
    price_monthly: float = 0
    price_yearly: float = 0
    credit_price_monthly: int = 0
    credit_price_yearly: int = 0
    priority_level: int = Field(ge=1, le=10, default=1)
    daily_credit_limit: int = 50
    max_jobs: int = 3
    max_urls_per_job: int = 10
    max_clients: int = 1
    credit_earn_multiplier: float = 1.0
    allow_keyword_seo: bool = False
    allow_backlink: bool = False
    allow_social_media: bool = False
    allow_internal_click: bool = False
    allow_proxy: bool = False
    allow_scheduling: bool = False
    allow_priority_boost: bool = False
    allow_detailed_report: bool = False
    max_internal_clicks: int = 0
    max_keywords: int = 1
    sort_order: int = 0


class TierConfigUpdate(TierConfigCreate):
    name: str | None = None
    display_name: str | None = None


class SystemSettingUpdate(BaseModel):
    settings: dict[str, str]


class CreditPackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    credit_amount: int = Field(ge=1)
    bonus_credit: int = Field(ge=0, default=0)
    price: float = Field(gt=0)
    description: str | None = None
    badge: str | None = None
    min_tier: str | None = None
    sort_order: int = 0


class CreditPackageUpdate(BaseModel):
    name: str | None = None
    credit_amount: int | None = Field(None, ge=1)
    bonus_credit: int | None = Field(None, ge=0)
    price: float | None = Field(None, gt=0)
    description: str | None = None
    badge: str | None = None
    min_tier: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
