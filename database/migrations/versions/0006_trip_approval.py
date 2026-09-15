"""trip approval pipeline table

Revision ID: 0006_trip_approval
Revises: 0005_trip_confirmation
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_trip_approval"
down_revision: Union[str, None] = "0005_trip_confirmation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_approvals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=255), nullable=False),
        sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approved_by", sa.String(length=50), nullable=True),
        sa.Column("assignment_started", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("assignment_started_at", sa.DateTime(), nullable=True),
        sa.Column("finalized", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        sa.Column("finalized_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trip_approvals_trip_id", "trip_approvals", ["trip_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_trip_approvals_trip_id", table_name="trip_approvals")
    op.drop_table("trip_approvals")
