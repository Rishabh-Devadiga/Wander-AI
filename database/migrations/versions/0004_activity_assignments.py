"""activity dispatch tables (assignments + activity capacity)

Revision ID: 0004_activity_assignments
Revises: 0003_ops_assignments
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_activity_assignments"
down_revision: Union[str, None] = "0003_ops_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("capacity", sa.Integer(), nullable=True))

    op.create_table(
        "activity_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=255), nullable=False),
        sa.Column("activity_id", sa.String(length=36), nullable=False),
        sa.Column("vendor_id", sa.String(length=36), nullable=True),
        sa.Column("scheduled_date", sa.String(length=10), nullable=True),
        sa.Column("start_time", sa.String(length=5), nullable=True),
        sa.Column("end_time", sa.String(length=5), nullable=True),
        sa.Column("participants", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("issue_reason", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_assignments_trip_id", "activity_assignments", ["trip_id"])
    op.create_index("ix_activity_assignments_status", "activity_assignments", ["status"])
    op.create_index("ix_activity_assignments_activity_id", "activity_assignments", ["activity_id"])
    op.create_index("ix_activity_assignments_vendor_id", "activity_assignments", ["vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_activity_assignments_vendor_id", table_name="activity_assignments")
    op.drop_index("ix_activity_assignments_activity_id", table_name="activity_assignments")
    op.drop_index("ix_activity_assignments_status", table_name="activity_assignments")
    op.drop_index("ix_activity_assignments_trip_id", table_name="activity_assignments")
    op.drop_table("activity_assignments")
    op.drop_column("activities", "capacity")
