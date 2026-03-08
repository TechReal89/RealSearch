from datetime import datetime

from pydantic import BaseModel, Field


class PaymentChannelResponse(BaseModel):
    id: int
    name: str
    display_name: str
    icon_url: str | None
    is_active: bool
    fee_percent: float
    min_amount: float
    max_amount: float

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    channel_id: int
    amount: float = Field(gt=0)
    purpose: str = Field(pattern=r"^(buy_credit|buy_tier|buy_both)$")
    credit_amount: int | None = None
    tier_id: int | None = None
    tier_duration: int | None = None
    promotion_code: str | None = None


class PaymentResponse(BaseModel):
    id: int
    user_id: int
    channel_id: int
    amount: float
    fee: float
    net_amount: float
    purpose: str
    credit_amount: int | None
    status: str
    transaction_id: str | None
    bonus_credit: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class PaymentListResponse(BaseModel):
    payments: list[PaymentResponse]
    total: int
    page: int
    page_size: int
