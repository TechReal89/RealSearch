"""Client-side License API - phần mềm Windows gọi."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.license import (
    LicenseActivateRequest,
    LicenseClientResponse,
    LicenseDeactivateRequest,
    LicenseInfoRequest,
    LicenseValidateRequest,
)
from app.services.license_service import (
    activate_license,
    deactivate_license,
    get_license_info,
    validate_license,
)

router = APIRouter(prefix="/license", tags=["License"])


def _get_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/activate", response_model=LicenseClientResponse)
async def activate(
    data: LicenseActivateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Kích hoạt license key + bind hardware."""
    result = await activate_license(
        db=db,
        license_key=data.license_key,
        product_slug=data.product_slug,
        machine_id=data.machine_id,
        device_name=data.device_name,
        os_info=data.os_info,
        ip_address=_get_ip(request),
    )
    return result


@router.post("/validate", response_model=LicenseClientResponse)
async def validate(
    data: LicenseValidateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Check license còn hạn không (gọi mỗi lần mở app)."""
    result = await validate_license(
        db=db,
        license_key=data.license_key,
        product_slug=data.product_slug,
        machine_id=data.machine_id,
        ip_address=_get_ip(request),
    )
    return result


@router.post("/deactivate")
async def deactivate(
    data: LicenseDeactivateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Gỡ device khỏi license key."""
    result = await deactivate_license(
        db=db,
        license_key=data.license_key,
        product_slug=data.product_slug,
        machine_id=data.machine_id,
        ip_address=_get_ip(request),
    )
    return result


@router.post("/info", response_model=LicenseClientResponse)
async def info(
    data: LicenseInfoRequest,
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin license."""
    result = await get_license_info(
        db=db,
        license_key=data.license_key,
        product_slug=data.product_slug,
    )
    return result
