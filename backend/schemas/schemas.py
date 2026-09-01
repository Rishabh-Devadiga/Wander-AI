from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

# User & Profile Schemas
class TravelerProfileBase(BaseModel):
    travel_style: Optional[str] = "balanced"
    dietary_preferences: Optional[List[str]] = []
    fitness_level: Optional[str] = "moderate"
    preferred_currency: Optional[str] = "INR"
    language: Optional[str] = "English"
    bio: Optional[str] = None

class TravelerProfileRead(TravelerProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    created_at: datetime

class UserBase(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "traveler"

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_active: bool
    created_at: datetime
    traveler_profile: Optional[TravelerProfileRead] = None

# Destination Schemas
class DestinationBase(BaseModel):
    name: str
    slug: str
    country: str = "India"
    state_region: str
    description: str
    hero_image_url: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    tags: Optional[List[str]] = []
    is_featured: Optional[bool] = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DestinationCreate(DestinationBase):
    pass

class DestinationRead(DestinationBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime

# Hotel Schemas
class HotelBase(BaseModel):
    destination_id: str
    vendor_id: Optional[str] = None
    name: str
    category: str = "boutique"
    price_per_night: float
    currency: str = "INR"
    rating: float = 4.5
    address: Optional[str] = None
    amenities: Optional[List[str]] = []
    images: Optional[List[str]] = []
    description: Optional[str] = None
    is_active: bool = True

class HotelRead(HotelBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime

# Activity Schemas
class ActivityBase(BaseModel):
    destination_id: str
    vendor_id: Optional[str] = None
    title: str
    category: str = "adventure"
    duration_hours: float = 2.0
    price_per_person: float
    currency: str = "INR"
    difficulty_level: str = "moderate"
    rating: float = 4.7
    images: Optional[List[str]] = []
    description: Optional[str] = None
    meeting_point: Optional[str] = None
    is_active: bool = True

class ActivityRead(ActivityBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime

# Transport Schemas
class TransportBase(BaseModel):
    destination_id: str
    vendor_id: Optional[str] = None
    type: str
    name: str
    route_from: str
    route_to: str
    duration_hours: float = 4.0
    price: float
    currency: str = "INR"
    capacity: int = 4
    features: Optional[List[str]] = []
    is_active: bool = True

class TransportRead(TransportBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime

# Trip Preference Schemas
class TripPreferenceBase(BaseModel):
    budget_tier: Optional[str] = "moderate"
    interests: Optional[List[str]] = []
    travel_companions: Optional[str] = "couple"
    accommodation_types: Optional[List[str]] = []
    transport_preferences: Optional[List[str]] = []
    dietary_requirements: Optional[List[str]] = []
    special_requests: Optional[str] = None

class TripPreferenceUpdate(TripPreferenceBase):
    pass

class TripPreferenceRead(TripPreferenceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    created_at: datetime
    updated_at: datetime

# Itinerary Item Schemas
class ItineraryItemBase(BaseModel):
    day_number: int = 1
    order_index: int = 0
    item_type: str  # hotel, activity, transport, meal, note, leisure
    title: str
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    cost: float = 0.0
    status: str = "proposed"
    hotel_id: Optional[str] = None
    activity_id: Optional[str] = None
    transport_id: Optional[str] = None
    location: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = {}

class ItineraryItemCreate(ItineraryItemBase):
    pass

class ItineraryItemRead(ItineraryItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str

# Booking, Alert, Notification, ChangeHistory, Review Schemas
class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    booking_reference: str
    item_type: str
    item_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_status: str
    booking_date: datetime

class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    is_resolved: bool
    created_at: datetime

class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: Optional[str] = None
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

class ChangeHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    changed_by: str
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    timestamp: datetime

class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    user_id: str
    rating: float
    title: Optional[str] = None
    comment: Optional[str] = None
    destination_rating: Optional[float] = None
    ai_planning_rating: Optional[float] = None
    created_at: datetime

# Trip Schemas (The Central Entity)
class TripBase(BaseModel):
    destination_id: Optional[str] = None
    title: str
    status: Optional[str] = "planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_days: Optional[int] = 5
    total_budget: Optional[float] = 50000.0
    currency: Optional[str] = "INR"
    traveler_count: Optional[int] = 2
    pace: Optional[str] = "balanced"

class TripCreate(TripBase):
    user_id: Optional[str] = None
    preferences: Optional[TripPreferenceBase] = None

class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination_id: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_days: Optional[int] = None
    total_budget: Optional[float] = None
    currency: Optional[str] = None
    traveler_count: Optional[int] = None
    pace: Optional[str] = None

class TripRead(TripBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    destination: Optional[DestinationRead] = None
    preferences: Optional[TripPreferenceRead] = None
    itinerary: List[ItineraryItemRead] = []
    bookings: List[BookingRead] = []
    alerts: List[AlertRead] = []
    notifications: List[NotificationRead] = []
    change_history: List[ChangeHistoryRead] = []
    reviews: List[ReviewRead] = []

# AI Service Schemas
class AIChatRequest(BaseModel):
    message: str
    session_context: Optional[Dict[str, Any]] = None
    destination_id: Optional[str] = None
    trip_id: Optional[str] = None

class AIChatResponse(BaseModel):
    response: str
    suggestions: List[str] = []
    extracted_preferences: Optional[Dict[str, Any]] = None

class AIExtractPreferencesRequest(BaseModel):
    text_prompt: str
    context: Optional[Dict[str, Any]] = None

class AIRecommendRequest(BaseModel):
    preferences: Dict[str, Any]
    destination_id: Optional[str] = None
    top_k: Optional[int] = 5

class AIGenerateItineraryRequest(BaseModel):
    trip_id: Optional[str] = None
    destination_id: Optional[str] = None
    duration_days: Optional[int] = 4
    preferences: Optional[Dict[str, Any]] = None

class AIReplanRequest(BaseModel):
    trip_id: str
    trigger_event: Dict[str, Any]

