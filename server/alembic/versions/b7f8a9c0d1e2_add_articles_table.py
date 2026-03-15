"""Add articles table

Revision ID: b7f8a9c0d1e2
Revises: a1b2c3d4e5f6
Create Date: 2026-03-15 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b7f8a9c0d1e2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("slug", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("excerpt", sa.String(1000), nullable=True),
        sa.Column("thumbnail", sa.String(1000), nullable=True),
        sa.Column("category", sa.String(50), server_default="guide", nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("meta_title", sa.String(500), nullable=True),
        sa.Column("meta_description", sa.String(1000), nullable=True),
        sa.Column("is_featured", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("idx_articles_category", "articles", ["category"])
    op.create_index("idx_articles_status", "articles", ["status"])
    op.create_index("idx_articles_slug", "articles", ["slug"])

def downgrade() -> None:
    op.drop_table("articles")
