"""initial tourflow schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-29 08:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('role', sa.String(length=50), server_default='traveler'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Traveler Profiles Table
    op.create_table(
        'traveler_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('travel_style', sa.String(length=100), server_default='balanced'),
        sa.Column('dietary_preferences', sa.JSON(), nullable=True),
        sa.Column('fitness_level', sa.String(length=50), server_default='moderate'),
        sa.Column('preferred_currency', sa.String(length=10), server_default='INR'),
        sa.Column('language', sa.String(length=50), server_default='English'),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Destinations Table
    op.create_table(
        'destinations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, index=True),
        sa.Column('slug', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('country', sa.String(length=100), server_default='India', nullable=False),
        sa.Column('state_region', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('hero_image_url', sa.String(length=1024), nullable=True),
        sa.Column('best_time_to_visit', sa.String(length=255), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), server_default='0'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Vendors Table
    op.create_table(
        'vendors',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('vendor_type', sa.String(length=50), nullable=False),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('rating', sa.Float(), server_default='4.5'),
        sa.Column('is_verified', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Hotels Table
    op.create_table(
        'hotels',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('destination_id', sa.String(length=36), sa.ForeignKey('destinations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vendor_id', sa.String(length=36), sa.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False, index=True),
        sa.Column('category', sa.String(length=50), server_default='boutique'),
        sa.Column('price_per_night', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR'),
        sa.Column('rating', sa.Float(), server_default='4.5'),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('amenities', sa.JSON(), nullable=True),
        sa.Column('images', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Activities Table
    op.create_table(
        'activities',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('destination_id', sa.String(length=36), sa.ForeignKey('destinations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vendor_id', sa.String(length=36), sa.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False, index=True),
        sa.Column('category', sa.String(length=50), server_default='adventure'),
        sa.Column('duration_hours', sa.Float(), server_default='2.0'),
        sa.Column('price_per_person', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR'),
        sa.Column('difficulty_level', sa.String(length=50), server_default='moderate'),
        sa.Column('rating', sa.Float(), server_default='4.7'),
        sa.Column('images', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meeting_point', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Transport Options Table
    op.create_table(
        'transport_options',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('destination_id', sa.String(length=36), sa.ForeignKey('destinations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vendor_id', sa.String(length=36), sa.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('route_from', sa.String(length=255), nullable=False),
        sa.Column('route_to', sa.String(length=255), nullable=False),
        sa.Column('duration_hours', sa.Float(), server_default='4.0'),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR'),
        sa.Column('capacity', sa.Integer(), server_default='4'),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Trips Table (Central Entity)
    op.create_table(
        'trips',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('destination_id', sa.String(length=36), sa.ForeignKey('destinations.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='planning'),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('duration_days', sa.Integer(), server_default='5'),
        sa.Column('total_budget', sa.Float(), server_default='50000.0'),
        sa.Column('currency', sa.String(length=10), server_default='INR'),
        sa.Column('traveler_count', sa.Integer(), server_default='2'),
        sa.Column('pace', sa.String(length=50), server_default='balanced'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Trip Preferences Table
    op.create_table(
        'trip_preferences',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('budget_tier', sa.String(length=50), server_default='moderate'),
        sa.Column('interests', sa.JSON(), nullable=True),
        sa.Column('travel_companions', sa.String(length=50), server_default='couple'),
        sa.Column('accommodation_types', sa.JSON(), nullable=True),
        sa.Column('transport_preferences', sa.JSON(), nullable=True),
        sa.Column('dietary_requirements', sa.JSON(), nullable=True),
        sa.Column('special_requests', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Itinerary Items Table
    op.create_table(
        'itinerary_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('day_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_time', sa.String(length=20), nullable=True),
        sa.Column('end_time', sa.String(length=20), nullable=True),
        sa.Column('cost', sa.Float(), server_default='0.0'),
        sa.Column('status', sa.String(length=50), server_default='proposed'),
        sa.Column('hotel_id', sa.String(length=36), sa.ForeignKey('hotels.id', ondelete='SET NULL'), nullable=True),
        sa.Column('activity_id', sa.String(length=36), sa.ForeignKey('activities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('transport_id', sa.String(length=36), sa.ForeignKey('transport_options.id', ondelete='SET NULL'), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=True)
    )

    # Bookings Table
    op.create_table(
        'bookings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vendor_id', sa.String(length=36), sa.ForeignKey('vendors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('booking_reference', sa.String(length=100), unique=True, nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_id', sa.String(length=36), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR'),
        sa.Column('status', sa.String(length=50), server_default='confirmed'),
        sa.Column('payment_status', sa.String(length=50), server_default='paid'),
        sa.Column('booking_date', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Notifications Table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), server_default='info'),
        sa.Column('is_read', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Alerts Table
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), server_default='warning'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Change History Table
    op.create_table(
        'change_history',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('changed_by', sa.String(length=50), server_default='ai'),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('field_changed', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    # Reviews Table
    op.create_table(
        'reviews',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('destination_rating', sa.Float(), nullable=True),
        sa.Column('ai_planning_rating', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

def downgrade() -> None:
    op.drop_table('reviews')
    op.drop_table('change_history')
    op.drop_table('alerts')
    op.drop_table('notifications')
    op.drop_table('bookings')
    op.drop_table('itinerary_items')
    op.drop_table('trip_preferences')
    op.drop_table('trips')
    op.drop_table('transport_options')
    op.drop_table('activities')
    op.drop_table('hotels')
    op.drop_table('vendors')
    op.drop_table('destinations')
    op.drop_table('traveler_profiles')
    op.drop_table('users')
