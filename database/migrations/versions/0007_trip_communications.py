"""trip communications (internal operator messages)

Revision ID: 0007_trip_communications
Revises: 0006_trip_approval
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_trip_communications"
down_revision: Union[str, None] = "0006_trip_approval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=255), nullable=False),
        sa.Column("operator_name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_urgent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trip_messages_trip_id", "trip_messages", ["trip_id"], unique=False)
    op.create_index("ix_trip_messages_category", "trip_messages", ["category"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_trip_messages_category", table_name="trip_messages")
    op.drop_index("ix_trip_messages_trip_id", table_name="trip_messages")
    op.drop_table("trip_messages")
