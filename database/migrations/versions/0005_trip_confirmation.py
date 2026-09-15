"""trip confirmation fields

Revision ID: 0005_trip_confirmation
Revises: 0004_activity_assignments
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_trip_confirmation"
down_revision: Union[str, None] = "0004_activity_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trips", sa.Column("confirmed_at", sa.DateTime(), nullable=True))
    op.add_column("trips", sa.Column("confirmed_by", sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column("trips", "confirmed_by")
    op.drop_column("trips", "confirmed_at")
