from typing import List, Optional, Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
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
import os
import secrets

router = APIRouter()


def _trip_or_404(db: Session, trip_id: str) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def _record_change(db: Session, trip: Trip, action: str, field: str, value: str, reason: str, by: str = "user") -> None:
    db.add(ChangeHistory(trip_id=trip.id, changed_by=by, action=action,
                         field_changed=field, new_value=value, reason=reason))


def _trip_dict(trip: Trip) -> Dict[str, Any]:
    """Serialize the persisted trip plus UI-derived selection fields."""
    itinerary = []
    for item in trip.itinerary:
        row = {"id": item.id, "trip_id": item.trip_id, "day_number": item.day_number,
               "order_index": item.order_index, "item_type": item.item_type, "title": item.title,
               "description": item.description, "start_time": item.start_time, "end_time": item.end_time,
               "cost": item.cost, "status": item.status, "hotel_id": item.hotel_id,
               "activity_id": item.activity_id, "transport_id": item.transport_id,
               "location": item.location, "meta_data": item.meta_data or {}}
        row.update((item.meta_data or {}).get("ui", {}))
        itinerary.append(row)
    bookings = [{"id": b.id, "trip_id": b.trip_id, "vendor_id": b.vendor_id,
                 "booking_reference": b.booking_reference, "item_type": b.item_type, "item_id": b.item_id,
                 "amount": b.amount, "currency": b.currency, "status": b.status,
                 "payment_status": b.payment_status, "booking_date": b.booking_date.isoformat()} for b in trip.bookings]
    return {"id": trip.id, "user_id": trip.user_id, "destination_id": trip.destination_id,
            "title": trip.title, "status": trip.status, "start_date": trip.start_date.isoformat() if trip.start_date else None,
            "end_date": trip.end_date.isoformat() if trip.end_date else None, "duration_days": trip.duration_days,
            "total_budget": trip.total_budget, "currency": trip.currency, "traveler_count": trip.traveler_count,
            "pace": trip.pace, "created_at": trip.created_at.isoformat(), "updated_at": trip.updated_at.isoformat(),
            "destination": {"id": trip.destination.id, "name": trip.destination.name, "slug": trip.destination.slug,
                            "country": trip.destination.country, "state_region": trip.destination.state_region,
                            "description": trip.destination.description, "hero_image_url": trip.destination.hero_image_url,
                            "best_time_to_visit": trip.destination.best_time_to_visit, "tags": trip.destination.tags or [],
                            "is_featured": trip.destination.is_featured, "created_at": trip.destination.created_at.isoformat()} if trip.destination else None,
            "itinerary": itinerary, "bookings": bookings,
            "preferences": {"id": trip.preferences.id, "trip_id": trip.preferences.trip_id,
                            "budget_tier": trip.preferences.budget_tier, "interests": trip.preferences.interests or [],
                            "travel_companions": trip.preferences.travel_companions,
                            "accommodation_types": trip.preferences.accommodation_types or [],
                            "transport_preferences": trip.preferences.transport_preferences or [],
                            "dietary_requirements": trip.preferences.dietary_requirements or [],
                            "special_requests": trip.preferences.special_requests,
                            "created_at": trip.preferences.created_at.isoformat(),
                            "updated_at": trip.preferences.updated_at.isoformat()} if trip.preferences else None,
            "alerts": [{"id": a.id, "trip_id": a.trip_id, "alert_type": a.alert_type, "severity": a.severity,
                        "title": a.title, "description": a.description, "is_resolved": a.is_resolved,
                        "created_at": a.created_at.isoformat()} for a in trip.alerts],
            "notifications": [{"id": n.id, "trip_id": n.trip_id, "user_id": n.user_id, "title": n.title,
                               "message": n.message, "type": n.type, "is_read": n.is_read,
                               "created_at": n.created_at.isoformat()} for n in trip.notifications],
            "change_history": [{"id": h.id, "trip_id": h.trip_id, "changed_by": h.changed_by, "action": h.action,
                                "field_changed": h.field_changed, "old_value": h.old_value, "new_value": h.new_value,
                                "reason": h.reason, "timestamp": h.timestamp.isoformat()} for h in trip.change_history]}

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
@router.post("/trips")
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

    # 2. Resolve the planner's destination name/embedded destination to the
    # persisted catalog rather than accepting a disconnected frontend object.
    destination_id = trip_in.destination_id
    if not destination_id:
        destination_name = trip_in.destination_name
        if isinstance(trip_in.destination, str):
            destination_name = destination_name or trip_in.destination
        elif isinstance(trip_in.destination, dict):
            destination_id = trip_in.destination.get("id")
            destination_name = destination_name or trip_in.destination.get("name")
        if not destination_id and destination_name:
            destination = db.query(Destination).filter(
                (Destination.name.ilike(destination_name)) | (Destination.slug.ilike(destination_name))
            ).first()
            destination_id = destination.id if destination else None
    if not destination_id:
        raise HTTPException(status_code=422, detail="A valid destination_id or catalog destination_name is required")

    # 3. Create Trip entity
    trip = Trip(
        user_id=user_id,
        destination_id=destination_id,
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
    return _trip_dict(trip)

@router.get("/trips/{trip_id}")
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    """
    Retrieve full Trip entity with all associated sub-entities:
    traveler, preferences, itinerary items, bookings, alerts, notifications, change history, reviews.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _trip_dict(trip)

@router.put("/trips/{trip_id}")
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
    return _trip_dict(trip)

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
    context = dict(payload.session_context or {})
    if payload.current_trip:
        context["current_trip"] = payload.current_trip
    if payload.history:
        context["history"] = payload.history
    result = gemini_service.chat(
        message=payload.message,
        session_context=context
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


# ---------------------------------------------------------------------------
# PostgreSQL-backed compatibility routes used by the current React client.
# These replace Express's in-memory implementations without inventing data.
# ---------------------------------------------------------------------------
@router.get("/trips")
def list_trips(status: Optional[str] = None, search: Optional[str] = None,
               operator_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Trip)
    if status:
        query = query.filter(Trip.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter((Trip.title.ilike(like)) | (Trip.id.ilike(like)))
    # The persisted schema has no operator assignment. Keep this query accepted
    # for client compatibility, but never fabricate an assignment.
    return [_trip_dict(t) for t in query.order_by(Trip.updated_at.desc()).all()]


@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    db.delete(trip)
    db.commit()
    return {"success": True, "message": "Trip deleted"}


@router.post("/trips/{trip_id}/trigger-disruption")
def trigger_disruption(trip_id: str, db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    alert = Alert(trip_id=trip.id, alert_type="weather", severity="critical",
                  title="Operational disruption reported",
                  description="A disruption was reported and requires itinerary review.")
    db.add(alert)
    _record_change(db, trip, "disruption_triggered", "alerts", alert.title, alert.description, "operator")
    db.commit(); db.refresh(trip)
    return {"success": True, "trip": _trip_dict(trip)}


@router.post("/trips/{trip_id}/impact-analysis")
def impact_analysis(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    disruption = payload.get("disruption") or {}
    unresolved = [a for a in trip.alerts if not a.is_resolved]
    affected = [i for i in trip.itinerary if i.status in ("proposed", "confirmed")]
    exposure = sum(b.amount for b in trip.bookings if b.status in ("pending", "cancelled"))
    return {"trip_id": trip.id, "disruption": disruption, "affected_items_count": len(affected),
            "unresolved_alerts_count": len(unresolved), "financial_exposure": {
                "unfulfilled_booking_cost": exposure, "currency": trip.currency},
            "recommendation": "Review active itinerary items and select a database-backed alternative."}


@router.post("/trips/{trip_id}/ai-replan-options")
def ai_replan_options(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    if not trip.destination_id:
        raise HTTPException(status_code=400, detail="Trip has no destination")
    active_ids = {i.activity_id for i in trip.itinerary if i.activity_id}
    candidates = db.query(Activity).filter(Activity.destination_id == trip.destination_id,
                                           Activity.is_active == True).all()
    return {"trip_id": trip.id, "candidates": [{"id": a.id, "title": a.title,
            "description": a.description, "cost": a.price_per_person * trip.traveler_count,
            "vendor_name": a.vendor.name if a.vendor else None, "location": a.meeting_point,
            "match_score": 1.0 if a.id not in active_ids else 0.7,
            "ai_rationale": "Available catalog activity for this trip destination."} for a in candidates]}


@router.post("/trips/{trip_id}/apply-replan")
def apply_replan(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    activity_id = payload.get("alternative_id")
    activity = db.query(Activity).filter(Activity.id == activity_id, Activity.is_active == True).first()
    if not activity or activity.destination_id != trip.destination_id:
        raise HTTPException(status_code=400, detail="Replan alternative is unavailable for this trip")
    target = next((i for i in trip.itinerary if i.item_type == "activity" and i.status != "completed"), None)
    if target is None:
        target = ItineraryItem(trip_id=trip.id, day_number=1, order_index=len(trip.itinerary) + 1,
                               item_type="activity", title=activity.title)
        db.add(target)
    target.activity_id, target.title, target.description = activity.id, activity.title, activity.description
    target.location, target.cost, target.status = activity.meeting_point, activity.price_per_person * trip.traveler_count, "confirmed"
    for alert in trip.alerts:
        if not alert.is_resolved:
            alert.is_resolved = True
    _record_change(db, trip, "replan_applied", "itinerary", activity.title,
                   payload.get("notes") or "Operator approved an available destination activity.", "operator")
    db.add(Notification(trip_id=trip.id, user_id=trip.user_id, title="Itinerary updated",
                        message=f"Your itinerary has been updated to include {activity.title}.", type="update"))
    db.commit(); db.refresh(trip)
    return {"success": True, "summary": {"new_activity": activity.title,
            "booking_reference": None, "cost_savings": 0}, "trip": _trip_dict(trip)}


def _set_trip_request_status(trip_id: str, status: str, db: Session):
    trip = _trip_or_404(db, trip_id)
    trip.status = status
    _record_change(db, trip, f"request_{status}", "status", status, f"Trip request {status} by operator.", "operator")
    db.commit(); db.refresh(trip)
    return {"success": True, "trip": _trip_dict(trip)}


@router.post("/trips/{trip_id}/accept-request")
def accept_trip_request(trip_id: str, db: Session = Depends(get_db)):
    return _set_trip_request_status(trip_id, "confirmed", db)


@router.post("/trips/{trip_id}/decline-request")
def decline_trip_request(trip_id: str, db: Session = Depends(get_db)):
    return _set_trip_request_status(trip_id, "cancelled", db)


@router.get("/operator/dashboard")
def operator_dashboard(db: Session = Depends(get_db)):
    trips = db.query(Trip).all()
    return {"total_trips": len(trips), "planning_trips": sum(t.status == "planning" for t in trips),
            "active_trips": sum(t.status in ("confirmed", "ongoing") for t in trips),
            "unresolved_alerts": db.query(Alert).filter(Alert.is_resolved == False).count(),
            "pending_bookings": db.query(Booking).filter(Booking.status == "pending").count()}


def _vendor_dict(vendor: Any) -> Dict[str, Any]:
    return {"id": vendor.id, "name": vendor.name, "category": vendor.vendor_type,
            "location": None, "phone": vendor.phone, "contact_person": vendor.contact_email,
            "rating": vendor.rating, "is_available": vendor.is_verified,
            "active_bookings_count": sum(b.status in ("pending", "confirmed") for b in vendor.bookings)}


@router.get("/operator/vendors")
def operator_vendors(db: Session = Depends(get_db)):
    from backend.models.models import Vendor
    return [_vendor_dict(v) for v in db.query(Vendor).order_by(Vendor.name).all()]


@router.post("/operator/vendors/{vendor_id}/toggle")
def toggle_vendor(vendor_id: str, db: Session = Depends(get_db)):
    from backend.models.models import Vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_verified = not vendor.is_verified
    db.commit(); db.refresh(vendor)
    return _vendor_dict(vendor)


def _booking_dict(booking: Booking) -> Dict[str, Any]:
    return {"id": booking.id, "trip_id": booking.trip_id, "vendor_id": booking.vendor_id,
            "booking_reference": booking.booking_reference, "item_type": booking.item_type,
            "item_id": booking.item_id, "amount": booking.amount, "currency": booking.currency,
            "status": booking.status, "payment_status": booking.payment_status,
            "booking_date": booking.booking_date.isoformat()}


@router.get("/operator/bookings")
def operator_bookings(db: Session = Depends(get_db)):
    return [_booking_dict(b) for b in db.query(Booking).order_by(Booking.booking_date.desc()).all()]


@router.post("/operator/bookings/{booking_id}/action")
def operator_booking_action(booking_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    action = payload.get("action")
    if action not in {"confirm", "cancel", "rebook"}:
        raise HTTPException(status_code=422, detail="Action must be confirm, cancel, or rebook")
    booking.status = {"confirm": "confirmed", "cancel": "cancelled", "rebook": "pending"}[action]
    _record_change(db, booking.trip, f"booking_{action}", "booking", booking.booking_reference,
                   f"Operator requested booking {action}.", "operator")
    db.commit(); db.refresh(booking)
    return _booking_dict(booking)


@router.get("/operator/alerts")
def operator_alerts(db: Session = Depends(get_db)):
    return [{"id": a.id, "trip_id": a.trip_id, "alert_type": a.alert_type, "severity": a.severity,
             "title": a.title, "description": a.description, "is_resolved": a.is_resolved,
             "created_at": a.created_at.isoformat()} for a in db.query(Alert).order_by(Alert.created_at.desc()).all()]


@router.post("/operator/alerts/{alert_id}/resolve")
def resolve_operator_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    _record_change(db, alert.trip, "alert_resolved", "alert", alert.title, "Operator resolved alert.", "operator")
    db.commit()
    return {"success": True, "alert_id": alert.id}


@router.get("/operator/analytics")
def operator_analytics(db: Session = Depends(get_db)):
    trips = db.query(Trip).all()
    bookings = db.query(Booking).all()
    return {"overview": {"total_tours_operated": len(trips),
            "active_tours": sum(t.status in ("confirmed", "ongoing") for t in trips),
            "total_travelers_hosted": sum(t.traveler_count for t in trips),
            "total_gross_revenue": sum(b.amount for b in bookings if b.status == "confirmed"),
            "disruption_recovery_rate": 0 if not db.query(Alert).count() else round(100 * db.query(Alert).filter(Alert.is_resolved == True).count() / db.query(Alert).count(), 1)}}


@router.post("/auth/operator-login")
def operator_login(payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    email, password = (payload.get("email") or "").strip().lower(), payload.get("password") or ""
    configured_password = os.getenv("OPERATOR_LOGIN_PASSWORD")
    if not configured_password:
        raise HTTPException(status_code=503, detail="Operator login is not configured")
    user = db.query(User).filter(User.email == email, User.role.in_(["operator", "admin"]), User.is_active == True).first()
    if not user or not secrets.compare_digest(password, configured_password):
        raise HTTPException(status_code=401, detail="Invalid operator credentials")
    return {"success": True, "user": {"id": user.id, "email": user.email, "name": user.full_name,
            "role": user.role, "operator_name": user.full_name}, "token": secrets.token_urlsafe(32)}


def _commit_trip(db: Session, trip: Trip, action: str, field: str, value: str, reason: str) -> Dict[str, Any]:
    _record_change(db, trip, action, field, value, reason)
    db.commit(); db.refresh(trip)
    return _trip_dict(trip)


@router.post("/trips/{trip_id}/change-transport")
def change_transport(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    transport = db.query(TransportOption).filter(TransportOption.id == payload.get("transport_id"),
                                                  TransportOption.destination_id == trip.destination_id,
                                                  TransportOption.is_active == True).first()
    if not transport:
        raise HTTPException(status_code=400, detail="Transport option not found")
    item = next((i for i in trip.itinerary if i.item_type == "transport"), None)
    if not item:
        item = ItineraryItem(trip_id=trip.id, day_number=1, order_index=1, item_type="transport", title=transport.name)
        db.add(item)
    item.transport_id, item.title, item.description, item.cost, item.status = transport.id, transport.name, f"{transport.route_from} to {transport.route_to}", transport.price, "confirmed"
    return _commit_trip(db, trip, "transport_changed", "transport", transport.name, "Traveler selected a catalog transport option.")


def _change_accommodation(trip_id: str, payload: Dict[str, Any], db: Session, daily: bool) -> Dict[str, Any]:
    trip = _trip_or_404(db, trip_id)
    hotel = db.query(Hotel).filter(Hotel.id == payload.get("accommodation_id"), Hotel.destination_id == trip.destination_id,
                                   Hotel.is_active == True).first()
    if not hotel:
        raise HTTPException(status_code=400, detail="Accommodation option not found")
    day = int(payload.get("day_number") or 1) if daily else 1
    item = next((i for i in trip.itinerary if i.item_type == "hotel" and i.day_number == day), None)
    if not item:
        item = ItineraryItem(trip_id=trip.id, day_number=day, order_index=99, item_type="hotel", title=hotel.name)
        db.add(item)
    item.hotel_id, item.title, item.description, item.location, item.cost, item.status = hotel.id, hotel.name, hotel.description, hotel.address, hotel.price_per_night, "confirmed"
    return _commit_trip(db, trip, "hotel_changed", "hotel", hotel.name, "Traveler selected a catalog hotel.")


@router.post("/trips/{trip_id}/change-accommodation")
def change_accommodation(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    return _change_accommodation(trip_id, payload, db, False)


@router.post("/trips/{trip_id}/change-daily-accommodation")
@router.post("/trips/{trip_id}/change-day-accommodation")
def change_daily_accommodation(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    return _change_accommodation(trip_id, payload, db, True)


@router.post("/trips/{trip_id}/add-activity")
def add_activity(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="Activity title is required")
    day = int(payload.get("day_number") or 1)
    item = ItineraryItem(trip_id=trip.id, day_number=day,
        order_index=max([i.order_index for i in trip.itinerary if i.day_number == day] or [0]) + 1,
        item_type=payload.get("item_type") or "activity", title=title, description=payload.get("description"),
        start_time=payload.get("start_time"), end_time=payload.get("end_time"), cost=float(payload.get("cost") or 0),
        location=payload.get("location"), status="confirmed",
        meta_data={"ui": {k: payload[k] for k in ("image_url", "duration", "walking_intensity", "rest_buffer_minutes") if k in payload}})
    db.add(item)
    return _commit_trip(db, trip, "item_added", "itinerary", title, "Traveler added a custom itinerary activity.")


@router.post("/trips/{trip_id}/delete-activity")
def delete_activity(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    item = db.query(ItineraryItem).filter(ItineraryItem.id == payload.get("item_id"), ItineraryItem.trip_id == trip.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    title = item.title; db.delete(item)
    return _commit_trip(db, trip, "item_deleted", "itinerary", title, "Traveler deleted an itinerary item.")


@router.post("/trips/{trip_id}/swap-activity")
def swap_activity(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    item = db.query(ItineraryItem).filter(ItineraryItem.id == payload.get("item_id"), ItineraryItem.trip_id == trip.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    for field in ("title", "description", "cost"):
        if payload.get(f"new_{field}") is not None: setattr(item, field, payload[f"new_{field}"])
    if payload.get("new_image_url"):
        item.meta_data = {**(item.meta_data or {}), "ui": {**(item.meta_data or {}).get("ui", {}), "image_url": payload["new_image_url"]}}
    return _commit_trip(db, trip, "activity_swapped", "itinerary", item.title, "Traveler swapped an itinerary activity.")


@router.post("/trips/{trip_id}/edit-activity")
def edit_activity(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    item = db.query(ItineraryItem).filter(ItineraryItem.id == payload.get("item_id"), ItineraryItem.trip_id == trip.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    for field in ("title", "description", "start_time", "end_time", "cost"):
        if field in payload and payload[field] is not None: setattr(item, field, payload[field])
    return _commit_trip(db, trip, "activity_edited", "itinerary", item.title, "Traveler edited an itinerary activity.")


@router.post("/trips/{trip_id}/toggle-activity")
def toggle_activity(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    item = db.query(ItineraryItem).filter(ItineraryItem.id == payload.get("item_id"), ItineraryItem.trip_id == trip.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    item.status = "confirmed" if item.status == "skipped" else "skipped"
    return _commit_trip(db, trip, "activity_toggled", "itinerary", item.title, f"Activity marked {item.status}.")


@router.post("/trips/{trip_id}/add-day-leg")
def add_day_leg(trip_id: str, db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    trip.duration_days += 1
    day = trip.duration_days
    db.add(ItineraryItem(trip_id=trip.id, day_number=day, order_index=1, item_type="leisure",
           title="Free time for local exploration", description="Flexible time reserved for traveler-selected activities.",
           cost=0, status="proposed", location=trip.destination.name if trip.destination else None))
    return _commit_trip(db, trip, "day_leg_added", "duration_days", str(day), "Trip duration extended by one day.")


@router.post("/trips/{trip_id}/remove-day-leg")
def remove_day_leg(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    if trip.duration_days <= 2:
        raise HTTPException(status_code=400, detail="Trip cannot have less than 2 days")
    day = int(payload.get("day_number") or trip.duration_days)
    db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id, ItineraryItem.day_number == day).delete()
    for item in db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id, ItineraryItem.day_number > day):
        item.day_number -= 1
    trip.duration_days -= 1
    return _commit_trip(db, trip, "day_leg_removed", "duration_days", str(trip.duration_days), "Trip duration reduced by one day.")


@router.get("/possible-options")
def possible_options(destination: str, trip_id: Optional[str] = None, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter((Destination.name.ilike(destination)) | (Destination.slug.ilike(destination))).first()
    if not dest:
        return []
    return [{"id": a.id, "title": a.title, "category": a.category, "location": a.meeting_point or dest.name,
             "duration": f"{a.duration_hours:g} hours", "cost": a.price_per_person,
             "description": a.description, "image_url": (a.images or [None])[0],
             "tags": [a.category], "walking_intensity": "moderate"} for a in
            db.query(Activity).filter(Activity.destination_id == dest.id, Activity.is_active == True).all()]


@router.post("/trips/{trip_id}/lock-booking")
def lock_booking(trip_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    trip = _trip_or_404(db, trip_id)
    details = payload.get("details") or {}
    item_id, item_type = payload.get("item_id"), payload.get("item_type") or "service"
    vendor_id = None
    if item_type == "hotel" and item_id:
        record = db.query(Hotel).filter(Hotel.id == item_id).first(); vendor_id = record.vendor_id if record else None
    elif item_type == "activity" and item_id:
        record = db.query(Activity).filter(Activity.id == item_id).first(); vendor_id = record.vendor_id if record else None
    elif item_type == "transport" and item_id:
        record = db.query(TransportOption).filter(TransportOption.id == item_id).first(); vendor_id = record.vendor_id if record else None
    mode = payload.get("booking_mode")
    if mode not in {"ai_guide", "self_booking"}:
        raise HTTPException(status_code=422, detail="booking_mode must be ai_guide or self_booking")
    booking = Booking(trip_id=trip.id, vendor_id=vendor_id, item_type=item_type, item_id=item_id,
        amount=float(details.get("amount") or 0), currency=trip.currency,
        status="confirmed" if mode == "ai_guide" else "pending", payment_status="paid" if mode == "ai_guide" else "pending")
    db.add(booking); db.flush()
    _record_change(db, trip, "booking_locked", "booking", booking.booking_reference, "Booking choice saved.", "ai" if mode == "ai_guide" else "user")
    db.commit(); db.refresh(trip)
    return {"success": True, "booking": _booking_dict(booking), "trip": _trip_dict(trip)}
