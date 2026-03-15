"""License service - xử lý logic license."""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.license import (
    License, LicenseDevice, LicenseLog, LicenseLogAction, LicensePlan,
    LicenseStatus, Product, generate_license_key,
)

logger = logging.getLogger(__name__)


async def _resolve_features(db: AsyncSession, license: "License") -> dict:
    """Merge features: plan.features là base, license.features override."""
    features = {}
    if license.plan_id:
        plan = await db.get(LicensePlan, license.plan_id)
        if plan and plan.features:
            features.update(plan.features)
    if license.features:
        features.update(license.features)
    return features


async def _resolve_plan_name(db: AsyncSession, license: "License") -> str | None:
    if license.plan_id:
        plan = await db.get(LicensePlan, license.plan_id)
        if plan:
            return plan.name
    return None


def _fail_response(message: str, license_key: str = "", product: str = "", status: str = "invalid") -> dict:
    """Build a failed license response with all required fields."""
    return {
        "valid": False,
        "license_key": license_key,
        "product": product,
        "status": status,
        "message": message,
    }


async def activate_license(
    db: AsyncSession,
    license_key: str,
    product_slug: str,
    machine_id: str,
    device_name: str | None = None,
    os_info: str | None = None,
    ip_address: str | None = None,
) -> dict:
    """Kích hoạt license key + bind hardware."""
    # Find product
    result = await db.execute(
        select(Product).where(Product.slug == product_slug, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        return _fail_response("Sản phẩm không tồn tại")

    # Find license
    result = await db.execute(
        select(License).where(
            License.license_key == license_key.upper().strip(),
            License.product_id == product.id,
        )
    )
    license = result.scalar_one_or_none()
    if not license:
        return _fail_response("License key không hợp lệ", product=product.name)

    # Check status
    if license.status == LicenseStatus.REVOKED:
        return _fail_response("License đã bị thu hồi", license.license_key, product.name, "revoked")
    if license.status == LicenseStatus.SUSPENDED:
        return _fail_response("License đã bị tạm ngưng", license.license_key, product.name, "suspended")

    # Check expiry
    if license.expires_at and license.expires_at < datetime.now(timezone.utc):
        license.status = LicenseStatus.EXPIRED
        await db.commit()
        return _fail_response("License đã hết hạn", license.license_key, product.name, "expired")

    # Check if device already registered
    result = await db.execute(
        select(LicenseDevice).where(
            LicenseDevice.license_id == license.id,
            LicenseDevice.machine_id == machine_id,
        )
    )
    existing_device = result.scalar_one_or_none()

    if existing_device:
        # Update last_seen
        existing_device.last_seen = datetime.now(timezone.utc)
        existing_device.ip_address = ip_address
        existing_device.is_active = True
        if device_name:
            existing_device.device_name = device_name
        if os_info:
            existing_device.os_info = os_info
    else:
        # Check device limit
        result = await db.execute(
            select(func.count(LicenseDevice.id)).where(
                LicenseDevice.license_id == license.id,
                LicenseDevice.is_active == True,
            )
        )
        active_count = result.scalar() or 0
        if active_count >= license.max_devices:
            return _fail_response(
                f"Đã đạt giới hạn {license.max_devices} thiết bị. Vui lòng gỡ bớt thiết bị cũ.",
                license.license_key, product.name, license.status.value,
            )

        # Add new device
        device = LicenseDevice(
            license_id=license.id,
            machine_id=machine_id,
            device_name=device_name,
            os_info=os_info,
            ip_address=ip_address,
        )
        db.add(device)
        license.current_devices = active_count + 1

    # First activation
    if not license.activated_at:
        license.activated_at = datetime.now(timezone.utc)
        # Set expiry if plan has duration and not yet set
        if not license.expires_at and license.plan_id:
            plan = await db.get(LicensePlan, license.plan_id)
            if plan and plan.duration_days > 0:
                license.expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)

    license.status = LicenseStatus.ACTIVE

    # Log
    log = LicenseLog(
        license_id=license.id,
        action=LicenseLogAction.ACTIVATE,
        machine_id=machine_id,
        ip_address=ip_address,
        detail=f"Device: {device_name or 'unknown'}, OS: {os_info or 'unknown'}",
    )
    db.add(log)
    await db.commit()

    plan_name = await _resolve_plan_name(db, license)
    features = await _resolve_features(db, license)

    days_remaining = None
    if license.expires_at:
        delta = license.expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    return {
        "valid": True,
        "license_key": license.license_key,
        "product": product.name,
        "plan": plan_name,
        "status": license.status.value,
        "expires_at": license.expires_at.isoformat() if license.expires_at else None,
        "days_remaining": days_remaining,
        "max_devices": license.max_devices,
        "current_devices": license.current_devices,
        "features": features,
        "message": "Kích hoạt thành công",
    }


async def validate_license(
    db: AsyncSession,
    license_key: str,
    product_slug: str,
    machine_id: str,
    ip_address: str | None = None,
) -> dict:
    """Validate license key - gọi mỗi lần mở app."""
    result = await db.execute(
        select(Product).where(Product.slug == product_slug, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        return _fail_response("Sản phẩm không tồn tại")

    result = await db.execute(
        select(License).where(
            License.license_key == license_key.upper().strip(),
            License.product_id == product.id,
        )
    )
    license = result.scalar_one_or_none()
    if not license:
        return _fail_response("License key không hợp lệ", product=product.name)

    # Check status
    if license.status in (LicenseStatus.REVOKED, LicenseStatus.SUSPENDED):
        msg = "thu hồi" if license.status == LicenseStatus.REVOKED else "tạm ngưng"
        return _fail_response(f"License đã bị {msg}", license.license_key, product.name, license.status.value)

    # Check expiry
    if license.expires_at and license.expires_at < datetime.now(timezone.utc):
        license.status = LicenseStatus.EXPIRED
        await db.commit()
        return _fail_response("License đã hết hạn", license.license_key, product.name, "expired")

    if license.status == LicenseStatus.EXPIRED:
        return _fail_response("License đã hết hạn", license.license_key, product.name, "expired")

    # Check device is registered
    result = await db.execute(
        select(LicenseDevice).where(
            LicenseDevice.license_id == license.id,
            LicenseDevice.machine_id == machine_id,
            LicenseDevice.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        return _fail_response("Thiết bị chưa được kích hoạt cho license này", license.license_key, product.name, license.status.value)

    # Update last_seen
    device.last_seen = datetime.now(timezone.utc)
    device.ip_address = ip_address

    # Log validation (throttle: chỉ log 1 lần / 1 giờ)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    result = await db.execute(
        select(func.count(LicenseLog.id)).where(
            LicenseLog.license_id == license.id,
            LicenseLog.action == LicenseLogAction.VALIDATE,
            LicenseLog.machine_id == machine_id,
            LicenseLog.created_at > one_hour_ago,
        )
    )
    recent_count = result.scalar() or 0
    if recent_count == 0:
        log = LicenseLog(
            license_id=license.id,
            action=LicenseLogAction.VALIDATE,
            machine_id=machine_id,
            ip_address=ip_address,
        )
        db.add(log)

    await db.commit()

    plan_name = await _resolve_plan_name(db, license)
    features = await _resolve_features(db, license)

    days_remaining = None
    if license.expires_at:
        delta = license.expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    return {
        "valid": True,
        "license_key": license.license_key,
        "product": product.name,
        "plan": plan_name,
        "status": license.status.value,
        "expires_at": license.expires_at.isoformat() if license.expires_at else None,
        "days_remaining": days_remaining,
        "max_devices": license.max_devices,
        "current_devices": license.current_devices,
        "features": features,
        "message": "License hợp lệ",
    }


async def deactivate_license(
    db: AsyncSession,
    license_key: str,
    product_slug: str,
    machine_id: str,
    ip_address: str | None = None,
) -> dict:
    """Gỡ device khỏi license."""
    result = await db.execute(
        select(Product).where(Product.slug == product_slug, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        return {"success": False, "message": "Sản phẩm không tồn tại"}

    result = await db.execute(
        select(License).where(
            License.license_key == license_key.upper().strip(),
            License.product_id == product.id,
        )
    )
    license = result.scalar_one_or_none()
    if not license:
        return {"success": False, "message": "License key không hợp lệ"}

    result = await db.execute(
        select(LicenseDevice).where(
            LicenseDevice.license_id == license.id,
            LicenseDevice.machine_id == machine_id,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        return {"success": False, "message": "Thiết bị không tìm thấy"}

    device.is_active = False

    # Update current_devices count
    result = await db.execute(
        select(func.count(LicenseDevice.id)).where(
            LicenseDevice.license_id == license.id,
            LicenseDevice.is_active == True,
        )
    )
    license.current_devices = result.scalar() or 0

    log = LicenseLog(
        license_id=license.id,
        action=LicenseLogAction.DEACTIVATE,
        machine_id=machine_id,
        ip_address=ip_address,
        detail="Device deactivated",
    )
    db.add(log)
    await db.commit()

    return {"success": True, "message": "Đã gỡ thiết bị thành công"}


async def get_license_info(
    db: AsyncSession,
    license_key: str,
    product_slug: str,
) -> dict:
    """Lấy thông tin license (không cần machine_id)."""
    result = await db.execute(
        select(Product).where(Product.slug == product_slug, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        return _fail_response("Sản phẩm không tồn tại")

    result = await db.execute(
        select(License).where(
            License.license_key == license_key.upper().strip(),
            License.product_id == product.id,
        )
    )
    license = result.scalar_one_or_none()
    if not license:
        return _fail_response("License key không hợp lệ", product=product.name)

    # Check and update expiry
    if license.expires_at and license.expires_at < datetime.now(timezone.utc):
        if license.status == LicenseStatus.ACTIVE:
            license.status = LicenseStatus.EXPIRED
            await db.commit()

    plan_name = await _resolve_plan_name(db, license)
    features = await _resolve_features(db, license)

    days_remaining = None
    if license.expires_at:
        delta = license.expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    return {
        "valid": license.status == LicenseStatus.ACTIVE,
        "license_key": license.license_key,
        "product": product.name,
        "plan": plan_name,
        "status": license.status.value,
        "expires_at": license.expires_at.isoformat() if license.expires_at else None,
        "days_remaining": days_remaining,
        "max_devices": license.max_devices,
        "current_devices": license.current_devices,
        "features": features,
        "message": None,
    }


async def create_license_batch(
    db: AsyncSession,
    product_id: int,
    quantity: int,
    plan_id: int | None = None,
    max_devices: int = 1,
    duration_days: int | None = None,
    features: dict | None = None,
    note: str | None = None,
) -> list[License]:
    """Tạo hàng loạt license keys."""
    # Resolve duration from plan if not specified
    plan_duration = None
    if plan_id:
        plan = await db.get(LicensePlan, plan_id)
        if plan:
            plan_duration = plan.duration_days
            if max_devices == 1:  # Use plan default if not overridden
                max_devices = plan.max_devices

    # Generate unique keys
    existing_keys = set()
    licenses = []
    for _ in range(quantity):
        key = generate_license_key()
        while key in existing_keys:
            key = generate_license_key()
        existing_keys.add(key)

        # Calculate expiry
        expires_at = None
        dur = duration_days if duration_days is not None else plan_duration
        if dur and dur > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(days=dur)

        lic = License(
            license_key=key,
            product_id=product_id,
            plan_id=plan_id,
            max_devices=max_devices,
            features=features,
            note=note,
            expires_at=expires_at,
        )
        db.add(lic)
        licenses.append(lic)

    await db.commit()
    # Refresh to get IDs
    for lic in licenses:
        await db.refresh(lic)

    return licenses
