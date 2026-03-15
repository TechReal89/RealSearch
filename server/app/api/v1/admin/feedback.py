"""Admin feedback management API."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.credit import CreditTransaction, CreditType
from app.models.feedback import Feedback, FeedbackStatus, FeedbackType
from app.models.user import User

router = APIRouter(prefix="/admin/feedback", tags=["Admin Feedback"])


class FeedbackReview(BaseModel):
    status: str = Field(pattern=r"^(reviewing|approved|rejected)$")
    admin_note: str | None = Field(None, max_length=2000)
    credit_reward: int = Field(0, ge=0, le=10000)


@router.get("")
async def list_feedbacks(
    status: str | None = None,
    feedback_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all feedbacks with filters."""
    base = select(Feedback, User.username).join(User, User.id == Feedback.user_id)
    count_base = select(func.count(Feedback.id))

    if status:
        try:
            status_enum = FeedbackStatus(status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}")
        base = base.where(Feedback.status == status_enum)
        count_base = count_base.where(Feedback.status == status_enum)
    if feedback_type:
        try:
            type_enum = FeedbackType(feedback_type)
        except ValueError:
            raise HTTPException(400, f"Invalid type: {feedback_type}")
        base = base.where(Feedback.type == type_enum)
        count_base = count_base.where(Feedback.type == type_enum)

    total = (await db.execute(count_base)).scalar() or 0

    query = base.order_by(Feedback.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    return {
        "feedbacks": [
            {
                "id": f.id,
                "user_id": f.user_id,
                "username": username,
                "type": f.type.value,
                "status": f.status.value,
                "title": f.title,
                "description": f.description,
                "screenshot_url": f.screenshot_url,
                "severity": f.severity,
                "admin_note": f.admin_note,
                "credit_reward": f.credit_reward,
                "created_at": f.created_at.isoformat(),
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
            }
            for f, username in rows
        ],
        "total": total,
    }


@router.get("/stats")
async def feedback_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Feedback statistics."""
    total = (await db.execute(select(func.count(Feedback.id)))).scalar() or 0
    pending = (await db.execute(
        select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.PENDING)
    )).scalar() or 0
    approved = (await db.execute(
        select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.APPROVED)
    )).scalar() or 0
    rejected = (await db.execute(
        select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.REJECTED)
    )).scalar() or 0
    total_rewards = (await db.execute(
        select(func.sum(Feedback.credit_reward)).where(Feedback.status == FeedbackStatus.APPROVED)
    )).scalar() or 0

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_rewards": int(total_rewards),
    }


@router.get("/{feedback_id}")
async def get_feedback(
    feedback_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get feedback detail."""
    result = await db.execute(
        select(Feedback, User.username)
        .join(User, User.id == Feedback.user_id)
        .where(Feedback.id == feedback_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Feedback not found")

    f, username = row
    return {
        "id": f.id,
        "user_id": f.user_id,
        "username": username,
        "type": f.type.value,
        "status": f.status.value,
        "title": f.title,
        "description": f.description,
        "screenshot_url": f.screenshot_url,
        "severity": f.severity,
        "admin_note": f.admin_note,
        "reviewed_by": f.reviewed_by,
        "credit_reward": f.credit_reward,
        "created_at": f.created_at.isoformat(),
        "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
    }


@router.put("/{feedback_id}")
async def review_feedback(
    feedback_id: int,
    data: FeedbackReview,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Review feedback - approve/reject and optionally award credits."""
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(404, "Feedback not found")

    feedback.status = FeedbackStatus(data.status)
    feedback.admin_note = data.admin_note
    feedback.reviewed_by = admin.id
    feedback.reviewed_at = datetime.now(timezone.utc)

    # Award credits if approved with reward
    if data.status == "approved" and data.credit_reward > 0:
        feedback.credit_reward = data.credit_reward

        # Update user balance (with row lock to prevent race condition)
        user_result = await db.execute(
            select(User).where(User.id == feedback.user_id).with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if user:
            user.credit_balance += data.credit_reward
            user.total_earned += data.credit_reward

            # Create credit transaction
            tx = CreditTransaction(
                user_id=user.id,
                type=CreditType.BONUS,
                amount=data.credit_reward,
                balance_after=user.credit_balance,
                reference_type="feedback",
                reference_id=feedback.id,
                description=f"Thưởng góp ý: {feedback.title[:50]}",
            )
            db.add(tx)

    await db.commit()

    return {"message": "Đã cập nhật góp ý", "feedback_id": feedback.id}
