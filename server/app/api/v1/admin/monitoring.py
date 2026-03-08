from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.user import User
from app.ws.manager import manager

router = APIRouter(prefix="/admin", tags=["admin-monitoring"])


class BroadcastMessage(BaseModel):
    message: str = Field(min_length=1)
    level: str = Field(default="info", pattern=r"^(info|warning|error)$")


@router.get("/clients")
async def get_online_clients(
    admin: User = Depends(get_admin_user),
):
    clients = manager.get_all_clients()
    return {
        "stats": manager.get_stats(),
        "clients": [
            {
                "session_id": c.session_id,
                "user_id": c.user_id,
                "machine_id": c.machine_id,
                "os_info": c.os_info,
                "browser_mode": c.browser_mode,
                "enabled_job_types": c.enabled_job_types,
                "max_concurrent": c.max_concurrent,
                "active_tasks": list(c.active_tasks),
                "active_task_count": c.active_task_count,
                "is_available": c.is_available,
                "tasks_completed": c.tasks_completed,
                "tasks_failed": c.tasks_failed,
                "credits_earned": c.credits_earned,
                "connected_at": c.connected_at.isoformat(),
                "last_heartbeat": c.last_heartbeat.isoformat(),
                "client_version": c.client_version,
            }
            for c in clients
        ],
    }


@router.post("/broadcast")
async def broadcast_message(
    data: BroadcastMessage,
    admin: User = Depends(get_admin_user),
):
    await manager.broadcast({
        "type": "broadcast",
        "data": {
            "message": data.message,
            "level": data.level,
        },
    })
    return {
        "detail": "Broadcast sent",
        "recipients": manager.online_count,
    }


@router.get("/dashboard/realtime")
async def realtime_dashboard(
    admin: User = Depends(get_admin_user),
):
    stats = manager.get_stats()
    clients = manager.get_all_clients()

    # Job type distribution
    job_type_counts: dict[str, int] = {}
    for c in clients:
        for jt in c.enabled_job_types:
            job_type_counts[jt] = job_type_counts.get(jt, 0) + 1

    return {
        "websocket": stats,
        "job_type_distribution": job_type_counts,
        "capacity_percent": (
            round(stats["busy"] / stats["total_online"] * 100, 1)
            if stats["total_online"] > 0
            else 0
        ),
    }
