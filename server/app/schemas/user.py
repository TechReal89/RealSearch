from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import MembershipTier, UserRole


# --- Request schemas ---


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = Field(None, max_length=100)
    referral_code: str | None = Field(None, max_length=20)


class UserLogin(BaseModel):
    username: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# --- Response schemas ---


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str | None
    role: UserRole
    tier: MembershipTier
    credit_balance: int
    total_earned: int
    total_spent: int
    is_active: bool
    referral_code: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    user: UserResponse
