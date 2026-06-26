from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — BẮT BUỘC đặt qua .env (không bake secret vào source)
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT — BẮT BUỘC đặt qua .env (không bake secret vào source)
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Server
    ENVIRONMENT: str = "development"  # đặt "production" trong .env.production để siết secret
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


# Các giá trị secret yếu/mặc định KHÔNG được phép dùng ở production
_WEAK_SECRETS = {
    "",
    "dev-secret-key-change-in-production",
    "dev-secret-key-change-in-production-abc123xyz",
    "your-secret-key-change-this",
}


def _validate(s: "Settings") -> None:
    # Chỉ fail-closed ở production (ENVIRONMENT=production). Dev/staging cũ chạy bình thường.
    if s.ENVIRONMENT != "production":
        return
    if not s.DATABASE_URL:
        raise RuntimeError("Thiếu DATABASE_URL ở production — đặt trong .env")
    if s.JWT_SECRET_KEY in _WEAK_SECRETS or len(s.JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY yếu/mặc định ở production — sinh secret mạnh "
            "(openssl rand -hex 48) và đặt trong .env"
        )


settings = Settings()
_validate(settings)
