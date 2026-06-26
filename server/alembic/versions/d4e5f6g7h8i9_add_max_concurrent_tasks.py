"""add max_concurrent_tasks to membership_tiers

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6g7h8i9"
down_revision = "c3d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "membership_tiers",
        sa.Column("max_concurrent_tasks", sa.Integer(), server_default="1", nullable=False),
    )
    # Set tier-based defaults: Bronze=1, Silver=2, Gold=3, Diamond=5
    op.execute("UPDATE membership_tiers SET max_concurrent_tasks = 1 WHERE name = 'bronze'")
    op.execute("UPDATE membership_tiers SET max_concurrent_tasks = 2 WHERE name = 'silver'")
    op.execute("UPDATE membership_tiers SET max_concurrent_tasks = 3 WHERE name = 'gold'")
    op.execute("UPDATE membership_tiers SET max_concurrent_tasks = 5 WHERE name = 'diamond'")


def downgrade() -> None:
    op.drop_column("membership_tiers", "max_concurrent_tasks")
