from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.job import Job, JobStatus
from app.models.payment import Payment
from app.models.session import ClientSession
from app.models.user import User
from app.schemas.admin import DashboardStats
from app.ws.manager import manager

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("", response_model=DashboardStats)
async def get_dashboard(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    active_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )).scalar() or 0

    total_jobs = (await db.execute(select(func.count()).select_from(Job))).scalar() or 0
    active_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(Job.status == JobStatus.ACTIVE)
    )).scalar() or 0

    total_credits = (await db.execute(
        select(func.coalesce(func.sum(User.credit_balance), 0))
    )).scalar() or 0

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.net_amount), 0))
        .where(Payment.status == "completed")
    )).scalar() or 0

    # Use in-memory WebSocket manager count for real-time accuracy
    online_clients = manager.online_count

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        total_credits_circulating=total_credits,
        total_revenue=float(total_revenue),
        online_clients=online_clients,
    )
