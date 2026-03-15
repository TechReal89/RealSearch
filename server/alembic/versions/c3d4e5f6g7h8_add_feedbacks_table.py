"""Add feedbacks table

Revision ID: c3d4e5f6g7h8
Revises: b7f8a9c0d1e2
Create Date: 2026-03-15 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6g7h8"
down_revision = "b7f8a9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feedbacks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "type",
            sa.Enum("bug_report", "feature_request", "general", name="feedback_type"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "reviewing", "approved", "rejected", name="feedback_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("screenshot_url", sa.String(500), nullable=True),
        sa.Column("severity", sa.String(20), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("credit_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_feedbacks_user_id", "feedbacks", ["user_id"])
    op.create_index("idx_feedbacks_status", "feedbacks", ["status"])
    op.create_index("idx_feedbacks_created_at", "feedbacks", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_feedbacks_created_at")
    op.drop_index("idx_feedbacks_status")
    op.drop_index("idx_feedbacks_user_id")
    op.drop_table("feedbacks")
    op.execute("DROP TYPE IF EXISTS feedback_type")
    op.execute("DROP TYPE IF EXISTS feedback_status")
