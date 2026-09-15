"""operations dispatch tables (vehicles, drivers, assignments)

Revision ID: 0003_ops_assignments
Revises: 0002_dynamic_evidence
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_ops_assignments"
down_revision: Union[str, None] = "0002_dynamic_evidence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("registration_number", sa.String(length=50), nullable=False),
        sa.Column("vehicle_type", sa.String(length=50), nullable=False, server_default="private_cab"),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vehicles_name", "vehicles", ["name"])
    op.create_index("ix_vehicles_registration_number", "vehicles", ["registration_number"], unique=True)

    op.create_table(
        "drivers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("license_number", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_drivers_name", "drivers", ["name"])

    op.create_table(
        "accommodation_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=255), nullable=False),
        sa.Column("hotel_id", sa.String(length=36), nullable=True),
        sa.Column("rooms", sa.Integer(), nullable=True),
        sa.Column("room_type", sa.String(length=255), nullable=True),
        sa.Column("check_in_date", sa.String(length=10), nullable=True),
        sa.Column("check_out_date", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("issue_reason", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accommodation_assignments_status", "accommodation_assignments", ["status"])
    op.create_index("ix_accommodation_assignments_trip_id", "accommodation_assignments", ["trip_id"], unique=True)
    op.create_index("ix_accommodation_assignments_hotel_id", "accommodation_assignments", ["hotel_id"])

    op.create_table(
        "transport_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=255), nullable=False),
        sa.Column("vehicle_id", sa.String(length=36), nullable=True),
        sa.Column("driver_id", sa.String(length=36), nullable=True),
        sa.Column("origin", sa.String(length=255), nullable=True),
        sa.Column("destination", sa.String(length=255), nullable=True),
        sa.Column("pickup_at", sa.DateTime(), nullable=True),
        sa.Column("dropoff_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("pre_delay_status", sa.String(length=50), nullable=True),
        sa.Column("delay_reason", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transport_assignments_status", "transport_assignments", ["status"])
    op.create_index("ix_transport_assignments_trip_id", "transport_assignments", ["trip_id"], unique=True)
    op.create_index("ix_transport_assignments_vehicle_id", "transport_assignments", ["vehicle_id"])
    op.create_index("ix_transport_assignments_driver_id", "transport_assignments", ["driver_id"])


def downgrade() -> None:
    op.drop_index("ix_transport_assignments_driver_id", table_name="transport_assignments")
    op.drop_index("ix_transport_assignments_vehicle_id", table_name="transport_assignments")
    op.drop_index("ix_transport_assignments_trip_id", table_name="transport_assignments")
    op.drop_index("ix_transport_assignments_status", table_name="transport_assignments")
    op.drop_table("transport_assignments")
    op.drop_index("ix_accommodation_assignments_hotel_id", table_name="accommodation_assignments")
    op.drop_index("ix_accommodation_assignments_trip_id", table_name="accommodation_assignments")
    op.drop_index("ix_accommodation_assignments_status", table_name="accommodation_assignments")
    op.drop_table("accommodation_assignments")
    op.drop_index("ix_drivers_name", table_name="drivers")
    op.drop_table("drivers")
    op.drop_index("ix_vehicles_registration_number", table_name="vehicles")
    op.drop_index("ix_vehicles_name", table_name="vehicles")
    op.drop_table("vehicles")
