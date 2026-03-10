"""Admin analytics endpoints - task stats, credit flow, revenue."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, cast, Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.credit import CreditTransaction, CreditType
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentChannel
from app.models.task import Task, TaskStatus
from app.models.user import User

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/tasks")
async def task_analytics(
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Task statistics: completion rates, time distribution, per job type."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # Tasks per day (completed vs failed)
    daily_tasks = await db.execute(
        select(
            cast(Task.completed_at, Date).label("date"),
            Task.status,
            func.count().label("count"),
        )
        .where(
            Task.completed_at.isnot(None),
            Task.completed_at >= since,
        )
        .group_by("date", Task.status)
        .order_by("date")
    )
    daily_data = {}
    for row in daily_tasks:
        d = str(row.date)
        if d not in daily_data:
            daily_data[d] = {"date": d, "completed": 0, "failed": 0}
        if row.status == TaskStatus.COMPLETED:
            daily_data[d]["completed"] = row.count
        elif row.status == TaskStatus.FAILED:
            daily_data[d]["failed"] = row.count

    # Stats per job type
    job_type_stats = await db.execute(
        select(
            Job.job_type,
            func.count(Task.id).label("total"),
            func.count(case((Task.status == TaskStatus.COMPLETED, 1))).label("completed"),
            func.avg(Task.time_spent).label("avg_time"),
        )
        .join(Job, Task.job_id == Job.id)
        .where(Task.created_at >= since)
        .group_by(Job.job_type)
    )
    by_type = []
    for row in job_type_stats:
        total = row.total or 1
        by_type.append({
            "job_type": row.job_type.value if hasattr(row.job_type, 'value') else str(row.job_type),
            "total": row.total,
            "completed": row.completed,
            "success_rate": round(row.completed / total * 100, 1),
            "avg_time_seconds": round(float(row.avg_time or 0), 1),
        })

    # Overall totals
    totals = await db.execute(
        select(
            func.count().label("total"),
            func.count(case((Task.status == TaskStatus.COMPLETED, 1))).label("completed"),
            func.count(case((Task.status == TaskStatus.FAILED, 1))).label("failed"),
            func.avg(Task.time_spent).label("avg_time"),
        )
        .where(Task.created_at >= since)
    )
    t = totals.one()

    return {
        "period_days": days,
        "totals": {
            "total": t.total,
            "completed": t.completed,
            "failed": t.failed,
            "success_rate": round(t.completed / max(t.total, 1) * 100, 1),
            "avg_time_seconds": round(float(t.avg_time or 0), 1),
        },
        "daily": list(daily_data.values()),
        "by_job_type": by_type,
    }


@router.get("/credits")
async def credit_analytics(
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Credit flow: earned vs spent per day, by type, top earners."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # Credits per day
    daily_credits = await db.execute(
        select(
            cast(CreditTransaction.created_at, Date).label("date"),
            func.sum(case((CreditTransaction.amount > 0, CreditTransaction.amount), else_=0)).label("earned"),
            func.sum(case((CreditTransaction.amount < 0, func.abs(CreditTransaction.amount)), else_=0)).label("spent"),
        )
        .where(CreditTransaction.created_at >= since)
        .group_by("date")
        .order_by("date")
    )
    daily = [
        {"date": str(row.date), "earned": int(row.earned or 0), "spent": int(row.spent or 0)}
        for row in daily_credits
    ]

    # By credit type
    by_type = await db.execute(
        select(
            CreditTransaction.type,
            func.sum(CreditTransaction.amount).label("total"),
            func.count().label("count"),
        )
        .where(CreditTransaction.created_at >= since)
        .group_by(CreditTransaction.type)
    )
    type_breakdown = [
        {
            "type": row.type.value if hasattr(row.type, 'value') else str(row.type),
            "total": int(row.total or 0),
            "count": row.count,
        }
        for row in by_type
    ]

    # Top earners
    top_earners = await db.execute(
        select(
            User.id,
            User.username,
            User.tier,
            func.sum(CreditTransaction.amount).label("total_earned"),
        )
        .join(User, CreditTransaction.user_id == User.id)
        .where(
            CreditTransaction.created_at >= since,
            CreditTransaction.amount > 0,
        )
        .group_by(User.id, User.username, User.tier)
        .order_by(func.sum(CreditTransaction.amount).desc())
        .limit(10)
    )
    top = [
        {
            "user_id": row.id,
            "username": row.username,
            "tier": row.tier.value if hasattr(row.tier, 'value') else str(row.tier),
            "total_earned": int(row.total_earned or 0),
        }
        for row in top_earners
    ]

    return {
        "period_days": days,
        "daily": daily,
        "by_type": type_breakdown,
        "top_earners": top,
    }


@router.get("/revenue")
async def revenue_analytics(
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Revenue: payments per day, by channel, by purpose."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # Revenue per day
    daily_rev = await db.execute(
        select(
            cast(Payment.completed_at, Date).label("date"),
            func.sum(Payment.net_amount).label("revenue"),
            func.count().label("count"),
        )
        .where(
            Payment.status == "completed",
            Payment.completed_at.isnot(None),
            Payment.completed_at >= since,
        )
        .group_by("date")
        .order_by("date")
    )
    daily = [
        {"date": str(row.date), "revenue": float(row.revenue or 0), "count": row.count}
        for row in daily_rev
    ]

    # By channel
    by_channel = await db.execute(
        select(
            PaymentChannel.display_name,
            func.sum(Payment.net_amount).label("revenue"),
            func.count().label("count"),
        )
        .join(PaymentChannel, Payment.channel_id == PaymentChannel.id)
        .where(
            Payment.status == "completed",
            Payment.completed_at >= since,
        )
        .group_by(PaymentChannel.display_name)
    )
    channels = [
        {"channel": row.display_name, "revenue": float(row.revenue or 0), "count": row.count}
        for row in by_channel
    ]

    # By purpose
    by_purpose = await db.execute(
        select(
            Payment.purpose,
            func.sum(Payment.net_amount).label("revenue"),
            func.count().label("count"),
        )
        .where(
            Payment.status == "completed",
            Payment.completed_at >= since,
        )
        .group_by(Payment.purpose)
    )
    purposes = [
        {"purpose": row.purpose, "revenue": float(row.revenue or 0), "count": row.count}
        for row in by_purpose
    ]

    # Total
    total_result = await db.execute(
        select(
            func.sum(Payment.net_amount).label("total"),
            func.count().label("count"),
        )
        .where(
            Payment.status == "completed",
            Payment.completed_at >= since,
        )
    )
    total = total_result.one()

    return {
        "period_days": days,
        "total_revenue": float(total.total or 0),
        "total_transactions": total.count,
        "daily": daily,
        "by_channel": channels,
        "by_purpose": purposes,
    }
