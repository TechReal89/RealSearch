from datetime import datetime

from pydantic import BaseModel

from app.models.credit import CreditType


class CreditBalanceResponse(BaseModel):
    credit_balance: int
    total_earned: int
    total_spent: int


class CreditTransactionResponse(BaseModel):
    id: int
    user_id: int
    type: CreditType
    amount: int
    balance_after: int
    reference_type: str | None
    reference_id: int | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditHistoryResponse(BaseModel):
    transactions: list[CreditTransactionResponse]
    total: int
    page: int
    page_size: int


class CreditPackageResponse(BaseModel):
    id: int
    name: str
    credit_amount: int
    bonus_credit: int
    price: float
    description: str | None
    badge: str | None
    min_tier: str | None
    is_active: bool

    model_config = {"from_attributes": True}
