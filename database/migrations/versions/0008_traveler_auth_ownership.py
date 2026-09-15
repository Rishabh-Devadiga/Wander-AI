"""traveler auth (password_hash) + trip ownership snapshot

Revision ID: 0008_traveler_auth_ownership
Revises: 0007_trip_communications
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_traveler_auth_ownership"
down_revision: Union[str, None] = "0007_trip_communications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column("trips", sa.Column("canonical_snapshot", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("trips", "canonical_snapshot")
    op.drop_column("users", "password_hash")
