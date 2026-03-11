"""add tier credit pricing columns

Revision ID: a1b2c3d4e5f6
Revises: 67c6772b693e
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '502eb2c739a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('membership_tiers', sa.Column('credit_price_monthly', sa.Integer(), server_default='0', nullable=False))
    op.add_column('membership_tiers', sa.Column('credit_price_yearly', sa.Integer(), server_default='0', nullable=False))

    # Set default credit prices (Bronze=0, Silver=500, Gold=1500, Diamond=3000)
    op.execute("UPDATE membership_tiers SET credit_price_monthly = 0, credit_price_yearly = 0 WHERE name = 'bronze'")
    op.execute("UPDATE membership_tiers SET credit_price_monthly = 500, credit_price_yearly = 5000 WHERE name = 'silver'")
    op.execute("UPDATE membership_tiers SET credit_price_monthly = 1500, credit_price_yearly = 15000 WHERE name = 'gold'")
    op.execute("UPDATE membership_tiers SET credit_price_monthly = 3000, credit_price_yearly = 30000 WHERE name = 'diamond'")


def downgrade() -> None:
    op.drop_column('membership_tiers', 'credit_price_yearly')
    op.drop_column('membership_tiers', 'credit_price_monthly')
