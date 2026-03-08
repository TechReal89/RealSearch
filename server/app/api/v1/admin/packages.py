from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.package import CreditPackage
from app.models.user import User
from app.schemas.admin import CreditPackageCreate, CreditPackageUpdate
from app.schemas.credit import CreditPackageResponse

router = APIRouter(prefix="/admin/credit-packages", tags=["admin-packages"])


@router.get("", response_model=list[CreditPackageResponse])
async def list_packages(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CreditPackage).order_by(CreditPackage.sort_order))
    return [CreditPackageResponse.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=CreditPackageResponse, status_code=201)
async def create_package(
    data: CreditPackageCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pkg = CreditPackage(**data.model_dump())
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return CreditPackageResponse.model_validate(pkg)


@router.put("/{package_id}", response_model=CreditPackageResponse)
async def update_package(
    package_id: int,
    data: CreditPackageUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pkg = await db.get(CreditPackage, package_id)
    if not pkg:
        raise NotFoundError("Package not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pkg, key, value)

    await db.commit()
    await db.refresh(pkg)
    return CreditPackageResponse.model_validate(pkg)


@router.delete("/{package_id}")
async def delete_package(
    package_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pkg = await db.get(CreditPackage, package_id)
    if not pkg:
        raise NotFoundError("Package not found")
    pkg.is_active = False
    await db.commit()
    return {"detail": "Package deactivated"}
