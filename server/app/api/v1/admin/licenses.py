"""Admin License API - quản lý products, plans, licenses."""
import csv
import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.license import (
    License, LicenseDevice, LicenseLog, LicenseLogAction, LicensePlan,
    LicenseStatus, Product,
)
from app.models.user import User
from app.schemas.license import (
    LicenseBatchCreate, LicenseCreate, LicenseDeviceResponse,
    LicenseListResponse, LicenseLogResponse, LicensePlanCreate,
    LicensePlanResponse, LicensePlanUpdate, LicenseResponse, LicenseUpdate,
    ProductCreate, ProductResponse, ProductUpdate,
)
from app.services.license_service import create_license_batch

router = APIRouter(
    prefix="/admin/license",
    tags=["Admin - License"],
    dependencies=[Depends(get_admin_user)],
)


# ==================== PRODUCTS ====================

@router.get("/products", response_model=list[ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).order_by(Product.sort_order, Product.id))
    return result.scalars().all()


@router.post("/products", response_model=ProductResponse)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    # Check slug unique
    existing = await db.execute(select(Product).where(Product.slug == data.slug))
    if existing.scalar_one_or_none():
        raise BadRequestError(f"Slug '{data.slug}' đã tồn tại")

    product = Product(**data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db)
):
    product = await db.get(Product, product_id)
    if not product:
        raise NotFoundError("Sản phẩm không tồn tại")

    update_data = data.model_dump(exclude_unset=True)
    if "slug" in update_data:
        existing = await db.execute(
            select(Product).where(Product.slug == update_data["slug"], Product.id != product_id)
        )
        if existing.scalar_one_or_none():
            raise BadRequestError(f"Slug '{update_data['slug']}' đã tồn tại")

    for key, value in update_data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise NotFoundError("Sản phẩm không tồn tại")

    # Check if has licenses
    result = await db.execute(
        select(func.count(License.id)).where(License.product_id == product_id)
    )
    count = result.scalar() or 0
    if count > 0:
        raise BadRequestError(f"Không thể xoá: có {count} licenses thuộc sản phẩm này")

    await db.delete(product)
    await db.commit()
    return {"success": True}


# ==================== LICENSE PLANS ====================

@router.get("/plans", response_model=list[LicensePlanResponse])
async def list_plans(
    product_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(LicensePlan).order_by(LicensePlan.product_id, LicensePlan.sort_order)
    if product_id:
        query = query.where(LicensePlan.product_id == product_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/plans", response_model=LicensePlanResponse)
async def create_plan(data: LicensePlanCreate, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, data.product_id)
    if not product:
        raise NotFoundError("Sản phẩm không tồn tại")

    plan = LicensePlan(**data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}", response_model=LicensePlanResponse)
async def update_plan(
    plan_id: int, data: LicensePlanUpdate, db: AsyncSession = Depends(get_db)
):
    plan = await db.get(LicensePlan, plan_id)
    if not plan:
        raise NotFoundError("Gói license không tồn tại")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    plan = await db.get(LicensePlan, plan_id)
    if not plan:
        raise NotFoundError("Gói license không tồn tại")

    result = await db.execute(
        select(func.count(License.id)).where(License.plan_id == plan_id)
    )
    count = result.scalar() or 0
    if count > 0:
        raise BadRequestError(f"Không thể xoá: có {count} licenses thuộc gói này")

    await db.delete(plan)
    await db.commit()
    return {"success": True}


# ==================== LICENSES ====================

@router.get("/licenses", response_model=LicenseListResponse)
async def list_licenses(
    product_id: int | None = None,
    plan_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(License)
    count_query = select(func.count(License.id))

    if product_id:
        query = query.where(License.product_id == product_id)
        count_query = count_query.where(License.product_id == product_id)
    if plan_id:
        query = query.where(License.plan_id == plan_id)
        count_query = count_query.where(License.plan_id == plan_id)
    if status:
        query = query.where(License.status == status)
        count_query = count_query.where(License.status == status)
    if search:
        search_filter = (
            License.license_key.ilike(f"%{search}%")
            | License.customer_name.ilike(f"%{search}%")
            | License.customer_email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(License.id.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    licenses = result.scalars().all()

    # Attach product_name and plan_name
    responses = []
    for lic in licenses:
        resp = LicenseResponse.model_validate(lic)
        product = await db.get(Product, lic.product_id)
        resp.product_name = product.name if product else None
        if lic.plan_id:
            plan = await db.get(LicensePlan, lic.plan_id)
            resp.plan_name = plan.name if plan else None
        responses.append(resp)

    return LicenseListResponse(
        licenses=responses, total=total, page=page, page_size=page_size
    )


@router.post("/licenses", response_model=LicenseResponse)
async def create_license(data: LicenseCreate, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, data.product_id)
    if not product:
        raise NotFoundError("Sản phẩm không tồn tại")

    if data.plan_id:
        plan = await db.get(LicensePlan, data.plan_id)
        if not plan:
            raise NotFoundError("Gói license không tồn tại")

    expires_at = None
    if data.duration_days is not None and data.duration_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.duration_days)
    elif data.plan_id:
        plan = await db.get(LicensePlan, data.plan_id)
        if plan and plan.duration_days > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)

    license = License(
        product_id=data.product_id,
        plan_id=data.plan_id,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        max_devices=data.max_devices,
        features=data.features,
        note=data.note,
        expires_at=expires_at,
    )
    db.add(license)
    await db.commit()
    await db.refresh(license)

    resp = LicenseResponse.model_validate(license)
    resp.product_name = product.name
    return resp


@router.post("/licenses/batch")
async def create_licenses_batch(
    data: LicenseBatchCreate, db: AsyncSession = Depends(get_db)
):
    product = await db.get(Product, data.product_id)
    if not product:
        raise NotFoundError("Sản phẩm không tồn tại")

    licenses = await create_license_batch(
        db=db,
        product_id=data.product_id,
        quantity=data.quantity,
        plan_id=data.plan_id,
        max_devices=data.max_devices,
        duration_days=data.duration_days,
        features=data.features,
        note=data.note,
    )
    return {
        "count": len(licenses),
        "keys": [lic.license_key for lic in licenses],
    }


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
async def get_license(license_id: int, db: AsyncSession = Depends(get_db)):
    license = await db.get(License, license_id)
    if not license:
        raise NotFoundError("License không tồn tại")

    resp = LicenseResponse.model_validate(license)
    product = await db.get(Product, license.product_id)
    resp.product_name = product.name if product else None
    if license.plan_id:
        plan = await db.get(LicensePlan, license.plan_id)
        resp.plan_name = plan.name if plan else None
    return resp


@router.put("/licenses/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: int, data: LicenseUpdate, db: AsyncSession = Depends(get_db)
):
    license = await db.get(License, license_id)
    if not license:
        raise NotFoundError("License không tồn tại")

    update_data = data.model_dump(exclude_unset=True)
    old_status = license.status.value

    for key, value in update_data.items():
        if key == "status":
            value = LicenseStatus(value)
        setattr(license, key, value)

    # Log status change
    if "status" in update_data and update_data["status"] != old_status:
        action_map = {
            "revoked": LicenseLogAction.REVOKE,
            "suspended": LicenseLogAction.SUSPEND,
            "active": LicenseLogAction.REACTIVATE,
        }
        action = action_map.get(update_data["status"])
        if action:
            log = LicenseLog(
                license_id=license.id,
                action=action,
                detail=f"Admin changed status: {old_status} -> {update_data['status']}",
            )
            db.add(log)

    await db.commit()
    await db.refresh(license)

    resp = LicenseResponse.model_validate(license)
    product = await db.get(Product, license.product_id)
    resp.product_name = product.name if product else None
    if license.plan_id:
        plan = await db.get(LicensePlan, license.plan_id)
        resp.plan_name = plan.name if plan else None
    return resp


@router.delete("/licenses/{license_id}")
async def delete_license(license_id: int, db: AsyncSession = Depends(get_db)):
    license = await db.get(License, license_id)
    if not license:
        raise NotFoundError("License không tồn tại")

    # Delete devices and logs first
    await db.execute(
        select(LicenseDevice).where(LicenseDevice.license_id == license_id)
    )
    for device in (await db.execute(
        select(LicenseDevice).where(LicenseDevice.license_id == license_id)
    )).scalars().all():
        await db.delete(device)
    for log in (await db.execute(
        select(LicenseLog).where(LicenseLog.license_id == license_id)
    )).scalars().all():
        await db.delete(log)

    await db.delete(license)
    await db.commit()
    return {"success": True}


# ==================== LICENSE DEVICES ====================

@router.get("/licenses/{license_id}/devices", response_model=list[LicenseDeviceResponse])
async def list_devices(license_id: int, db: AsyncSession = Depends(get_db)):
    license = await db.get(License, license_id)
    if not license:
        raise NotFoundError("License không tồn tại")

    result = await db.execute(
        select(LicenseDevice)
        .where(LicenseDevice.license_id == license_id)
        .order_by(LicenseDevice.last_seen.desc())
    )
    return result.scalars().all()


@router.delete("/devices/{device_id}")
async def remove_device(device_id: int, db: AsyncSession = Depends(get_db)):
    device = await db.get(LicenseDevice, device_id)
    if not device:
        raise NotFoundError("Device không tồn tại")

    license = await db.get(License, device.license_id)
    device.is_active = False

    if license:
        result = await db.execute(
            select(func.count(LicenseDevice.id)).where(
                LicenseDevice.license_id == license.id,
                LicenseDevice.is_active == True,
            )
        )
        license.current_devices = result.scalar() or 0

    log = LicenseLog(
        license_id=device.license_id,
        action=LicenseLogAction.DEVICE_REMOVED,
        machine_id=device.machine_id,
        detail=f"Admin removed device: {device.device_name or device.machine_id}",
    )
    db.add(log)
    await db.commit()
    return {"success": True}


# ==================== LICENSE LOGS ====================

@router.get("/licenses/{license_id}/logs", response_model=list[LicenseLogResponse])
async def list_logs(
    license_id: int,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LicenseLog)
        .where(LicenseLog.license_id == license_id)
        .order_by(LicenseLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ==================== STATS ====================

@router.get("/stats")
async def license_stats(
    product_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    base_filter = []
    if product_id:
        base_filter.append(License.product_id == product_id)

    # Total licenses
    total = (await db.execute(
        select(func.count(License.id)).where(*base_filter)
    )).scalar() or 0

    # By status
    status_counts = {}
    for status in LicenseStatus:
        count = (await db.execute(
            select(func.count(License.id)).where(
                License.status == status, *base_filter
            )
        )).scalar() or 0
        status_counts[status.value] = count

    # Active devices
    device_query = select(func.count(LicenseDevice.id)).where(LicenseDevice.is_active == True)
    if product_id:
        device_query = device_query.join(License).where(License.product_id == product_id)
    active_devices = (await db.execute(device_query)).scalar() or 0

    # Products count
    products_count = (await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )).scalar() or 0

    return {
        "total_licenses": total,
        "by_status": status_counts,
        "active_devices": active_devices,
        "products_count": products_count,
    }


# ==================== EXPORT ====================

@router.get("/licenses/export/csv")
async def export_licenses_csv(
    product_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(License)
    if product_id:
        query = query.where(License.product_id == product_id)
    if status:
        query = query.where(License.status == status)
    query = query.order_by(License.id)

    result = await db.execute(query)
    licenses = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "License Key", "Product", "Plan", "Status",
        "Customer Name", "Customer Email",
        "Max Devices", "Current Devices",
        "Activated At", "Expires At", "Created At", "Note",
    ])

    for lic in licenses:
        product = await db.get(Product, lic.product_id)
        plan = await db.get(LicensePlan, lic.plan_id) if lic.plan_id else None
        writer.writerow([
            lic.license_key,
            product.name if product else "",
            plan.name if plan else "",
            lic.status.value,
            lic.customer_name or "",
            lic.customer_email or "",
            lic.max_devices,
            lic.current_devices,
            lic.activated_at.isoformat() if lic.activated_at else "",
            lic.expires_at.isoformat() if lic.expires_at else "",
            lic.created_at.isoformat(),
            lic.note or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=licenses.csv"},
    )
