import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models.credit import CreditTransaction, CreditType
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    MeResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)


def _generate_referral_code(length=8) -> str:
    """Tạo mã giới thiệu ngẫu nhiên."""
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    data: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Anti-abuse: IP rate limit (max 3 registrations per IP per 24h)
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    if client_ip:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        ip_count = (await db.execute(
            select(func.count()).select_from(User).where(
                User.registration_ip == client_ip,
                User.created_at >= cutoff,
            )
        )).scalar() or 0
        if ip_count >= 3:
            raise BadRequestError("Quá nhiều tài khoản được tạo từ địa chỉ IP này. Vui lòng thử lại sau.")

    result = await db.execute(
        select(User).where(or_(User.email == data.email, User.username == data.username))
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.email == data.email:
            raise ConflictError("Email already registered")
        raise ConflictError("Username already taken")

    # Xử lý referral code
    referred_by = None
    if data.referral_code:
        ref_result = await db.execute(
            select(User).where(User.referral_code == data.referral_code.upper())
        )
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referred_by = referrer.id

    # Tạo referral code cho user mới
    referral_code = _generate_referral_code()
    # Đảm bảo unique
    while True:
        check = await db.execute(
            select(User).where(User.referral_code == referral_code)
        )
        if not check.scalar_one_or_none():
            break
        referral_code = _generate_referral_code()

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        referral_code=referral_code,
        referred_by=referred_by,
        registration_ip=client_ip,
    )
    db.add(user)

    # Referral bonus: KHÔNG trao ngay - chỉ trao sau khi user mới hoàn thành 10 tasks
    # (xử lý trong job_dispatcher.py handle_task_completed)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            or_(User.username == data.username, User.email == data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise UnauthorizedError("Incorrect username or password")

    if not user.is_active:
        raise BadRequestError("Account is deactivated")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return MeResponse(user=UserResponse.model_validate(current_user))


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Đổi mật khẩu."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise BadRequestError("Mật khẩu hiện tại không đúng")

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Đổi mật khẩu thành công"}
