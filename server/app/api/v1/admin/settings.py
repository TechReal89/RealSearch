from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.setting import SystemSetting
from app.models.user import User
from app.schemas.admin import SystemSettingUpdate

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("")
async def get_all_settings(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()

    grouped = {}
    for s in settings:
        if s.category not in grouped:
            grouped[s.category] = []
        grouped[s.category].append({
            "key": s.key, "value": s.value, "display_name": s.display_name,
            "description": s.description, "value_type": s.value_type,
        })

    return grouped


@router.get("/{category}")
async def get_settings_by_category(
    category: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.category == category)
    )
    settings = result.scalars().all()
    return [
        {
            "key": s.key, "value": s.value, "display_name": s.display_name,
            "description": s.description, "value_type": s.value_type,
        }
        for s in settings
    ]


@router.put("")
async def update_settings(
    data: SystemSettingUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    updated = []
    for key, value in data.settings.items():
        setting = await db.get(SystemSetting, key)
        if not setting:
            raise NotFoundError(f"Setting '{key}' not found")
        setting.value = value
        setting.updated_by = admin.id
        updated.append(key)

    await db.commit()
    return {"detail": f"Updated {len(updated)} settings", "keys": updated}
