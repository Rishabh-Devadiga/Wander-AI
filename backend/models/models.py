import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from backend.database.connection import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), default="traveler")  # traveler, operator, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    traveler_profile = relationship("TravelerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user")


class TravelerProfile(Base):
    __tablename__ = "traveler_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    travel_style = Column(String(100), default="balanced")  # luxury, budget, adventure, cultural, relaxed
    dietary_preferences = Column(JSON, default=list)  # ["vegetarian", "gluten_free", etc.]
    fitness_level = Column(String(50), default="moderate")  # low, moderate, high
    preferred_currency = Column(String(10), default="INR")
    language = Column(String(50), default="English")
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="traveler_profile")


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    country = Column(String(100), default="India", nullable=False)
    state_region = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    hero_image_url = Column(String(1024), nullable=True)
    best_time_to_visit = Column(String(255), nullable=True)
    tags = Column(JSON, default=list)  # ["mountains", "snow", "culture", "beaches"]
    is_featured = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    hotels = relationship("Hotel", back_populates="destination", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="destination", cascade="all, delete-orphan")
    transport_options = relationship("TransportOption", back_populates="destination", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="destination")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    vendor_type = Column(String(50), nullable=False)  # hotel, activity, transport, guide
    contact_email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    rating = Column(Float, default=4.5)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    hotels = relationship("Hotel", back_populates="vendor")
    activities = relationship("Activity", back_populates="vendor")
    transport_options = relationship("TransportOption", back_populates="vendor")
    bookings = relationship("Booking", back_populates="vendor")


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    destination_id = Column(String(36), ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), default="boutique")  # luxury, boutique, mid-range, budget, homestay
    price_per_night = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    rating = Column(Float, default=4.5)
    address = Column(String(500), nullable=True)
    amenities = Column(JSON, default=list)  # ["Free WiFi", "Mountain View", "Spa"]
    images = Column(JSON, default=list)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    destination = relationship("Destination", back_populates="hotels")
    vendor = relationship("Vendor", back_populates="hotels")
    itinerary_items = relationship("ItineraryItem", back_populates="hotel")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    destination_id = Column(String(36), ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(50), default="adventure")  # adventure, culture, nature, culinary, relaxation
    duration_hours = Column(Float, default=2.0)
    price_per_person = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    difficulty_level = Column(String(50), default="moderate")  # easy, moderate, challenging
    rating = Column(Float, default=4.7)
    images = Column(JSON, default=list)
    description = Column(Text, nullable=True)
    meeting_point = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    destination = relationship("Destination", back_populates="activities")
    vendor = relationship("Vendor", back_populates="activities")
    itinerary_items = relationship("ItineraryItem", back_populates="activity")


class TransportOption(Base):
    __tablename__ = "transport_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    destination_id = Column(String(36), ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)  # private_cab, volvo_bus, flight, train, self_drive, boat
    name = Column(String(255), nullable=False)
    route_from = Column(String(255), nullable=False)
    route_to = Column(String(255), nullable=False)
    duration_hours = Column(Float, default=4.0)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    capacity = Column(Integer, default=4)
    features = Column(JSON, default=list)  # ["AC", "Luggage Carrier", "Heater"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    destination = relationship("Destination", back_populates="transport_options")
    vendor = relationship("Vendor", back_populates="transport_options")
    itinerary_items = relationship("ItineraryItem", back_populates="transport")


class Trip(Base):
    """
    The Central Entity in TourFlow AI.
    Contains: traveler, preferences, itinerary, bookings, alerts, notifications, change history, reviews.
    """
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    destination_id = Column(String(36), ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="planning")  # draft, planning, confirmed, ongoing, completed, cancelled
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    duration_days = Column(Integer, default=5)
    total_budget = Column(Float, default=50000.0)
    currency = Column(String(10), default="INR")
    traveler_count = Column(Integer, default=2)
    pace = Column(String(50), default="balanced")  # relaxed, balanced, packed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Core Relationships
    user = relationship("User", back_populates="trips")
    destination = relationship("Destination", back_populates="trips")
    preferences = relationship("TripPreference", back_populates="trip", uselist=False, cascade="all, delete-orphan")
    itinerary = relationship("ItineraryItem", back_populates="trip", order_by="ItineraryItem.day_number, ItineraryItem.order_index", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trip", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="trip", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="trip", cascade="all, delete-orphan")
    change_history = relationship("ChangeHistory", back_populates="trip", order_by="ChangeHistory.timestamp.desc()", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="trip", cascade="all, delete-orphan")


class TripPreference(Base):
    __tablename__ = "trip_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, unique=True)
    budget_tier = Column(String(50), default="moderate")  # budget, moderate, luxury, ultra_luxury
    interests = Column(JSON, default=list)  # ["nature", "snow", "cafes", "trekking"]
    travel_companions = Column(String(50), default="couple")  # solo, couple, family, friends
    accommodation_types = Column(JSON, default=list)  # ["boutique", "mountain_view_resort"]
    transport_preferences = Column(JSON, default=list)  # ["private_suv", "volvo"]
    dietary_requirements = Column(JSON, default=list)  # ["vegetarian", "no_dairy"]
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = relationship("Trip", back_populates="preferences")


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, default=1)
    order_index = Column(Integer, nullable=False, default=0)
    item_type = Column(String(50), nullable=False)  # hotel, activity, transport, meal, note, leisure
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(String(20), nullable=True)  # e.g., "09:00 AM"
    end_time = Column(String(20), nullable=True)    # e.g., "12:30 PM"
    cost = Column(Float, default=0.0)
    status = Column(String(50), default="proposed")  # proposed, confirmed, completed, skipped
    hotel_id = Column(String(36), ForeignKey("hotels.id", ondelete="SET NULL"), nullable=True)
    activity_id = Column(String(36), ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    transport_id = Column(String(36), ForeignKey("transport_options.id", ondelete="SET NULL"), nullable=True)
    location = Column(String(255), nullable=True)
    meta_data = Column(JSON, default=dict)

    trip = relationship("Trip", back_populates="itinerary")
    hotel = relationship("Hotel", back_populates="itinerary_items")
    activity = relationship("Activity", back_populates="itinerary_items")
    transport = relationship("TransportOption", back_populates="itinerary_items")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    booking_reference = Column(String(100), unique=True, default=lambda: f"TF-{uuid.uuid4().hex[:8].upper()}")
    item_type = Column(String(50), nullable=False)  # hotel, activity, transport
    item_id = Column(String(36), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="confirmed")  # pending, confirmed, cancelled, refunded
    payment_status = Column(String(50), default="paid")  # pending, paid, refunded
    booking_date = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="bookings")
    vendor = relationship("Vendor", back_populates="bookings")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, success, warning, update
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="notifications")
    user = relationship("User", back_populates="notifications")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # weather, flight_delay, road_closure, safety, price_drop
    severity = Column(String(50), default="warning")  # info, warning, critical
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="alerts")


class ChangeHistory(Base):
    __tablename__ = "change_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by = Column(String(50), default="ai")  # user, ai, operator
    action = Column(String(100), nullable=False)  # item_added, preference_updated, date_changed, replanned
    field_changed = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="change_history")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Float, nullable=False)
    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=True)
    destination_rating = Column(Float, nullable=True)
    ai_planning_rating = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
