from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.models import (
    Destination, Hotel, Activity, TransportOption, Trip, TripPreference,
    User, ItineraryItem, Booking, Alert, Notification, ChangeHistory, Review
)
from backend.schemas.schemas import (
    DestinationRead, HotelRead, ActivityRead, TransportRead,
    TripCreate, TripRead, TripUpdate, TripPreferenceRead, TripPreferenceUpdate,
    AIChatRequest, AIChatResponse, AIExtractPreferencesRequest, AIRecommendRequest,
    AIGenerateItineraryRequest, AIReplanRequest
)
from backend.ai.gemini_service import gemini_service
from backend.recommendation.engine import RecommendationEngine
from backend.itinerary.generator import ItineraryGenerator
from backend.replanning.engine import ReplanningEngine

router = APIRouter()

# ----------------------------------------------------
# Health Check API
# ----------------------------------------------------
@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check verifying API, DB connectivity, and Gemini AI status."""
    try:
        dest_count = db.query(Destination).count()
        trip_count = db.query(Trip).count()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        dest_count = 0
        trip_count = 0

    return {
        "status": "healthy",
        "service": "TourFlow AI API",
        "version": "1.0.0",
        "database": db_status,
        "counts": {
            "destinations": dest_count,
            "trips": trip_count
        },
        "ai_engine": {
            "gemini_available": gemini_service.is_available(),
            "model": "gemini-3.7-flash"
        }
    }

# ----------------------------------------------------
# Frontend sync metadata
# ----------------------------------------------------
@router.get("/sync/version")
def sync_version(db: Session = Depends(get_db)):
    """Return a lightweight version marker used by the operator frontend."""
    trips = db.query(Trip).all()
    latest = max((t.updated_at or t.created_at for t in trips), default=None)
    version = int(latest.timestamp()) if latest else 0
    return {
        "version": version,
        "timestamp": latest.isoformat() if latest else datetime.utcnow().isoformat() + "Z",
        "trips_count": len(trips),
    }

# ----------------------------------------------------
# Destinations API
# ----------------------------------------------------
@router.get("/destinations", response_model=List[DestinationRead])
def get_destinations(
    featured_only: bool = False,
    db: Session = Depends(get_db)
):
    """Retrieve list of all destinations or filtered by featured status."""
    query = db.query(Destination)
    if featured_only:
        query = query.filter(Destination.is_featured == True)
    return query.order_by(Destination.name.asc()).all()

@router.get("/destinations/{id}", response_model=DestinationRead)
def get_destination_by_id(id: str, db: Session = Depends(get_db)):
    """Retrieve destination details by ID or Slug."""
    destination = db.query(Destination).filter(
        (Destination.id == id) | (Destination.slug == id)
    ).first()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination

# ----------------------------------------------------
# Hotels API
# ----------------------------------------------------
@router.get("/hotels", response_model=List[HotelRead])
def get_hotels(
    destination_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve hotels with optional destination and category filters."""
    query = db.query(Hotel).filter(Hotel.is_active == True)
    if destination_id:
        query = query.filter(Hotel.destination_id == destination_id)
    if category:
        query = query.filter(Hotel.category == category)
    return query.order_by(Hotel.rating.desc()).all()

# ----------------------------------------------------
# Activities API
# ----------------------------------------------------
@router.get("/activities", response_model=List[ActivityRead])
def get_activities(
    destination_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve curated activities with optional destination and category filters."""
    query = db.query(Activity).filter(Activity.is_active == True)
    if destination_id:
        query = query.filter(Activity.destination_id == destination_id)
    if category:
        query = query.filter(Activity.category == category)
    return query.order_by(Activity.rating.desc()).all()

# ----------------------------------------------------
# Transport API
# ----------------------------------------------------
@router.get("/transport", response_model=List[TransportRead])
def get_transport_options(
    destination_id: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve transport options with optional filters."""
    query = db.query(TransportOption).filter(TransportOption.is_active == True)
    if destination_id:
        query = query.filter(TransportOption.destination_id == destination_id)
    if type:
        query = query.filter(TransportOption.type == type)
    return query.all()

# ----------------------------------------------------
# Trips API (The Central Entity)
# ----------------------------------------------------
@router.post("/trips", response_model=TripRead)
def create_trip(trip_in: TripCreate, db: Session = Depends(get_db)):
    """
    Create a new Trip entity with attached preferences, change history,
    and automatic initial itinerary generation.
    """
    # 1. Ensure user exists or use default primary traveler
    user_id = trip_in.user_id
    if not user_id:
        primary_user = db.query(User).first()
        if not primary_user:
            primary_user = User(
                email="alex.traveler@example.com",
                full_name="Alex Morgan",
                role="traveler"
            )
            db.add(primary_user)
            db.commit()
            db.refresh(primary_user)
        user_id = primary_user.id

    # 2. Create Trip entity
    trip = Trip(
        user_id=user_id,
        destination_id=trip_in.destination_id,
        title=trip_in.title,
        status=trip_in.status or "planning",
        start_date=trip_in.start_date,
        end_date=trip_in.end_date,
        duration_days=trip_in.duration_days or 4,
        total_budget=trip_in.total_budget or 50000.0,
        currency=trip_in.currency or "INR",
        traveler_count=trip_in.traveler_count or 2,
        pace=trip_in.pace or "balanced"
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # 3. Create Preferences
    prefs_in = trip_in.preferences
    pref = TripPreference(
        trip_id=trip.id,
        budget_tier=prefs_in.budget_tier if prefs_in else "moderate",
        interests=prefs_in.interests if prefs_in else ["nature", "culture"],
        travel_companions=prefs_in.travel_companions if prefs_in else "couple",
        accommodation_types=prefs_in.accommodation_types if prefs_in else ["boutique"],
        transport_preferences=prefs_in.transport_preferences if prefs_in else ["private_suv"],
        dietary_requirements=prefs_in.dietary_requirements if prefs_in else [],
        special_requests=prefs_in.special_requests if prefs_in else None
    )
    db.add(pref)

    # 4. Add Change History Entry
    history = ChangeHistory(
        trip_id=trip.id,
        changed_by="user",
        action="trip_created",
        field_changed="all",
        new_value=trip.title,
        reason="Initial trip initialized via TourFlow AI Planner"
    )
    db.add(history)

    # 5. Add Welcome Notification
    notification = Notification(
        trip_id=trip.id,
        user_id=user_id,
        title="Trip Created Successfully",
        message=f"Your trip '{trip.title}' is initialized. AI itinerary is generated and ready for customization.",
        type="success"
    )
    db.add(notification)
    db.commit()

    # 6. Generate initial itinerary items
    generator = ItineraryGenerator(db)
    generator.generate_for_trip(trip.id)

    db.refresh(trip)
    return trip

@router.get("/trips/{trip_id}", response_model=TripRead)
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    """
    Retrieve full Trip entity with all associated sub-entities:
    traveler, preferences, itinerary items, bookings, alerts, notifications, change history, reviews.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.put("/trips/{trip_id}", response_model=TripRead)
def update_trip(trip_id: str, trip_in: TripUpdate, db: Session = Depends(get_db)):
    """Update Trip attributes and record change history."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    update_data = trip_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = str(getattr(trip, field, ""))
        setattr(trip, field, value)
        # Log to change history
        history = ChangeHistory(
            trip_id=trip.id,
            changed_by="user",
            action=f"update_{field}",
            field_changed=field,
            old_value=old_val,
            new_value=str(value),
            reason=f"Traveler modified {field}"
        )
        db.add(history)

    db.commit()
    db.refresh(trip)
    return trip

@router.get("/trips/{trip_id}/preferences", response_model=TripPreferenceRead)
def get_trip_preferences(trip_id: str, db: Session = Depends(get_db)):
    """Get the preferences for a specific trip."""
    pref = db.query(TripPreference).filter(TripPreference.trip_id == trip_id).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Trip preferences not found")
    return pref

@router.put("/trips/{trip_id}/preferences", response_model=TripPreferenceRead)
def update_trip_preferences(
    trip_id: str,
    pref_in: TripPreferenceUpdate,
    db: Session = Depends(get_db)
):
    """Update trip preferences and log change history."""
    pref = db.query(TripPreference).filter(TripPreference.trip_id == trip_id).first()
    if not pref:
        # Create if doesn't exist yet
        pref = TripPreference(trip_id=trip_id)
        db.add(pref)

    update_data = pref_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)

    # Log change
    history = ChangeHistory(
        trip_id=trip_id,
        changed_by="user",
        action="preferences_updated",
        field_changed="preferences",
        new_value=str(update_data),
        reason="Traveler customized travel preferences and constraints"
    )
    db.add(history)

    db.commit()
    db.refresh(pref)
    return pref

# ----------------------------------------------------
# AI Planning & Gemini Intelligence APIs
# ----------------------------------------------------
@router.post("/operator/ai-assistant")
def operator_ai_assistant(payload: AIChatRequest):
    """
    Operator-facing Gemini assistant.

    The frontend historically called /api/operator/ai-assistant while the
    FastAPI backend exposed only /api/ai/chat. Keep the operator route as a
    compatibility layer and return the response shape expected by the UI.
    """
    context = dict(payload.session_context or {})
    if payload.trip_id:
        context["context_trip_id"] = payload.trip_id
    context["assistant_mode"] = "operations"
    context["instructions"] = (
        "Act as TourFlow AI Operations Assistant. Give concise, practical operator guidance "
        "for disruptions, routes, hotels, transport, vendors and guest communications. "
        "If live operational data is not available in the supplied context, say so rather "
        "than inventing live telemetry or bookings."
    )

    result = gemini_service.chat(
        message=payload.message,
        session_context=context
    )

    return {
        "reply": result.get("response", ""),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "suggested_actions": result.get("suggestions", []),
    }


@router.post("/ai/chat", response_model=AIChatResponse)
def ai_chat(payload: AIChatRequest):
    """Conversational AI endpoint for travel consultation."""
    result = gemini_service.chat(
        message=payload.message,
        session_context=payload.session_context
    )
    return result

@router.post("/ai/extract-preferences")
def ai_extract_preferences(payload: AIExtractPreferencesRequest):
    """Extract structured travel parameters from natural language prompts."""
    return gemini_service.extract_preferences(
        text_prompt=payload.text_prompt,
        context=payload.context
    )

@router.post("/ai/recommend")
def ai_recommend(payload: AIRecommendRequest, db: Session = Depends(get_db)):
    """Get AI recommendation insights alongside matching catalogue items."""
    engine = RecommendationEngine(db)
    return engine.get_recommendations(
        destination_id=payload.destination_id,
        preferences=payload.preferences
    )

@router.post("/ai/generate-itinerary")
def ai_generate_itinerary(payload: AIGenerateItineraryRequest, db: Session = Depends(get_db)):
    """Generate dynamic day-by-day itinerary schema."""
    if payload.trip_id:
        generator = ItineraryGenerator(db)
        items = generator.generate_for_trip(payload.trip_id)
        trip = db.query(Trip).filter(Trip.id == payload.trip_id).first()
        return {
            "status": "success",
            "trip_id": payload.trip_id,
            "items_count": len(items),
            "trip": trip
        }
    return gemini_service.generate_itinerary(
        prompt_or_prefs=payload.preferences
    )

@router.post("/ai/replan")
def ai_replan(payload: AIReplanRequest, db: Session = Depends(get_db)):
    """Dynamically adjust itinerary based on external disruption event."""
    engine = ReplanningEngine(db)
    return engine.handle_disruption(
        trip_id=payload.trip_id,
        trigger_event=payload.trigger_event
    )
