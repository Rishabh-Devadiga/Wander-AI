"""dynamic destination evidence metadata

Revision ID: 0002_dynamic_evidence
Revises: 0001_initial_schema
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_dynamic_evidence"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("destinations", sa.Column("source_url", sa.String(length=1024), nullable=True))
    op.add_column("destinations", sa.Column("evidence", sa.JSON(), nullable=True))
    op.add_column("destinations", sa.Column("inventory_source", sa.String(length=50), nullable=False, server_default="catalog"))
    op.add_column("destinations", sa.Column("verification_status", sa.String(length=50), nullable=False, server_default="catalog_verified"))
    op.add_column("destinations", sa.Column("discovery_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_destinations_discovery_session_id", "destinations", ["discovery_session_id"])

    for table in ("hotels", "activities", "transport_options"):
        op.add_column(table, sa.Column("latitude", sa.Float(), nullable=True))
        op.add_column(table, sa.Column("longitude", sa.Float(), nullable=True))
        op.add_column(table, sa.Column("source_url", sa.String(length=1024), nullable=True))
        op.add_column(table, sa.Column("evidence", sa.JSON(), nullable=True))
        op.add_column(table, sa.Column("inventory_source", sa.String(length=50), nullable=False, server_default="catalog"))
        op.add_column(table, sa.Column("verification_status", sa.String(length=50), nullable=False, server_default="catalog_verified"))
        op.add_column(table, sa.Column("discovery_session_id", sa.String(length=64), nullable=True))
        op.create_index(f"ix_{table}_discovery_session_id", table, ["discovery_session_id"])

    op.add_column("trips", sa.Column("discovery_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_trips_discovery_session_id", "trips", ["discovery_session_id"])


def downgrade() -> None:
    for table in ("transport_options", "activities", "hotels"):
        op.drop_index(f"ix_{table}_discovery_session_id", table_name=table)
        op.drop_column(table, "discovery_session_id")
        op.drop_column(table, "verification_status")
        op.drop_column(table, "inventory_source")
        op.drop_column(table, "evidence")
        op.drop_column(table, "source_url")
        op.drop_column(table, "longitude")
        op.drop_column(table, "latitude")

    op.drop_index("ix_trips_discovery_session_id", table_name="trips")
    op.drop_column("trips", "discovery_session_id")
    op.drop_index("ix_destinations_discovery_session_id", table_name="destinations")
    op.drop_column("destinations", "discovery_session_id")
    op.drop_column("destinations", "verification_status")
    op.drop_column("destinations", "inventory_source")
    op.drop_column("destinations", "evidence")
    op.drop_column("destinations", "source_url")
