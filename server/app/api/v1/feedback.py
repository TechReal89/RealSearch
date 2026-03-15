"""User feedback API - submit, list, hall of fame."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.feedback import Feedback, FeedbackStatus, FeedbackType
from app.models.user import User

router = APIRouter(prefix="/feedback", tags=["Feedback"])


# --- Schemas ---

class FeedbackCreate(BaseModel):
    type: FeedbackType
    title: str = Field(min_length=5, max_length=255)
    description: str = Field(min_length=10, max_length=5000)
    screenshot_url: str | None = Field(None, max_length=500)
    severity: str | None = Field(None, pattern=r"^(low|medium|high|critical)$")


class FeedbackResponse(BaseModel):
    id: int
    type: str
    status: str
    title: str
    description: str
    screenshot_url: str | None
    severity: str | None
    admin_note: str | None
    credit_reward: int
    created_at: str
    reviewed_at: str | None

    model_config = {"from_attributes": True}


# --- Endpoints ---

@router.post("")
async def submit_feedback(
    data: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit feedback or bug report."""
    feedback = Feedback(
        user_id=user.id,
        type=data.type,
        title=data.title,
        description=data.description,
        screenshot_url=data.screenshot_url,
        severity=data.severity,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    return {
        "message": "Gửi góp ý thành công! Cảm ơn bạn đã đóng góp.",
        "feedback_id": feedback.id,
    }


@router.get("")
async def list_my_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's feedback history."""
    base = select(Feedback).where(Feedback.user_id == user.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    query = base.order_by(Feedback.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    feedbacks = result.scalars().all()

    return {
        "feedbacks": [
            {
                "id": f.id,
                "type": f.type.value,
                "status": f.status.value,
                "title": f.title,
                "description": f.description[:200],
                "severity": f.severity,
                "credit_reward": f.credit_reward,
                "admin_note": f.admin_note,
                "created_at": f.created_at.isoformat(),
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
            }
            for f in feedbacks
        ],
        "total": total,
    }


@router.get("/hall-of-fame")
async def hall_of_fame(
    db: AsyncSession = Depends(get_db),
):
    """Public hall of fame - top contributors with approved feedback."""
    # Top users by total rewards
    query = (
        select(
            User.id,
            User.username,
            User.full_name,
            User.tier,
            func.count(Feedback.id).label("feedback_count"),
            func.sum(Feedback.credit_reward).label("total_reward"),
        )
        .join(Feedback, Feedback.user_id == User.id)
        .where(Feedback.status == FeedbackStatus.APPROVED)
        .where(Feedback.credit_reward > 0)
        .group_by(User.id, User.username, User.full_name, User.tier)
        .order_by(func.sum(Feedback.credit_reward).desc())
        .limit(20)
    )
    result = await db.execute(query)
    top_users = result.all()

    # Recent approved feedbacks
    recent_query = (
        select(Feedback, User.username)
        .join(User, User.id == Feedback.user_id)
        .where(Feedback.status == FeedbackStatus.APPROVED)
        .where(Feedback.credit_reward > 0)
        .order_by(Feedback.reviewed_at.desc())
        .limit(10)
    )
    recent_result = await db.execute(recent_query)
    recent = recent_result.all()

    return {
        "top_contributors": [
            {
                "user_id": r.id,
                "username": r.username,
                "full_name": r.full_name,
                "tier": r.tier.value if hasattr(r.tier, 'value') else r.tier,
                "feedback_count": r.feedback_count,
                "total_reward": int(r.total_reward or 0),
            }
            for r in top_users
        ],
        "recent_approved": [
            {
                "id": f.id,
                "title": f.title,
                "type": f.type.value,
                "credit_reward": f.credit_reward,
                "username": username,
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
            }
            for f, username in recent
        ],
    }
