from datetime import datetime
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator

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
    source_url: Optional[str] = None
    evidence: Optional[List[Dict[str, Any]]] = []
    inventory_source: Optional[str] = "catalog"
    verification_status: Optional[str] = "catalog_verified"
    discovery_session_id: Optional[str] = None

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None
    evidence: Optional[List[Dict[str, Any]]] = []
    inventory_source: Optional[str] = "catalog"
    verification_status: Optional[str] = "catalog_verified"
    discovery_session_id: Optional[str] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None
    evidence: Optional[List[Dict[str, Any]]] = []
    inventory_source: Optional[str] = "catalog"
    verification_status: Optional[str] = "catalog_verified"
    discovery_session_id: Optional[str] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None
    evidence: Optional[List[Dict[str, Any]]] = []
    inventory_source: Optional[str] = "catalog"
    verification_status: Optional[str] = "catalog_verified"
    discovery_session_id: Optional[str] = None
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
    discovery_session_id: Optional[str] = None

class TripCreate(TripBase):
    user_id: Optional[str] = None
    preferences: Optional[TripPreferenceBase] = None
    destination_name: Optional[str] = None
    destination: Optional[Any] = None
    origin: Optional[str] = None
    travel_type: Optional[str] = None
    formatted_dates: Optional[str] = None

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
    current_trip: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None

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


# Destination research agent schemas.  These deliberately describe research
# context rather than a Trip/TripState, because research is read-only input to
# later planning workflows.
class ResearchContext(BaseModel):
    destination: str = Field(min_length=1, max_length=255)
    origin: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=62)
    traveler_count: Optional[int] = Field(default=None, ge=1, le=100)
    total_budget: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default="INR", min_length=3, max_length=10)
    pace: Optional[str] = Field(default=None, max_length=50)
    travel_style: Optional[str] = Field(default=None, max_length=100)
    preferences: Optional[TripPreferenceBase] = None


class ResearchPlace(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    area_location: Optional[str] = Field(default=None, max_length=255)
    description: str = Field(min_length=1, max_length=1000)
    relevance_to_traveler: Optional[str] = Field(default=None, max_length=500)
    practical_notes: Optional[str] = Field(default=None, max_length=500)


class ResearchResult(BaseModel):
    destination: str = Field(min_length=1, max_length=255)
    destination_summary: str = Field(min_length=1, max_length=2000)
    recommended_areas: List[ResearchPlace] = Field(default_factory=list, max_length=8)
    key_places: List[ResearchPlace] = Field(default_factory=list, max_length=12)
    attractions: List[ResearchPlace] = Field(default_factory=list, max_length=12)
    travel_considerations: List[str] = Field(default_factory=list, max_length=12)
    seasonal_considerations: List[str] = Field(default_factory=list, max_length=12)
    preference_relevant_insights: List[str] = Field(default_factory=list, max_length=12)
    source: str = Field(description="catalog_fallback, gemini, or crewai")


# Accommodation selection is read-only. Hotel facts in the response are always
# rebuilt from the catalog after any AI ranking has been validated.
class AccommodationContext(BaseModel):
    destination: str = Field(min_length=1, max_length=255)
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=62)
    traveler_count: Optional[int] = Field(default=None, ge=1, le=100)
    total_budget: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default="INR", min_length=3, max_length=10)
    travel_style: Optional[str] = Field(default=None, max_length=100)
    max_price_per_night: Optional[float] = Field(default=None, ge=0)
    required_amenities: List[str] = Field(default_factory=list, max_length=12)
    preferences: Optional[TripPreferenceBase] = None


class AccommodationSelection(BaseModel):
    hotel_id: str = Field(min_length=1, max_length=255)
    recommendation_reason: str = Field(min_length=1, max_length=800)
    matched_preferences: List[str] = Field(default_factory=list, max_length=12)


class AccommodationCrewOutput(BaseModel):
    selections: List[AccommodationSelection] = Field(min_length=1, max_length=5)


class AccommodationOption(BaseModel):
    hotel_id: str
    name: str
    category: str
    price_per_night: float
    currency: str
    rating: float
    address: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    recommendation_reason: str
    matched_preferences: List[str] = Field(default_factory=list)


class AccommodationResult(BaseModel):
    destination: str
    recommended_options: List[AccommodationOption] = Field(default_factory=list, max_length=5)
    source: str = Field(description="catalog_fallback or crewai")
    catalog_validated: bool = True


class TransportationContext(BaseModel):
    destination: str = Field(min_length=1, max_length=255)
    origin: str = Field(min_length=1, max_length=255)
    traveler_count: int = Field(default=1, ge=1, le=100)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    transport_type: Optional[str] = Field(default=None, max_length=50)
    max_price: Optional[float] = Field(default=None, ge=0)
    max_duration_hours: Optional[float] = Field(default=None, gt=0, le=168)
    travel_style: Optional[str] = Field(default=None, max_length=100)
    preferences: Optional[TripPreferenceBase] = None


class TransportationSelection(BaseModel):
    transport_id: str = Field(min_length=1, max_length=255)
    recommendation_reason: str = Field(min_length=1, max_length=800)
    matched_preferences: List[str] = Field(default_factory=list, max_length=12)


class TransportationCrewOutput(BaseModel):
    selections: List[TransportationSelection] = Field(min_length=1, max_length=5)


class TransportationOption(BaseModel):
    transport_id: str
    type: str
    name: str
    route_from: str
    route_to: str
    duration_hours: float
    price: float
    currency: str
    capacity: int
    features: List[str] = Field(default_factory=list)
    recommendation_reason: str
    matched_preferences: List[str] = Field(default_factory=list)


class TransportationResult(BaseModel):
    origin: str
    destination: str
    recommended_options: List[TransportationOption] = Field(default_factory=list, max_length=5)
    source: str = Field(description="catalog_fallback or crewai")
    catalog_validated: bool = True


class ExperienceContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination: str = Field(min_length=1, max_length=255)
    traveler_count: int = Field(default=1, ge=1, le=100)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    category: Optional[str] = Field(default=None, max_length=50)
    difficulty_level: Optional[str] = Field(default=None, max_length=50)
    max_price_per_person: Optional[float] = Field(default=None, ge=0)
    max_duration_hours: Optional[float] = Field(default=None, gt=0, le=168)
    travel_style: Optional[str] = Field(default=None, max_length=100)
    preferences: Optional[TripPreferenceBase] = None


class ExperienceSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activity_id: str = Field(min_length=1, max_length=255)
    recommendation_reason: str = Field(min_length=1, max_length=800)
    matched_preferences: List[str] = Field(default_factory=list, max_length=12)


class ExperienceCrewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selections: List[ExperienceSelection] = Field(min_length=1, max_length=5)


class ExperienceOption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activity_id: str
    title: str
    category: str
    duration_hours: float
    price_per_person: float
    currency: str
    difficulty_level: str
    rating: float
    description: Optional[str] = None
    meeting_point: Optional[str] = None
    recommendation_reason: str
    matched_preferences: List[str] = Field(default_factory=list)


class ExperienceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination: str
    recommended_options: List[ExperienceOption] = Field(default_factory=list, max_length=5)
    source: str = Field(description="catalog_fallback or crewai")
    catalog_validated: bool = True


class ItineraryContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination: str = Field(min_length=1, max_length=255)
    origin: Optional[str] = Field(default=None, max_length=255)
    traveler_count: int = Field(default=1, ge=1, le=100)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    duration_days: int = Field(ge=2, le=6)
    total_budget: float = Field(gt=0)
    travel_style: Optional[str] = Field(default=None, max_length=100)
    pace: Optional[str] = Field(default=None, max_length=50)
    preferences: Optional[TripPreferenceBase] = None


class ItineraryCrewDay(BaseModel):
    model_config = ConfigDict(extra="forbid")
    day_number: int = Field(ge=1, le=6)
    activity_ids: List[str] = Field(default_factory=list, max_length=2)


class ItineraryCrewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hotel_id: str = Field(min_length=1, max_length=255)
    transport_id: str = Field(min_length=1, max_length=255)
    days: List[ItineraryCrewDay] = Field(min_length=2, max_length=6)


class ItineraryCatalogHotel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hotel_id: str
    name: str
    category: str
    price_per_night: float
    currency: str
    rating: float
    address: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    description: Optional[str] = None


class ItineraryCatalogTransport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    transport_id: str
    type: str
    name: str
    route_from: str
    route_to: str
    duration_hours: float
    price: float
    currency: str
    capacity: int
    features: List[str] = Field(default_factory=list)


class ItineraryItemRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    item_type: Literal["transport", "activity"]
    hotel_id: Optional[str] = None
    transport_id: Optional[str] = None
    activity_id: Optional[str] = None
    title: str
    start_time: str
    end_time: str
    cost: float
    currency: str
    description: Optional[str] = None
    location: Optional[str] = None


class ItineraryDay(BaseModel):
    model_config = ConfigDict(extra="forbid")
    day_number: int
    items: List[ItineraryItemRecommendation] = Field(default_factory=list)


class ItineraryResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination: str
    duration_days: int
    accommodation: ItineraryCatalogHotel
    transportation: ItineraryCatalogTransport
    itinerary_days: List[ItineraryDay] = Field(min_length=2, max_length=6)
    total_catalog_cost: float
    currency: str
    source: str = Field(description="catalog_fallback or crewai")
    catalog_validated: bool = True


class TripManagementContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trip_id: str = Field(min_length=1, max_length=255)


class TripManagementCrewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hotel_id: str = Field(min_length=1, max_length=255)
    transport_id: str = Field(min_length=1, max_length=255)
    activity_ids: List[str] = Field(min_length=1, max_length=5)
    management_notes: List[str] = Field(default_factory=list, max_length=8)


class TripManagementActivity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activity_id: str
    title: str
    category: str
    duration_hours: float
    price_per_person: float
    currency: str
    difficulty_level: str
    rating: float
    description: Optional[str] = None
    meeting_point: Optional[str] = None


class TripManagementItineraryReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    itinerary_item_id: str
    day_number: int
    order_index: int
    item_type: str
    hotel_id: Optional[str] = None
    transport_id: Optional[str] = None
    activity_id: Optional[str] = None
    status: str


class TripManagementResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trip_id: str
    destination: str
    accommodation: ItineraryCatalogHotel
    transportation: ItineraryCatalogTransport
    activities: List[TripManagementActivity] = Field(min_length=1, max_length=5)
    itinerary_references: List[TripManagementItineraryReference] = Field(default_factory=list)
    total_catalog_cost: float
    currency: str
    booking_readiness: str
    existing_booking_count: int
    management_notes: List[str] = Field(default_factory=list)
    source: str = Field(description="catalog_fallback or crewai")
    catalog_validated: bool = True


# Booking recommendations are read-only. The canonical Booking model and the
# explicit lock-booking route remain responsible for creating reservations.
class BookingRecommendationContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trip_id: str = Field(min_length=1, max_length=255)


class BookingCrewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    booking_keys: List[str] = Field(min_length=1, max_length=20)
    booking_notes: List[str] = Field(default_factory=list, max_length=8)


class BookingRecommendationItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    booking_key: str
    item_type: str
    catalog_id: str
    name: str
    description: Optional[str] = None
    quantity: int = Field(ge=1)
    unit_catalog_cost: float
    total_catalog_cost: float
    currency: str
    existing_booking_reference: Optional[str] = None
    existing_booking_status: Optional[str] = None
    existing_payment_status: Optional[str] = None


class BookingRecommendationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trip_id: str
    destination: str
    booking_items: List[BookingRecommendationItem] = Field(default_factory=list)
    total_catalog_cost: float
    currency: str
    booking_status: str
    booking_readiness: str
    existing_booking_count: int
    missing_requirements: List[str] = Field(default_factory=list)
    validation_notes: List[str] = Field(default_factory=list)
    explicit_booking_endpoint: str
    source: str = Field(description="catalog_fallback, crewai, or catalog_validation")
    catalog_validated: bool


class AssistantChatContext(BaseModel):
    """Read-only conversational request tied to one canonical trip."""
    model_config = ConfigDict(extra="forbid")
    trip_id: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


class AssistantCrewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response: str = Field(min_length=1, max_length=2000)
    referenced_ids: List[str] = Field(default_factory=list, max_length=30)
    suggested_actions: List[str] = Field(default_factory=list, max_length=5)


class AssistantReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_id: str
    reference_type: str
    title: str
    day_number: Optional[int] = None
    status: Optional[str] = None


class AssistantChatResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trip_id: str
    message: str
    response: str
    references: List[AssistantReference] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    source: str = Field(description="catalog_fallback or crewai")
    context_validated: bool = True
