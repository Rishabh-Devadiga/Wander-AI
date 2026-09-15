import json
import os
from copy import deepcopy

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from backend.main import app
from backend.ai.gemini_service import gemini_service
from backend.database.connection import SessionLocal
from backend.models.models import (
    Activity, Alert, Booking, ChangeHistory, Destination, Hotel, ItineraryItem, TransportOption, Trip,
    TripPreference, User,
)
from backend.itinerary.generator import ItineraryGenerator
from backend.replanning.engine import ReplanningEngine
from backend.recommendation.engine import RecommendationEngine
from database.seed_data.seed import run_seed
from backend.research.service import DestinationResearchService
from backend.schemas.schemas import ResearchContext
from backend.accommodation.service import AccommodationRecommendationService, AccommodationExecutionError
from backend.schemas.schemas import AccommodationContext, AccommodationCrewOutput
from backend.transportation.service import TransportationRecommendationService, TransportationExecutionError
from backend.schemas.schemas import TransportationContext, TransportationCrewOutput
from backend.experience.service import ExperienceRecommendationService, ExperienceExecutionError
from backend.schemas.schemas import ExperienceContext, ExperienceCrewOutput
from backend.itinerary.service import ItineraryRecommendationService, ItineraryValidationError
from backend.schemas.schemas import ItineraryContext, ItineraryCrewOutput
from backend.trip.service import TripManagementService, TripManagementValidationError
from backend.schemas.schemas import TripManagementContext, TripManagementCrewOutput
from backend.booking.service import BookingRecommendationService, BookingRecommendationValidationError
from backend.schemas.schemas import BookingRecommendationContext, BookingCrewOutput
from backend.assistant.service import AssistantService, AssistantValidationError
from backend.schemas.schemas import AssistantChatContext, AssistantChatResult, AssistantCrewOutput

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    command.upgrade(Config("alembic.ini"), "head")
    run_seed()


def _evidence(label="source"):
    return [{"url": f"https://example.com/{label}", "label": label, "supports": ["existence", "coordinates"]}]


def _dynamic_inventory(destination="Gujarat", activity_names=None):
    names = activity_names or [
        "Rann of Kutch",
        "Statue of Unity",
        "Gir National Park",
        "Ahmedabad Heritage Walk",
        "Somnath Temple",
        "Dwarkadhish Temple",
    ]
    coords = [
        (23.7337, 69.8597),
        (21.8380, 73.7191),
        (21.1243, 70.8242),
        (23.0225, 72.5714),
        (20.8880, 70.4012),
        (22.2442, 68.9685),
    ]
    return {
        "destination": {
            "name": destination,
            "country": "India",
            "state_region": destination,
            "description": f"Researched travel inventory for {destination}.",
            "best_time_to_visit": "October to March",
            "latitude": 22.2587,
            "longitude": 71.1924,
            "regions": ["western India"],
            "evidence": _evidence(f"{destination.lower()}-destination"),
        },
        "activities": [
            {
                "name": name,
                "category": "culture" if idx % 2 else "nature",
                "area": name,
                "description": f"Verified visit to {name}.",
                "duration_hours": 3.0,
                "price_per_person": 1000.0,
                "currency": "INR",
                "difficulty_level": "easy",
                "latitude": coords[idx][0],
                "longitude": coords[idx][1],
                "evidence": _evidence(name.lower().replace(" ", "-")),
            }
            for idx, name in enumerate(names)
        ],
        "hotels": [
            {
                "name": "The House of MG",
                "category": "boutique",
                "address": "Lal Darwaja, Ahmedabad",
                "description": "Verified Ahmedabad heritage hotel.",
                "price_per_night": 6500.0,
                "currency": "INR",
                "rating": 4.5,
                "latitude": 23.0265,
                "longitude": 72.5812,
                "evidence": _evidence("house-of-mg"),
            }
        ],
        "transport_options": [
            {
                "name": "Ahmedabad regional private cab",
                "type": "private_cab",
                "route_from": "Ahmedabad",
                "route_to": destination,
                "duration_hours": 5.0,
                "price": 12000.0,
                "currency": "INR",
                "capacity": 4,
                "latitude": 23.0225,
                "longitude": 72.5714,
                "features": ["driver", "intercity"],
                "evidence": _evidence("gujarat-cab"),
            }
        ],
    }

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["counts"]["destinations"] >= 5

def test_get_destinations():
    response = client.get("/api/destinations")
    assert response.status_code == 200
    destinations = response.json()
    assert len(destinations) >= 5
    names = [d["name"] for d in destinations]
    for required in ["Manali", "Goa", "Kerala", "Rajasthan", "Kashmir"]:
        assert required in names

def test_get_destination_manali():
    response = client.get("/api/destinations/manali")
    assert response.status_code == 200
    manali = response.json()
    assert manali["name"] == "Manali"
    assert "Himachal Pradesh" in manali["state_region"]

def test_get_hotels():
    response = client.get("/api/hotels")
    assert response.status_code == 200
    hotels = response.json()
    assert len(hotels) >= 4

def test_get_activities_for_manali():
    # Fetch Manali id
    dest_res = client.get("/api/destinations/manali")
    manali_id = dest_res.json()["id"]

    response = client.get(f"/api/activities?destination_id={manali_id}")
    assert response.status_code == 200
    activities = response.json()
    assert len(activities) >= 4
    titles = [a["title"] for a in activities]
    assert any("Paragliding" in t for t in titles)

def test_get_transport():
    response = client.get("/api/transport")
    assert response.status_code == 200
    transports = response.json()
    assert len(transports) >= 3

def test_trip_creation_and_retrieval():
    # 1. Create Trip
    dest_res = client.get("/api/destinations/manali")
    manali_id = dest_res.json()["id"]

    payload = {
        "title": "Weekend Adventure Test Trip",
        "destination_id": manali_id,
        "duration_days": 3,
        "total_budget": 45000.0,
        "currency": "INR",
        "traveler_count": 2,
        "pace": "balanced",
        "preferences": {
            "budget_tier": "luxury",
            "interests": ["snow", "paragliding"],
            "travel_companions": "couple",
            "transport_preferences": ["private_suv"]
        }
    }
    create_res = client.post("/api/trips", json=payload)
    assert create_res.status_code == 200
    trip_data = create_res.json()
    trip_id = trip_data["id"]
    assert trip_data["title"] == "Weekend Adventure Test Trip"
    assert trip_data["preferences"]["budget_tier"] == "luxury"
    assert len(trip_data["itinerary"]) > 0

    # 2. Get Trip with all nested relationships
    get_res = client.get(f"/api/trips/{trip_id}")
    assert get_res.status_code == 200
    full_trip = get_res.json()
    assert full_trip["id"] == trip_id
    assert len(full_trip["notifications"]) >= 1
    assert len(full_trip["change_history"]) >= 1

    # 3. Update Trip
    update_res = client.put(f"/api/trips/{trip_id}", json={"title": "Updated Weekend Adventure", "pace": "relaxed"})
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Weekend Adventure"
    assert update_res.json()["pace"] == "relaxed"

    # 4. Get & Update Preferences
    pref_res = client.get(f"/api/trips/{trip_id}/preferences")
    assert pref_res.status_code == 200
    assert pref_res.json()["budget_tier"] == "luxury"

    put_pref = client.put(f"/api/trips/{trip_id}/preferences", json={"budget_tier": "ultra_luxury", "interests": ["helicopter_tour"]})
    assert put_pref.status_code == 200
    assert put_pref.json()["budget_tier"] == "ultra_luxury"


def test_trip_creation_uses_existing_catalog_without_dynamic_research(monkeypatch):
    def fail_research(*args, **kwargs):
        raise AssertionError("catalog destination should not invoke dynamic discovery")
    monkeypatch.setattr(gemini_service, "discover_destination_inventory", fail_research)

    dest_res = client.get("/api/destinations/manali")
    manali_id = dest_res.json()["id"]
    response = client.post("/api/trips", json={
        "title": "Catalog Destination Flow",
        "destination_id": manali_id,
        "duration_days": 3,
        "total_budget": 45000.0,
        "currency": "INR",
        "traveler_count": 2,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["destination"]["inventory_source"] == "catalog"
    assert data["discovery_session_id"] is None


def test_trip_creation_discovers_gujarat_without_permanent_catalog_pollution(monkeypatch):
    db = SessionLocal()
    before = db.query(Trip).count()
    db.close()
    monkeypatch.setattr(
        gemini_service,
        "discover_destination_inventory",
        lambda context: _dynamic_inventory("Gujarat"),
    )

    payload = {
        "title": "Gujarat Dynamic Trip",
        "destination_name": "Gujarat",
        "duration_days": 7,
        "total_budget": 90000.0,
        "currency": "INR",
        "traveler_count": 2,
        "preferences": {
            "interests": ["Rann of Kutch", "Statue of Unity", "Gir National Park"],
        },
    }
    response = client.post("/api/trips", json=payload)
    assert response.status_code == 200
    data = response.json()
    titles = {item["title"] for item in data["itinerary"]}
    assert {"Rann of Kutch", "Statue of Unity", "Gir National Park", "Ahmedabad Heritage Walk"} & titles
    assert "The House of MG" in titles
    assert data["destination"]["inventory_source"] == "discovered"
    assert data["destination"]["verification_status"] == "verified_candidate"
    assert data["discovery_session_id"]
    assert all(
        item.get("hotel_id") or item.get("activity_id") or item.get("transport_id")
        for item in data["itinerary"]
        if item["item_type"] in {"hotel", "activity", "transport"}
    )
    assert all(
        "latitude" in item and "longitude" in item
        for item in data["itinerary"]
        if item["item_type"] in {"hotel", "activity", "transport"}
    )

    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before + 1
        assert db.query(Destination).filter(
            Destination.name.ilike("Gujarat"),
            Destination.inventory_source == "catalog",
        ).count() == 0
    finally:
        db.close()


def test_trip_creation_discovers_arbitrary_destination(monkeypatch):
    inventory = _dynamic_inventory(
        "Testland",
        ["Museum Quarter", "Old Town Walk", "River Viewpoint", "Central Market"],
    )
    inventory["destination"]["latitude"] = 10.0
    inventory["destination"]["longitude"] = 20.0
    monkeypatch.setattr(
        gemini_service,
        "discover_destination_inventory",
        lambda context: inventory,
    )
    response = client.post("/api/trips", json={
        "title": "Arbitrary Dynamic Trip",
        "destination_name": "Testland",
        "duration_days": 4,
        "total_budget": 70000.0,
        "currency": "INR",
        "traveler_count": 2,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["destination"]["name"] == "Testland"
    assert data["destination"]["inventory_source"] == "discovered"


def test_trip_creation_rejects_bare_source_url_hotel_without_persisting(monkeypatch):
    inventory = deepcopy(_dynamic_inventory("Bare Url Place"))
    inventory["hotels"][0]["evidence"] = [{"url": "https://example.com/hotel"}]
    monkeypatch.setattr(
        gemini_service,
        "discover_destination_inventory",
        lambda context: inventory,
    )
    db = SessionLocal()
    before = db.query(Trip).count()
    db.close()
    response = client.post("/api/trips", json={
        "title": "Invalid Hotel Evidence",
        "destination_name": "Bare Url Place",
        "duration_days": 3,
        "total_budget": 70000.0,
    })
    assert response.status_code == 422
    assert "source URL alone is insufficient" in response.json()["detail"]
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_trip_creation_rejects_invalid_activity_without_persisting(monkeypatch):
    inventory = deepcopy(_dynamic_inventory("Invalid Activity Place"))
    inventory["activities"][0]["evidence"] = []
    monkeypatch.setattr(
        gemini_service,
        "discover_destination_inventory",
        lambda context: inventory,
    )
    response = client.post("/api/trips", json={
        "title": "Invalid Activity Evidence",
        "destination_name": "Invalid Activity Place",
        "duration_days": 3,
        "total_budget": 70000.0,
    })
    assert response.status_code == 422
    assert "Research candidate evidence" in response.json()["detail"]


def test_trip_creation_rejects_invalid_coordinates(monkeypatch):
    inventory = deepcopy(_dynamic_inventory("Invalid Coordinate Place"))
    inventory["activities"][0]["latitude"] = 123.0
    monkeypatch.setattr(
        gemini_service,
        "discover_destination_inventory",
        lambda context: inventory,
    )
    response = client.post("/api/trips", json={
        "title": "Invalid Coordinate Trip",
        "destination_name": "Invalid Coordinate Place",
        "duration_days": 3,
        "total_budget": 70000.0,
    })
    assert response.status_code == 422
    assert "invalid latitude" in response.json()["detail"]


def test_trip_creation_rejects_unknown_destination_id_without_persisting():
    db = SessionLocal()
    before = db.query(Trip).count()
    db.close()

    response = client.post("/api/trips", json={
        "title": "Unknown Destination ID",
        "destination_id": "dest-gujarat-missing",
        "duration_days": 3,
        "total_budget": 90000.0,
    })
    assert response.status_code == 422
    assert "catalog destination" in response.json()["detail"]

    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_ai_generate_itinerary_requires_trip_id_for_catalog_grounding():
    response = client.post("/api/ai/generate-itinerary", json={
        "destination_id": "dest-gujarat-missing",
        "duration_days": 4,
        "preferences": {"destination": "Gujarat"},
    })
    assert response.status_code == 422
    assert "trip_id is required" in response.json()["detail"]

def test_ai_foundation_endpoints():
    # Chat
    chat_res = client.post("/api/ai/chat", json={"message": "I want to plan a snow trip to Manali for 4 days"})
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "response" in chat_data
    assert len(chat_data["suggestions"]) > 0

    # Extract Preferences
    pref_res = client.post("/api/ai/extract-preferences", json={"text_prompt": "Looking for luxury resort in Manali with paragliding for a couple"})
    assert pref_res.status_code == 200
    assert "budget_tier" in pref_res.json()

    # Replan
    dest_res = client.get("/api/destinations/manali")
    manali_id = dest_res.json()["id"]
    create_res = client.post("/api/trips", json={"title": "Replan Test", "destination_id": manali_id})
    trip_id = create_res.json()["id"]

    replan_res = client.post("/api/ai/replan", json={
        "trip_id": trip_id,
        "trigger_event": {
            "type": "weather_alert",
            "severity": "warning",
            "title": "Heavy snowfall at Solang pass",
            "description": "Roads temporarily blocked"
        }
    })
    assert replan_res.status_code == 200
    assert replan_res.json()["status"] == "success"


def _replanning_test_trip():
    db = SessionLocal()
    user = db.query(User).first()
    destination = db.query(Destination).filter(Destination.slug == "manali").first()
    activity = db.query(Activity).filter(Activity.id == "act-manali-001").first()
    trip = Trip(user_id=user.id, destination_id=destination.id, title="Catalog replan test", traveler_count=2)
    db.add(trip)
    db.flush()
    item = ItineraryItem(
        trip_id=trip.id, day_number=2, order_index=1, item_type="activity",
        title=activity.title, description=activity.description, activity_id=activity.id,
        location="Solang Valley", cost=activity.price_per_person * trip.traveler_count, status="confirmed",
    )
    db.add(item)
    db.commit()
    return db, trip, item


def test_replanning_trip_not_found_does_not_create_alert():
    db = SessionLocal()
    before = db.query(Alert).count()
    result = ReplanningEngine(db).handle_disruption("missing-trip", {"type": "weather_alert"})
    assert result == {"status": "error", "message": "Trip not found"}
    assert db.query(Alert).count() == before
    db.close()


def test_replanning_inspects_itinerary_creates_catalog_proposal_and_history():
    db, trip, item = _replanning_test_trip()
    result = ReplanningEngine(db).handle_disruption(trip.id, {
        "type": "weather_alert", "severity": "warning", "title": "Heavy snowfall at Solang Valley",
        "description": "Outdoor activity is unavailable", "alternative_id": "act-manali-003",
    })

    assert result["status"] == "success"
    assert result["trip_id"] == trip.id
    assert db.query(Alert).filter(Alert.id == result["alert_id"], Alert.trip_id == trip.id).one().is_resolved is False
    plan = result["ai_replan_plan"]
    assert plan["affected_items"][0]["id"] == item.id
    assert plan["proposals"][0]["itinerary_item_id"] == item.id
    alternative = plan["proposals"][0]["alternative"]
    assert alternative["activity_id"] == "act-manali-003"
    assert db.query(Activity).filter(
        Activity.id == alternative["activity_id"], Activity.destination_id == trip.destination_id,
        Activity.is_active == True,
    ).one()
    history = db.query(ChangeHistory).filter(
        ChangeHistory.trip_id == trip.id, ChangeHistory.action == "replan_proposed",
    ).one()
    assert json.loads(history.old_value)["activity_id"] == "act-manali-001"
    assert json.loads(history.new_value)["activity_id"] == "act-manali-003"
    assert db.query(ItineraryItem).filter(ItineraryItem.id == item.id).one().activity_id == "act-manali-001"
    db.close()


def test_replanning_rejects_non_catalog_requested_alternative():
    db, trip, item = _replanning_test_trip()
    result = ReplanningEngine(db).handle_disruption(trip.id, {
        "type": "weather_alert", "title": "Solang Valley weather disruption",
        "alternative_id": "not-a-catalog-activity",
    })

    plan = result["ai_replan_plan"]
    assert plan["rejected_alternative_id"] == "not-a-catalog-activity"
    assert all(proposal["alternative"]["activity_id"] != "not-a-catalog-activity" for proposal in plan["proposals"])
    assert item.id in {affected["id"] for affected in plan["affected_items"]}
    db.close()


def test_existing_replan_options_and_apply_routes_remain_available():
    db, trip, _ = _replanning_test_trip()
    trip_id = trip.id
    db.close()

    options = client.post(f"/api/trips/{trip_id}/ai-replan-options")
    assert options.status_code == 200
    assert any(candidate["id"] == "act-manali-003" for candidate in options.json()["candidates"])

    applied = client.post(f"/api/trips/{trip_id}/apply-replan", json={"alternative_id": "act-manali-003"})
    assert applied.status_code == 200
    assert any(item["activity_id"] == "act-manali-003" for item in applied.json()["trip"]["itinerary"])


def test_recommendation_engine_scores_destination_catalog_without_gemini(monkeypatch):
    import backend.recommendation.engine as recommendation_engine

    class UnavailableGemini:
        def recommend(self, **_kwargs):
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(recommendation_engine, "gemini_service", UnavailableGemini())
    db = SessionLocal()
    try:
        destination = db.query(Destination).filter(Destination.slug == "manali").one()
        result = RecommendationEngine(db).get_recommendations(destination.id, {
            "budget_tier": "budget",
            "interests": ["culture"],
            "accommodation_types": ["boutique"],
            "transport_preferences": ["volvo_bus"],
            "travel_companions": "couple",
            "dietary_requirements": [],
            "special_requests": "short",
        })
        assert result["ai_insights"]["status"] == "unavailable"
        assert result["recommended_hotels"][0]["id"] == "htl-manali-002"
        assert result["recommended_activities"][0]["id"] == "act-manali-004"
        assert result["recommended_transport"][0]["id"] == "trn-manali-002"
        for key in ("recommended_hotels", "recommended_activities", "recommended_transport"):
            scores = [entry["match_score"] for entry in result[key]]
            assert scores == sorted(scores, reverse=True)
            assert all(isinstance(score, float) for score in scores)
        active_ids = {
            "recommended_hotels": {item.id for item in db.query(Hotel).filter(Hotel.destination_id == destination.id, Hotel.is_active == True)},
            "recommended_activities": {item.id for item in db.query(Activity).filter(Activity.destination_id == destination.id, Activity.is_active == True)},
            "recommended_transport": {item.id for item in db.query(TransportOption).filter(TransportOption.destination_id == destination.id, TransportOption.is_active == True)},
        }
        for key, ids in active_ids.items():
            assert {entry["id"] for entry in result[key]} <= ids
    finally:
        db.close()


def test_itinerary_generator_consumes_ranked_catalog_without_duplicates(monkeypatch):
    import backend.itinerary.generator as itinerary_generator

    class RankedEngine:
        def __init__(self, db):
            pass

        def get_recommendations(self, destination_id, preferences, discovery_session_id=None):
            assert destination_id == "dest-manali-001"
            assert preferences["budget_tier"] == "budget"
            return {
                "ai_insights": None,
                "recommended_hotels": [{"id": "htl-manali-002"}],
                "recommended_activities": [
                    {"id": "act-manali-004"},
                    {"id": "act-manali-004"},
                    {"id": "act-manali-003"},
                    {"id": "act-manali-001"},
                ],
                "recommended_transport": [{"id": "trn-manali-002"}],
            }

    monkeypatch.setattr(itinerary_generator, "RecommendationEngine", RankedEngine)
    db = SessionLocal()
    trip = None
    try:
        trip = Trip(
            user_id="usr-alex-morgan-001",
            destination_id="dest-manali-001",
            title="Ranked Generator Test",
            duration_days=3,
            total_budget=100000.0,
            currency="INR",
            traveler_count=3,
        )
        db.add(trip)
        db.flush()
        db.add(TripPreference(
            trip_id=trip.id,
            budget_tier="budget",
            interests=["culture"],
            travel_companions="friends",
            accommodation_types=["boutique"],
            transport_preferences=["volvo_bus"],
            dietary_requirements=[],
        ))
        db.commit()

        items = ItineraryGenerator(db).generate_for_trip(trip.id)
        assert next(item for item in items if item.hotel_id).hotel_id == "htl-manali-002"
        assert next(item for item in items if item.transport_id).transport_id == "trn-manali-002"
        activities = [item for item in items if item.activity_id]
        assert [item.activity_id for item in activities] == [
            "act-manali-004", "act-manali-003", "act-manali-001",
        ]
        assert len({item.activity_id for item in activities}) == len(activities)
        assert all(item.status == "proposed" for item in items)
        hotel = db.query(Hotel).filter(Hotel.id == "htl-manali-002").one()
        transport = db.query(TransportOption).filter(TransportOption.id == "trn-manali-002").one()
        catalog_activities = {item.id: item for item in db.query(Activity).filter(Activity.id.in_([
            "act-manali-004", "act-manali-003", "act-manali-001",
        ])).all()}
        assert next(item.cost for item in items if item.hotel_id) == hotel.price_per_night * 2
        assert next(item.cost for item in items if item.transport_id) == transport.price
        assert [item.cost for item in activities] == [
            catalog_activities[item.activity_id].price_per_person * 3 for item in activities
        ]

        repeated = ItineraryGenerator(db).generate_for_trip(trip.id)
        assert [item.id for item in repeated] == [item.id for item in items]
        assert db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).count() == len(items)
    finally:
        if trip:
            db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).delete()
            db.query(TripPreference).filter(TripPreference.trip_id == trip.id).delete()
            db.query(Trip).filter(Trip.id == trip.id).delete()
            db.commit()
        db.close()


def test_itinerary_generator_rejects_invalid_ranked_catalog_ids(monkeypatch):
    import backend.itinerary.generator as itinerary_generator

    class InvalidRankedEngine:
        def __init__(self, db):
            pass

        def get_recommendations(self, destination_id, preferences, discovery_session_id=None):
            assert destination_id == "dest-manali-001"
            return {
                "ai_insights": None,
                "recommended_hotels": [{"id": "htl-fictional-palace"}],
                "recommended_activities": [{"id": "act-manali-004"}, {"id": "act-manali-003"}],
                "recommended_transport": [{"id": "trn-manali-002"}],
            }

    monkeypatch.setattr(itinerary_generator, "RecommendationEngine", InvalidRankedEngine)
    db = SessionLocal()
    trip = None
    try:
        trip = Trip(
            user_id="usr-alex-morgan-001",
            destination_id="dest-manali-001",
            title="Invalid Ranked ID Test",
            duration_days=3,
            total_budget=100000.0,
            currency="INR",
            traveler_count=2,
        )
        db.add(trip)
        db.commit()

        with pytest.raises(itinerary_generator.ItineraryGenerationError):
            ItineraryGenerator(db).generate_for_trip(trip.id)
        assert db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).count() == 0
    finally:
        if trip:
            db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).delete()
            db.query(Trip).filter(Trip.id == trip.id).delete()
            db.commit()
        db.close()


def test_trip_optimizer_rebuilds_proposed_items_from_ranked_catalog(monkeypatch):
    import backend.itinerary.generator as itinerary_generator

    class RankedEngine:
        def __init__(self, db):
            pass

        def get_recommendations(self, destination_id, preferences, discovery_session_id=None):
            assert destination_id == "dest-manali-001"
            assert preferences["interests"] == ["culture"]
            return {
                "ai_insights": None,
                "recommended_hotels": [{"id": "htl-manali-002"}],
                "recommended_activities": [
                    {"id": "act-manali-004"},
                    {"id": "act-manali-003"},
                    {"id": "act-manali-001"},
                ],
                "recommended_transport": [{"id": "trn-manali-002"}],
            }

    monkeypatch.setattr(itinerary_generator, "RecommendationEngine", RankedEngine)
    db = SessionLocal()
    trip = None
    try:
        trip = Trip(
            user_id="usr-alex-morgan-001",
            destination_id="dest-manali-001",
            title="Optimizer Test",
            duration_days=3,
            total_budget=50000.0,
            currency="INR",
            traveler_count=2,
            pace="relaxed",
        )
        db.add(trip)
        db.flush()
        db.add(TripPreference(
            trip_id=trip.id,
            budget_tier="budget",
            interests=["culture"],
            travel_companions="couple",
            accommodation_types=["boutique"],
            transport_preferences=["volvo_bus"],
            dietary_requirements=[],
        ))
        db.add_all([
            ItineraryItem(
                trip_id=trip.id, day_number=1, order_index=1, item_type="hotel", title="Old hotel",
                cost=37000.0, status="proposed", hotel_id="htl-manali-001",
            ),
            ItineraryItem(
                trip_id=trip.id, day_number=1, order_index=2, item_type="activity", title="Duplicate",
                cost=7000.0, status="proposed", activity_id="act-manali-001",
            ),
            ItineraryItem(
                trip_id=trip.id, day_number=2, order_index=1, item_type="activity", title="Duplicate",
                cost=7000.0, status="proposed", activity_id="act-manali-001",
            ),
        ])
        db.commit()

        response = client.post(f"/api/trips/{trip.id}/optimize")
        assert response.status_code == 200
        body = response.json()
        assert body["trip_id"] == trip.id
        optimized = body["trip"]["itinerary"]
        assert next(item for item in optimized if item["hotel_id"])["hotel_id"] == "htl-manali-002"
        assert next(item for item in optimized if item["transport_id"])["transport_id"] == "trn-manali-002"
        activity_ids = [item["activity_id"] for item in optimized if item["activity_id"]]
        assert activity_ids == ["act-manali-004", "act-manali-003", "act-manali-001"]
        assert len(activity_ids) == len(set(activity_ids))
        assert sum(item["cost"] for item in optimized) <= 50000.0
        assert all(item["day_number"] <= 3 for item in optimized)

        repeated = client.post(f"/api/trips/{trip.id}/optimize")
        assert repeated.status_code == 200
        repeated_items = repeated.json()["trip"]["itinerary"]
        assert [item["activity_id"] for item in repeated_items if item["activity_id"]] == activity_ids
        assert len(repeated_items) == len(optimized)
        assert "/api/trips/{trip_id}/optimize" in client.get("/openapi.json").json()["paths"]
    finally:
        if trip:
            db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).delete()
            db.query(TripPreference).filter(TripPreference.trip_id == trip.id).delete()
            db.query(Trip).filter(Trip.id == trip.id).delete()
            db.commit()
        db.close()


class _ResearchGemini:
    def __init__(self, result=None, error=None, available=True):
        self.result = result
        self.error = error
        self.available = available

    def is_available(self):
        return self.available

    def generate_destination_research(self, catalog_context, traveler_context):
        if self.error:
            raise self.error
        return self.result


def _research_result():
    return {
        "destination": "Manali", "destination_summary": "A Himalayan destination with mountain and valley settings.",
        "recommended_areas": [{"name": "Old Manali", "category": "neighborhood", "area_location": "Manali",
                                "description": "A distinct local area.", "relevance_to_traveler": "Nature and adventure context.",
                                "practical_notes": "Confirm conditions before travel."}],
        "key_places": [], "attractions": [], "travel_considerations": ["Allow for weather variation."],
        "seasonal_considerations": ["Conditions vary by season."], "preference_relevant_insights": ["Adventure interests are relevant."],
        "source": "gemini",
    }


def test_research_valid_complete_context(monkeypatch):
    import backend.api.routes as routes
    from backend.research import service as research_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, catalog, traveler):
            from backend.schemas.schemas import ResearchResult
            return ResearchResult.model_validate(_research_result())

    monkeypatch.setattr(routes, "gemini_service", _ResearchGemini(_research_result()))
    monkeypatch.setattr(research_service, "ResearchCrew", FakeCrew)
    db = SessionLocal()
    try:
        before = db.query(Trip).count()
    finally:
        db.close()
    response = client.post("/api/research", json={
        "destination": "Manali", "origin": "Mumbai", "duration_days": 5,
        "traveler_count": 2, "total_budget": 80000, "pace": "balanced",
        "preferences": {"interests": ["adventure", "nature"], "budget_tier": "moderate"},
    })
    assert response.status_code == 200
    body = response.json()
    assert body["destination"] == "Manali"
    assert "itinerary" not in body
    assert "bookings" not in body
    assert body["recommended_areas"][0]["name"] == "Old Manali"
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_research_partial_context_uses_catalog_fallback(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _ResearchGemini(available=False))
    response = client.post("/api/research", json={"destination": "Manali"})
    assert response.status_code == 200
    assert response.json()["source"] == "catalog_fallback"
    assert response.json()["destination_summary"]


def test_research_rejects_missing_or_invalid_destination_context():
    assert client.post("/api/research", json={}).status_code == 422
    assert client.post("/api/research", json={"destination": "Manali", "duration_days": 0}).status_code == 422


def test_research_returns_not_found_for_unknown_catalog_destination():
    response = client.post("/api/research", json={"destination": "Atlantis"})
    assert response.status_code == 404


def test_research_crew_execution_and_structured_validation(monkeypatch):
    from backend.research import service as research_service
    db = SessionLocal()
    try:
        class FakeCrew:
            def __init__(self, gemini):
                pass
            def run(self, catalog, traveler):
                from backend.schemas.schemas import ResearchResult
                return ResearchResult.model_validate(_research_result())
        monkeypatch.setattr(research_service, "ResearchCrew", FakeCrew)
        result = DestinationResearchService(db, _ResearchGemini(_research_result())).execute(
            ResearchContext(destination="Manali")
        )
        assert result.destination == "Manali"
        assert result.source == "gemini"
    finally:
        db.close()


def test_research_rejects_gemini_failure_and_malformed_output(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _ResearchGemini(error=RuntimeError("provider unavailable")))
    assert client.post("/api/research", json={"destination": "Manali"}).status_code == 502
    monkeypatch.setattr(routes, "gemini_service", _ResearchGemini({"destination": "Manali"}))
    assert client.post("/api/research", json={"destination": "Manali"}).status_code == 502


class _AccommodationGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def _accommodation_context(**overrides):
    payload = {
        "destination": "Manali", "traveler_count": 2, "currency": "INR",
        "max_price_per_night": 13000,
        "preferences": {"accommodation_types": ["boutique"]},
    }
    payload.update(overrides)
    return payload


def test_accommodation_api_returns_catalog_validated_options_without_trip_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.accommodation import service as accommodation_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            return AccommodationCrewOutput.model_validate({"selections": [{
                "hotel_id": candidates[0]["hotel_id"], "recommendation_reason": "Matches the supplied boutique preference.",
                "matched_preferences": ["boutique"],
            }]})

    monkeypatch.setattr(routes, "gemini_service", _AccommodationGemini())
    monkeypatch.setattr(accommodation_service, "AccommodationCrew", FakeCrew)
    db = SessionLocal()
    try:
        before = db.query(Trip).count()
    finally:
        db.close()
    response = client.post("/api/accommodations/recommendations", json=_accommodation_context())
    assert response.status_code == 200
    body = response.json()
    assert body["destination"] == "Manali"
    assert body["source"] == "crewai"
    assert body["catalog_validated"] is True
    assert body["recommended_options"][0]["hotel_id"] == "htl-manali-002"
    assert "booking" not in body
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_accommodation_rejects_invalid_or_unknown_destination():
    assert client.post("/api/accommodations/recommendations", json={}).status_code == 422
    assert client.post("/api/accommodations/recommendations", json={"destination": "Atlantis"}).status_code == 404


def test_accommodation_returns_not_found_when_hard_constraints_leave_no_catalog_candidate(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _AccommodationGemini(available=False))
    response = client.post("/api/accommodations/recommendations", json=_accommodation_context(max_price_per_night=100))
    assert response.status_code == 404


def test_accommodation_catalog_fallback_and_crew_validation(monkeypatch):
    from backend.accommodation import service as accommodation_service
    db = SessionLocal()
    try:
        fallback = AccommodationRecommendationService(db, _AccommodationGemini(available=False)).execute(
            AccommodationContext.model_validate(_accommodation_context())
        )
        assert fallback.source == "catalog_fallback"
        assert fallback.recommended_options[0].hotel_id == "htl-manali-002"

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, traveler, candidates):
                return AccommodationCrewOutput.model_validate({"selections": [{
                    "hotel_id": "not-a-catalog-hotel", "recommendation_reason": "Invalid.", "matched_preferences": [],
                }]})

        monkeypatch.setattr(accommodation_service, "AccommodationCrew", InvalidCrew)
        with pytest.raises(AccommodationExecutionError):
            AccommodationRecommendationService(db, _AccommodationGemini()).execute(
                AccommodationContext.model_validate(_accommodation_context())
            )
    finally:
        db.close()


def test_accommodation_crew_failure_is_returned_as_502(monkeypatch):
    import backend.api.routes as routes
    from backend.accommodation import service as accommodation_service

    class FailingCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(routes, "gemini_service", _AccommodationGemini())
    monkeypatch.setattr(accommodation_service, "AccommodationCrew", FailingCrew)
    response = client.post("/api/accommodations/recommendations", json=_accommodation_context())
    assert response.status_code == 502


class _TransportationGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def _transportation_context(**overrides):
    payload = {
        "destination": "Manali", "origin": "Delhi", "traveler_count": 2,
        "currency": "INR", "transport_type": "volvo_bus", "max_price": 2000,
    }
    payload.update(overrides)
    return payload


def test_transportation_api_returns_catalog_option_without_trip_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.transportation import service as transportation_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            return TransportationCrewOutput.model_validate({"selections": [{
                "transport_id": candidates[0]["transport_id"], "recommendation_reason": "Matches the verified route and capacity.",
                "matched_preferences": ["volvo_bus"],
            }]})

    monkeypatch.setattr(routes, "gemini_service", _TransportationGemini())
    monkeypatch.setattr(transportation_service, "TransportationCrew", FakeCrew)
    db = SessionLocal()
    try:
        before = db.query(Trip).count()
    finally:
        db.close()
    response = client.post("/api/transportation/recommendations", json=_transportation_context())
    assert response.status_code == 200
    body = response.json()
    assert body["destination"] == "Manali"
    assert body["origin"] == "Delhi"
    assert body["source"] == "crewai"
    assert body["recommended_options"][0]["transport_id"] == "trn-manali-002"
    assert body["catalog_validated"] is True
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_transportation_rejects_invalid_destination_origin_and_constraints(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _TransportationGemini(available=False))
    assert client.post("/api/transportation/recommendations", json={"destination": "Manali"}).status_code == 422
    assert client.post("/api/transportation/recommendations", json=_transportation_context(destination="Atlantis")).status_code == 404
    assert client.post("/api/transportation/recommendations", json=_transportation_context(origin="Mumbai")).status_code == 404


def test_transportation_catalog_fallback_and_invalid_ai_id_rejection(monkeypatch):
    from backend.transportation import service as transportation_service
    db = SessionLocal()
    try:
        context = TransportationContext.model_validate(_transportation_context())
        fallback = TransportationRecommendationService(db, _TransportationGemini(available=False)).execute(context)
        assert fallback.source == "catalog_fallback"
        assert fallback.recommended_options[0].transport_id == "trn-manali-002"

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, traveler, candidates):
                return TransportationCrewOutput.model_validate({"selections": [{
                    "transport_id": "not-a-catalog-transport", "recommendation_reason": "Invalid.", "matched_preferences": [],
                }]})

        monkeypatch.setattr(transportation_service, "TransportationCrew", InvalidCrew)
        with pytest.raises(TransportationExecutionError):
            TransportationRecommendationService(db, _TransportationGemini()).execute(context)
    finally:
        db.close()


def test_transportation_crew_failure_or_malformed_output_returns_502(monkeypatch):
    import backend.api.routes as routes
    from backend.transportation import service as transportation_service

    class FailingCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            return {"not": "a structured crew output"}

    monkeypatch.setattr(routes, "gemini_service", _TransportationGemini())
    monkeypatch.setattr(transportation_service, "TransportationCrew", FailingCrew)
    assert client.post("/api/transportation/recommendations", json=_transportation_context()).status_code == 502


class _ExperienceGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def _experience_context(**overrides):
    payload = {
        "destination": "Manali", "traveler_count": 2, "currency": "INR",
        "category": "adventure", "max_price_per_person": 3000,
        "preferences": {"interests": ["adventure", "nature"]},
    }
    payload.update(overrides)
    return payload


def test_experience_api_returns_catalog_option_without_trip_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.experience import service as experience_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            return ExperienceCrewOutput.model_validate({"selections": [{
                "activity_id": candidates[0]["activity_id"],
                "recommendation_reason": "Matches the verified adventure preference.",
                "matched_preferences": ["adventure"],
            }]})

    monkeypatch.setattr(routes, "gemini_service", _ExperienceGemini())
    monkeypatch.setattr(experience_service, "ExperienceCrew", FakeCrew)
    db = SessionLocal()
    try:
        before = db.query(Trip).count()
    finally:
        db.close()
    response = client.post("/api/experiences/recommendations", json=_experience_context())
    assert response.status_code == 200
    body = response.json()
    assert body["destination"] == "Manali"
    assert body["source"] == "crewai"
    assert body["recommended_options"][0]["activity_id"] == "act-manali-005"
    assert body["catalog_validated"] is True
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_experience_rejects_invalid_destination_request_and_empty_catalog(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _ExperienceGemini(available=False))
    assert client.post("/api/experiences/recommendations", json={}).status_code == 422
    assert client.post("/api/experiences/recommendations", json=_experience_context(destination="Atlantis")).status_code == 404
    assert client.post("/api/experiences/recommendations", json=_experience_context(max_price_per_person=100)).status_code == 404


def test_experience_catalog_fallback_and_invalid_ai_id_rejection(monkeypatch):
    from backend.experience import service as experience_service
    db = SessionLocal()
    try:
        context = ExperienceContext.model_validate(_experience_context())
        fallback = ExperienceRecommendationService(db, _ExperienceGemini(available=False)).execute(context)
        assert fallback.source == "catalog_fallback"
        assert fallback.recommended_options[0].activity_id == "act-manali-005"

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, traveler, candidates):
                return ExperienceCrewOutput.model_validate({"selections": [{
                    "activity_id": "not-a-catalog-activity", "recommendation_reason": "Invalid.",
                    "matched_preferences": [],
                }]})

        monkeypatch.setattr(experience_service, "ExperienceCrew", InvalidCrew)
        with pytest.raises(ExperienceExecutionError):
            ExperienceRecommendationService(db, _ExperienceGemini()).execute(context)
    finally:
        db.close()


def test_experience_crew_failure_or_malformed_output_returns_502(monkeypatch):
    import backend.api.routes as routes
    from backend.experience import service as experience_service

    class MalformedCrew:
        def __init__(self, gemini):
            pass

        def run(self, traveler, candidates):
            return {"not": "a structured crew output"}

    monkeypatch.setattr(routes, "gemini_service", _ExperienceGemini())
    monkeypatch.setattr(experience_service, "ExperienceCrew", MalformedCrew)
    assert client.post("/api/experiences/recommendations", json=_experience_context()).status_code == 502


class _ItineraryGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def _itinerary_context(**overrides):
    payload = {
        "destination": "Manali", "origin": "Delhi", "traveler_count": 2,
        "currency": "INR", "duration_days": 3, "total_budget": 100000,
        "travel_style": "balanced", "pace": "balanced",
        "preferences": {"interests": ["adventure", "nature"], "budget_tier": "moderate"},
    }
    payload.update(overrides)
    return payload


def test_itinerary_api_rebuilds_catalog_facts_without_trip_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.itinerary import service as itinerary_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, trip_context, catalog):
            return ItineraryCrewOutput.model_validate({
                "hotel_id": catalog["hotels"][0]["hotel_id"],
                "transport_id": catalog["transports"][0]["transport_id"],
                "days": [
                    {"day_number": 1, "activity_ids": []},
                    {"day_number": 2, "activity_ids": [catalog["activities"][0]["activity_id"]]},
                    {"day_number": 3, "activity_ids": [catalog["activities"][1]["activity_id"]]},
                ],
            })

    monkeypatch.setattr(routes, "gemini_service", _ItineraryGemini())
    monkeypatch.setattr(itinerary_service, "ItineraryCrew", FakeCrew)
    db = SessionLocal()
    try:
        before = db.query(Trip).count()
    finally:
        db.close()
    response = client.post("/api/itinerary/recommendations", json=_itinerary_context())
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "crewai"
    assert body["catalog_validated"] is True
    assert body["accommodation"]["hotel_id"].startswith("htl-manali-")
    assert body["transportation"]["transport_id"] == "trn-manali-002"
    assert body["itinerary_days"][1]["items"][0]["activity_id"].startswith("act-manali-")
    assert body["total_catalog_cost"] > 0
    db = SessionLocal()
    try:
        assert db.query(Trip).count() == before
    finally:
        db.close()


def test_itinerary_validation_budget_unknown_ids_and_inactive_filtering(monkeypatch):
    import backend.api.routes as routes
    from backend.itinerary import service as itinerary_service
    monkeypatch.setattr(routes, "gemini_service", _ItineraryGemini(available=False))
    assert client.post("/api/itinerary/recommendations", json={}).status_code == 422
    assert client.post("/api/itinerary/recommendations", json=_itinerary_context(destination="Atlantis")).status_code == 404
    assert client.post("/api/itinerary/recommendations", json=_itinerary_context(total_budget=1)).status_code == 422

    db = SessionLocal()
    try:
        context = ItineraryContext.model_validate(_itinerary_context())

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, trip_context, catalog):
                return ItineraryCrewOutput.model_validate({
                    "hotel_id": "not-a-catalog-hotel", "transport_id": catalog["transports"][0]["transport_id"],
                    "days": [{"day_number": 1, "activity_ids": []}, {"day_number": 2, "activity_ids": [catalog["activities"][0]["activity_id"]]}, {"day_number": 3, "activity_ids": [catalog["activities"][1]["activity_id"]]}],
                })

        monkeypatch.setattr(itinerary_service, "ItineraryCrew", InvalidCrew)
        with pytest.raises(ItineraryValidationError):
            ItineraryRecommendationService(db, _ItineraryGemini()).execute(context)

        inactive = db.query(Activity).filter(Activity.id == "act-manali-005").one()
        inactive.is_active = False
        db.commit()
        _, _, activities = ItineraryRecommendationService(db, _ItineraryGemini())._filter_candidates(
            db.query(Destination).filter(Destination.name == "Manali").one(), context,
        )
        assert "act-manali-005" not in {item.id for item in activities}
        inactive.is_active = True
        db.commit()
    finally:
        db.close()


def test_itinerary_endpoint_is_registered_in_openapi():
    document = client.get("/openapi.json").json()
    assert "/api/itinerary/recommendations" in document["paths"]


class _TripManagementGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def _management_trip_id():
    db = SessionLocal()
    try:
        return db.query(Trip).filter(Trip.id == "trp-manali-alpine-demo-001").one().id
    finally:
        db.close()


def test_trip_management_api_rebuilds_catalog_cost_without_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.trip import service as trip_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, trip_context, catalog):
            return TripManagementCrewOutput.model_validate({
                "hotel_id": catalog["hotels"][0]["hotel_id"],
                "transport_id": catalog["transports"][0]["transport_id"],
                "activity_ids": [catalog["activities"][0]["activity_id"]],
                "management_notes": ["Ready for an explicit booking route."],
            })

    monkeypatch.setattr(routes, "gemini_service", _TripManagementGemini())
    monkeypatch.setattr(trip_service, "TripManagementCrew", FakeCrew)
    trip_id = _management_trip_id()
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        nights, travelers = max(1, trip.duration_days - 1), trip.traveler_count
        before = (db.query(Trip).count(), db.query(Activity).count(), db.query(TransportOption).count(),
                  db.query(Hotel).count(), db.query(Booking).count())
    finally:
        db.close()
    response = client.post("/api/trips/management/recommendations", json={"trip_id": trip_id})
    assert response.status_code == 200
    body = response.json()
    assert body["trip_id"] == trip_id
    assert body["source"] == "crewai"
    assert body["catalog_validated"] is True
    assert body["accommodation"]["hotel_id"].startswith("htl-manali-")
    assert body["transportation"]["transport_id"].startswith("trn-manali-")
    assert body["activities"][0]["activity_id"].startswith("act-manali-")
    expected = round(
        body["accommodation"]["price_per_night"] * nights
        + body["transportation"]["price"]
        + body["activities"][0]["price_per_person"] * travelers,
        2,
    )
    assert body["total_catalog_cost"] == expected
    db = SessionLocal()
    try:
        after = (db.query(Trip).count(), db.query(Activity).count(), db.query(TransportOption).count(),
                 db.query(Hotel).count(), db.query(Booking).count())
        assert after == before
    finally:
        db.close()


def test_trip_management_validation_unknown_inactive_and_schema(monkeypatch):
    import backend.api.routes as routes
    from backend.trip import service as trip_service
    trip_id = _management_trip_id()
    monkeypatch.setattr(routes, "gemini_service", _TripManagementGemini(available=False))
    assert client.post("/api/trips/management/recommendations", json={}).status_code == 422
    assert client.post("/api/trips/management/recommendations", json={"trip_id": "missing-trip"}).status_code == 404
    assert client.post("/api/trips/management/recommendations", json={"trip_id": trip_id, "unexpected": True}).status_code == 422

    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        context = TripManagementContext(trip_id=trip_id)

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, trip_context, catalog):
                return TripManagementCrewOutput.model_validate({
                    "hotel_id": "not-a-catalog-hotel", "transport_id": catalog["transports"][0]["transport_id"],
                    "activity_ids": [catalog["activities"][0]["activity_id"]], "management_notes": [],
                })

        monkeypatch.setattr(trip_service, "TripManagementCrew", InvalidCrew)
        with pytest.raises(TripManagementValidationError):
            TripManagementService(db, _TripManagementGemini()).execute(context)

        inactive = db.query(Activity).filter(Activity.id == "act-manali-005").one()
        inactive.is_active = False
        db.commit()
        _, _, activities = TripManagementService(db, _TripManagementGemini())._filter_candidates(trip)
        assert "act-manali-005" not in {item.id for item in activities}
        inactive.is_active = True
        db.commit()
    finally:
        db.close()


def test_trip_management_endpoint_is_registered_in_openapi():
    document = client.get("/openapi.json").json()
    assert "/api/trips/management/recommendations" in document["paths"]


class _BookingGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def test_booking_recommendations_use_canonical_items_and_do_not_mutate(monkeypatch):
    import backend.api.routes as routes
    from backend.booking import service as booking_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, trip_context, items):
            return BookingCrewOutput(booking_keys=[item["booking_key"] for item in items], booking_notes=["Ready for explicit booking."])

    monkeypatch.setattr(routes, "gemini_service", _BookingGemini())
    monkeypatch.setattr(booking_service, "BookingRecommendationCrew", FakeCrew)
    trip_id = _management_trip_id()
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        original_budget = trip.total_budget
        trip.total_budget = 200000
        db.commit()
        before = (db.query(Booking).count(), len(trip.itinerary), trip.status)
    finally:
        db.close()
    response = client.post("/api/bookings/recommendations", json={"trip_id": trip_id})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "crewai"
    assert body["catalog_validated"] is True
    assert body["booking_status"] == "ready"
    assert body["existing_booking_count"] >= 1
    assert body["explicit_booking_endpoint"] == f"/api/trips/{trip_id}/lock-booking"
    assert {item["item_type"] for item in body["booking_items"]} == {"hotel", "transport", "activity"}
    expected = round(sum(item["total_catalog_cost"] for item in body["booking_items"]), 2)
    assert body["total_catalog_cost"] == expected
    hotel = next(item for item in body["booking_items"] if item["item_type"] == "hotel")
    assert hotel["existing_booking_reference"] == "TF-MANALI-7782"
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        assert (db.query(Booking).count(), len(trip.itinerary), trip.status) == before
        trip.total_budget = original_budget
        db.commit()
    finally:
        db.close()


def test_booking_recommendations_validate_request_missing_selection_and_over_budget(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _BookingGemini(available=False))
    trip_id = _management_trip_id()
    assert client.post("/api/bookings/recommendations", json={}).status_code == 422
    assert client.post("/api/bookings/recommendations", json={"trip_id": "missing-trip"}).status_code == 404
    assert client.post("/api/bookings/recommendations", json={"trip_id": trip_id, "unexpected": True}).status_code == 422

    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        hotel_item = next(item for item in trip.itinerary if item.hotel_id)
        hotel_item_id = hotel_item.id
        original_hotel_id = hotel_item.hotel_id
        hotel_item.hotel_id = None
        db.commit()
    finally:
        db.close()
    missing = client.post("/api/bookings/recommendations", json={"trip_id": trip_id})
    assert missing.status_code == 200
    assert missing.json()["booking_status"] == "missing_selection"
    assert missing.json()["catalog_validated"] is True
    db = SessionLocal()
    try:
        hotel_item = db.query(ItineraryItem).filter(ItineraryItem.id == hotel_item_id).one()
        hotel_item.hotel_id = original_hotel_id
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        original_budget = trip.total_budget
        trip.total_budget = 1
        db.commit()
    finally:
        db.close()
    over_budget = client.post("/api/bookings/recommendations", json={"trip_id": trip_id})
    assert over_budget.status_code == 200
    assert over_budget.json()["booking_status"] == "over_budget"
    db = SessionLocal()
    try:
        db.query(Trip).filter(Trip.id == trip_id).one().total_budget = original_budget
        db.commit()
    finally:
        db.close()


def test_booking_recommendations_reject_invalid_inactive_capacity_and_crew_output(monkeypatch):
    import backend.api.routes as routes
    from backend.booking import service as booking_service
    trip_id = _management_trip_id()
    monkeypatch.setattr(routes, "gemini_service", _BookingGemini(available=False))
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        activity = next(item for item in trip.itinerary if item.activity_id)
        activity_item_id = activity.id
        original_activity_id = activity.activity_id
        with pytest.raises(BookingRecommendationValidationError):
            BookingRecommendationService(db, _BookingGemini(available=False))._activity(trip, "missing-catalog-activity")
    finally:
        db.close()
    db = SessionLocal()
    try:
        activity = db.query(ItineraryItem).filter(ItineraryItem.id == activity_item_id).one()
        activity.activity_id = original_activity_id
        catalog_activity = db.query(Activity).filter(Activity.id == original_activity_id).one()
        catalog_activity.is_active = False
        db.commit()
    finally:
        db.close()
    assert client.post("/api/bookings/recommendations", json={"trip_id": trip_id}).status_code == 422
    db = SessionLocal()
    try:
        db.query(Activity).filter(Activity.id == original_activity_id).one().is_active = True
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        original_travelers = trip.traveler_count
        trip.traveler_count = 99
        db.commit()
    finally:
        db.close()
    assert client.post("/api/bookings/recommendations", json={"trip_id": trip_id}).status_code == 422
    db = SessionLocal()
    try:
        db.query(Trip).filter(Trip.id == trip_id).one().traveler_count = original_travelers
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        original_budget = trip.total_budget
        trip.total_budget = 200000
        db.commit()

        class InvalidCrew:
            def __init__(self, gemini):
                pass

            def run(self, trip_context, items):
                return BookingCrewOutput(booking_keys=["hotel:not-a-catalog-hotel"], booking_notes=[])

        monkeypatch.setattr(booking_service, "BookingRecommendationCrew", InvalidCrew)
        with pytest.raises(BookingRecommendationValidationError):
            BookingRecommendationService(db, _BookingGemini()).execute(BookingRecommendationContext(trip_id=trip_id))
    finally:
        db.query(Trip).filter(Trip.id == trip_id).one().total_budget = original_budget
        db.commit()
        db.close()


def test_booking_recommendations_malformed_crew_returns_502_and_route_is_registered(monkeypatch):
    import backend.api.routes as routes
    from backend.booking import service as booking_service

    class MalformedCrew:
        def __init__(self, gemini):
            pass

        def run(self, trip_context, items):
            return {"not": "a structured crew output"}

    monkeypatch.setattr(routes, "gemini_service", _BookingGemini())
    monkeypatch.setattr(booking_service, "BookingRecommendationCrew", MalformedCrew)
    trip_id = _management_trip_id()
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        original_budget = trip.total_budget
        trip.total_budget = 200000
        db.commit()
    finally:
        db.close()
    assert client.post("/api/bookings/recommendations", json={"trip_id": trip_id}).status_code == 502
    db = SessionLocal()
    try:
        db.query(Trip).filter(Trip.id == trip_id).one().total_budget = original_budget
        db.commit()
    finally:
        db.close()
    document = client.get("/openapi.json").json()
    assert "/api/bookings/recommendations" in document["paths"]


class _AssistantGemini:
    def __init__(self, available=True):
        self.available = available
        self.api_key = "test-key"

    def is_available(self):
        return self.available


def test_assistant_returns_validated_trip_context_without_mutation(monkeypatch):
    import backend.api.routes as routes
    from backend.assistant import service as assistant_service

    class FakeCrew:
        def __init__(self, gemini):
            pass

        def run(self, message, trip_context):
            return AssistantCrewOutput(response="Your verified itinerary is available.",
                                      referenced_ids=[trip_context["itinerary"][0]["itinerary_item_id"]],
                                      suggested_actions=["Review the itinerary."])

    monkeypatch.setattr(routes, "gemini_service", _AssistantGemini())
    monkeypatch.setattr(assistant_service, "AssistantCrew", FakeCrew)
    trip_id = _management_trip_id()
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        before = (trip.status, len(trip.itinerary), db.query(Booking).filter(Booking.trip_id == trip_id).count())
    finally:
        db.close()
    response = client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "What is planned for tomorrow?"})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "crewai"
    assert body["context_validated"] is True
    assert body["references"][0]["reference_type"] == "itinerary_item"
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        assert (trip.status, len(trip.itinerary), db.query(Booking).filter(Booking.trip_id == trip_id).count()) == before
    finally:
        db.close()


def test_assistant_rejects_invalid_requests_and_returns_grounded_fallback(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _AssistantGemini(available=False))
    trip_id = _management_trip_id()
    assert client.post("/api/assistant/chat", json={}).status_code == 422
    assert client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "   "}).status_code == 422
    assert client.post("/api/assistant/chat", json={"trip_id": "missing-trip", "message": "What is my trip?"}).status_code == 404
    response = client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "What are my current trip preferences?"})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "catalog_fallback"
    assert body["context_validated"] is True
    assert "interests" in body["response"]


def test_assistant_grounded_fallback_answers_cost_booking_and_day_questions(monkeypatch):
    import backend.api.routes as routes
    monkeypatch.setattr(routes, "gemini_service", _AssistantGemini(available=False))
    trip_id = _management_trip_id()

    cost = client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "How much is my current trip estimated to cost?"})
    assert cost.status_code == 200
    assert cost.json()["context_validated"] is True
    assert "75,000" in cost.json()["response"]
    assert "48,800" in cost.json()["response"]

    bookings = client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "What reservations currently exist?"})
    assert bookings.status_code == 200
    assert "1 recorded booking" in bookings.json()["response"]

    day = client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "What can I do on Day 3?"})
    assert day.status_code == 200
    assert "Rohtang Pass" in day.json()["response"]


def test_assistant_rejects_invalid_catalog_context_and_malformed_crew(monkeypatch):
    import backend.api.routes as routes
    from backend.assistant import service as assistant_service
    trip_id = _management_trip_id()
    monkeypatch.setattr(routes, "gemini_service", _AssistantGemini(available=False))
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).one()
        activity_id = next(item.activity_id for item in trip.itinerary if item.activity_id)
        activity = db.query(Activity).filter(Activity.id == activity_id).one()
        activity.is_active = False
        db.commit()
    finally:
        db.close()
    assert client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "What activities are planned?"}).status_code == 422
    db = SessionLocal()
    try:
        db.query(Activity).filter(Activity.id == activity_id).one().is_active = True
        db.commit()
    finally:
        db.close()

    class MalformedCrew:
        def __init__(self, gemini):
            pass

        def run(self, message, trip_context):
            return {"not": "a structured assistant output"}

    monkeypatch.setattr(routes, "gemini_service", _AssistantGemini())
    monkeypatch.setattr(assistant_service, "AssistantCrew", MalformedCrew)
    assert client.post("/api/assistant/chat", json={"trip_id": trip_id, "message": "Summarize my trip."}).status_code == 502
    document = client.get("/openapi.json").json()
    assert "/api/assistant/chat" in document["paths"]


def test_operator_ai_assistant_routes_trip_id_through_agent8_service(monkeypatch):
    import backend.api.routes as routes

    calls = []

    class FakeAssistantService:
        def __init__(self, db, gemini):
            self.db = db
            self.gemini = gemini

        def execute(self, context):
            calls.append(context)
            return AssistantChatResult(
                trip_id=context.trip_id,
                message=context.message,
                response="Grounded response for the persisted Manali trip.",
                suggested_actions=["Review the validated trip context."],
                source="catalog_fallback",
                context_validated=True,
            )

    monkeypatch.setattr(routes, "AssistantService", FakeAssistantService)
    trip_id = _management_trip_id()
    response = client.post("/api/operator/ai-assistant", json={"trip_id": trip_id, "message": "Summarize this trip."})

    assert response.status_code == 200
    body = response.json()
    assert calls and calls[0].trip_id == trip_id
    assert isinstance(calls[0], AssistantChatContext)
    assert body["reply"] == "Grounded response for the persisted Manali trip."
    assert body["trip_id"] == trip_id
    assert body["source"] == "catalog_fallback"
    assert body["context_validated"] is True
    assert body["suggested_actions"] == ["Review the validated trip context."]


def test_operator_ai_assistant_routes_current_trip_id_through_agent8_service(monkeypatch):
    import backend.api.routes as routes

    calls = []

    class FakeAssistantService:
        def __init__(self, db, gemini):
            pass

        def execute(self, context):
            calls.append(context)
            return AssistantChatResult(
                trip_id=context.trip_id,
                message=context.message,
                response="Grounded response from current_trip id.",
                source="catalog_fallback",
                context_validated=True,
            )

    monkeypatch.setattr(routes, "AssistantService", FakeAssistantService)
    trip_id = _management_trip_id()
    response = client.post("/api/operator/ai-assistant", json={
        "message": "What is planned on Day 3?",
        "current_trip": {"id": trip_id, "title": "Client supplied but DB reloaded"},
    })

    assert response.status_code == 200
    body = response.json()
    assert calls and calls[0].trip_id == trip_id
    assert calls[0].message == "What is planned on Day 3?"
    assert body["reply"] == "Grounded response from current_trip id."
    assert body["context_validated"] is True


# ---------------------------------------------------------------------------
# Trip hotel contract: selected_accommodation + alternatives from canonical data
# ---------------------------------------------------------------------------
_HOTEL_OPTION_KEYS = {
    "id", "name", "rating", "review_count", "category", "location",
    "room_type", "price_per_night", "total_price", "nights", "amenities",
    "why_it_matches", "hero_image", "images", "badge",
}


def _create_hotel_contract_trip():
    dest_res = client.get("/api/destinations/manali")
    manali_id = dest_res.json()["id"]
    payload = {
        "title": "Hotel Contract Trip", "destination_id": manali_id,
        "duration_days": 3, "total_budget": 60000.0, "currency": "INR",
        "traveler_count": 2, "pace": "balanced",
        "preferences": {
            "budget_tier": "luxury", "interests": ["snow"],
            "travel_companions": "couple",
        },
    }
    create_res = client.post("/api/trips", json=payload)
    assert create_res.status_code == 200
    return create_res.json()


def test_trip_response_includes_selected_accommodation_contract():
    trip = _create_hotel_contract_trip()
    selected = trip["selected_accommodation"]
    assert selected is not None
    assert _HOTEL_OPTION_KEYS.issubset(set(selected.keys()))
    assert selected["badge"] == "best_match"
    assert selected["nights"] == 2
    assert selected["total_price"] == pytest.approx(selected["price_per_night"] * 2)
    assert isinstance(selected["amenities"], list) and isinstance(selected["images"], list)

    alternatives = trip["accommodation_alternatives"]
    assert isinstance(alternatives, list) and len(alternatives) >= 1
    assert selected["id"] not in [a["id"] for a in alternatives]
    for alt in alternatives:
        assert _HOTEL_OPTION_KEYS.issubset(set(alt.keys()))

    daily = trip["daily_accommodations"]
    assert isinstance(daily, list) and len(daily) >= 1
    assert daily[0]["hotel"]["id"] == selected["id"]

    get_res = client.get(f"/api/trips/{trip['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["selected_accommodation"]["id"] == selected["id"]


def test_change_accommodation_updates_selected_accommodation():
    trip = _create_hotel_contract_trip()
    target_id = trip["accommodation_alternatives"][0]["id"]
    change_res = client.post(
        f"/api/trips/{trip['id']}/change-accommodation", json={"accommodation_id": target_id}
    )
    assert change_res.status_code == 200
    updated = change_res.json()
    assert updated["selected_accommodation"]["id"] == target_id
    assert target_id not in [a["id"] for a in updated["accommodation_alternatives"]]


def test_change_daily_accommodation_updates_day_hotel():
    trip = _create_hotel_contract_trip()
    target_id = trip["accommodation_alternatives"][0]["id"]
    change_res = client.post(
        f"/api/trips/{trip['id']}/change-day-accommodation",
        json={"day_number": 2, "accommodation_id": target_id},
    )
    assert change_res.status_code == 200
    daily = {d["day_number"]: d["hotel"]["id"] for d in change_res.json()["daily_accommodations"]}
    assert daily[2] == target_id


def test_trip_without_usable_hotel_items_returns_null_selection():
    trip = _create_hotel_contract_trip()
    trip_id = trip["id"]
    db = SessionLocal()
    try:
        db.query(ItineraryItem).filter(
            ItineraryItem.trip_id == trip_id, ItineraryItem.item_type == "hotel"
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    get_res = client.get(f"/api/trips/{trip_id}")
    assert get_res.status_code == 200
    body = get_res.json()
    assert body["selected_accommodation"] is None
    assert body["daily_accommodations"] == []
    assert isinstance(body["accommodation_alternatives"], list)


# ---------------------------------------------------------------------------
# Live SerpApi hotel search (mocked transport; never hits the real API)
# ---------------------------------------------------------------------------
from backend.database.config import settings as _settings  # noqa: E402


def _serpapi_property(**overrides):
    prop = {
        "property_token": "ChoQ5YiTp-rKmO60ARoNL2cvMTFzc2djMTNqcRAC",
        "name": "Himalayan Ridge Live Hotel",
        "gps_coordinates": {"latitude": 32.2396, "longitude": 77.1887},
        "rate_per_night": {"lowest": "$152", "extracted_lowest": 152},
        "total_rate": {"lowest": "$456", "extracted_lowest": 456},
        "prices": [{"source": "Expedia", "rate_per_night": {"extracted_lowest": 152}}],
        "images": [{"thumbnail": "https://example.test/t.jpg",
                    "original_image": "https://example.test/o.jpg"}],
        "overall_rating": 4.5,
        "reviews": 12098,
        "location_rating": 4.0,
        "amenities": ["Spa", "Free WiFi"],
        "hotel_class": 4,
        "type": "Hotel",
        "essential_info": ["Check-in 2PM", "Ski-in access"],
    }
    prop.update(overrides)
    return prop


class _FakeSerpApiResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _mock_serpapi(monkeypatch, payload, key="test-serpapi-key"):
    import backend.hotels.service as hotel_service

    calls = {}
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", key)

    def fake_get(url, params, timeout):
        calls["url"] = url
        calls["params"] = params
        return _FakeSerpApiResponse(payload)

    monkeypatch.setattr(hotel_service, "_http_get", fake_get)
    return calls


def _search_params(**overrides):
    params = {"destination": "Manali", "check_in_date": "2026-10-01", "check_out_date": "2026-10-04"}
    params.update(overrides)
    return params


def test_serpapi_search_success_and_mapping(monkeypatch):
    calls = _mock_serpapi(monkeypatch, {"properties": [
        _serpapi_property(),
        _serpapi_property(property_token="tok-2", name="Second Stay", overall_rating=4.0),
    ]})
    response = client.get("/api/hotels/search", params=_search_params())
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "serpapi"
    assert body["destination"] == "Manali"
    assert "manali" in calls["url"] or "search" in calls["url"]
    assert calls["params"]["engine"] == "google_hotels"
    assert calls["params"]["q"] == "Manali"
    assert "api_key" not in str(calls["url"])
    assert len(body["results"]) == 2
    first = body["results"][0]
    assert first["property_token"] == "ChoQ5YiTp-rKmO60ARoNL2cvMTFzc2djMTNqcRAC"
    assert first["name"] == "Himalayan Ridge Live Hotel"
    assert first["rating"] == pytest.approx(4.5)
    assert first["reviews_count"] == 12098
    assert first["latitude"] == pytest.approx(32.2396)
    assert first["image_url"] == "https://example.test/o.jpg"
    assert first["price_per_night"] == pytest.approx(152.0)
    assert first["total_price"] == pytest.approx(456.0)
    assert first["currency"] == "INR"
    assert first["amenities"] == ["Spa", "Free WiFi"]
    assert first["hotel_class"] == 4
    assert first["source"] == "serpapi"


def test_serpapi_missing_fields_and_malformed_records(monkeypatch):
    _mock_serpapi(monkeypatch, {"properties": [
        {"name": "Name Only Stay"},
        {"hotel_class": 5},
        "not-a-record",
        None,
    ]})
    response = client.get("/api/hotels/search", params=_search_params())
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    only = results[0]
    assert only["name"] == "Name Only Stay"
    assert only["price_per_night"] is None and only["rating"] is None
    assert only["image_url"] is None and only["hotel_class"] is None


def test_serpapi_invalid_dates_and_missing_destination(monkeypatch):
    _mock_serpapi(monkeypatch, {"properties": []})
    assert client.get("/api/hotels/search", params=_search_params(
        check_in_date="10-01-2026")).status_code == 422
    assert client.get("/api/hotels/search", params=_search_params(
        check_in_date="2026-10-04", check_out_date="2026-10-01")).status_code == 422
    assert client.get("/api/hotels/search", params={
        "check_in_date": "2026-10-01", "check_out_date": "2026-10-04"}).status_code == 422


def test_serpapi_empty_results(monkeypatch):
    _mock_serpapi(monkeypatch, {"properties": []})
    response = client.get("/api/hotels/search", params=_search_params())
    assert response.status_code == 200
    assert response.json()["results"] == []


def test_serpapi_error_and_timeout(monkeypatch):
    import httpx
    import backend.hotels.service as hotel_service

    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "test-serpapi-key")

    def boom(url, params, timeout):
        raise httpx.ConnectError("blocked")

    monkeypatch.setattr(hotel_service, "_http_get", boom)
    assert client.get("/api/hotels/search", params=_search_params()).status_code == 502

    def slow(url, params, timeout):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr(hotel_service, "_http_get", slow)
    assert client.get("/api/hotels/search", params=_search_params()).status_code == 502

    def api_error(url, params, timeout):
        return _FakeSerpApiResponse({"error": "Invalid API key"})

    monkeypatch.setattr(hotel_service, "_http_get", api_error)
    assert client.get("/api/hotels/search", params=_search_params()).status_code == 502


def test_serpapi_missing_key_returns_503_without_call(monkeypatch):
    import backend.hotels.service as hotel_service

    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "")

    def must_not_run(url, params, timeout):
        raise AssertionError("SerpApi must not be called without a key")

    monkeypatch.setattr(hotel_service, "_http_get", must_not_run)
    response = client.get("/api/hotels/search", params=_search_params())
    assert response.status_code == 503


def test_serpapi_key_never_in_frontend():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    offenders = []
    for root, _, files in os.walk(os.path.join(repo, "src")):
        for filename in files:
            if filename.endswith((".ts", ".tsx")):
                path = os.path.join(root, filename)
                with open(path, encoding="utf-8") as handle:
                    if "SERPAPI_API_KEY" in handle.read():
                        offenders.append(path)
    assert offenders == []


def test_select_hotel_persists_and_survives_refresh(monkeypatch):
    _mock_serpapi(monkeypatch, {"properties": [_serpapi_property()]})
    search_res = client.get("/api/hotels/search", params=_search_params())
    hotel = search_res.json()["results"][0]

    trip = _create_hotel_contract_trip()
    select_res = client.post(f"/api/trips/{trip['id']}/select-hotel", json={
        "day_number": 2, "property_token": hotel["property_token"], "name": hotel["name"],
        "location": "Manali", "image_url": hotel["image_url"], "price_per_night": hotel["price_per_night"],
        "total_price": hotel["total_price"], "currency": hotel["currency"], "rating": hotel["rating"],
        "hotel_class": hotel["hotel_class"], "amenities": hotel["amenities"],
        "check_in_date": "2026-10-01", "check_out_date": "2026-10-04",
    })
    assert select_res.status_code == 200

    # Fresh read (as after a page refresh) shows the selection in the itinerary.
    get_res = client.get(f"/api/trips/{trip['id']}")
    assert get_res.status_code == 200
    hotel_items = [i for i in get_res.json()["itinerary"]
                   if i["item_type"] == "hotel" and (i.get("meta_data") or {}).get("provider") == "serpapi"]
    assert len(hotel_items) == 1
    item = hotel_items[0]
    assert item["title"] == "Himalayan Ridge Live Hotel"
    assert item["day_number"] == 2
    assert item["meta_data"]["property_token"] == "ChoQ5YiTp-rKmO60ARoNL2cvMTFzc2djMTNqcRAC"
    assert item["meta_data"]["check_in_date"] == "2026-10-01"
    # Catalog-backed selection contract still intact.
    assert get_res.json()["selected_accommodation"] is not None


# ---------------------------------------------------------------------------
# Live places/attractions (mocked transports; never hits real providers)
# ---------------------------------------------------------------------------
def _overpass_payload():
    return {"elements": [
        {"type": "node", "id": 1, "lat": 26.85, "lon": 80.94,
         "tags": {"name": "Bara Imambara", "tourism": "attraction"}},
        {"type": "node", "id": 2, "lat": 26.86, "lon": 80.95,
         "tags": {"tourism": "museum"}},  # nameless: skipped
        "not-an-element",
        {"type": "way", "id": 3, "center": {"lat": 26.87, "lon": 80.96},
         "tags": {"name": "Hazratganj Park", "leisure": "park"}},
    ]}


def _commons_payload():
    return {"query": {"pages": {
        "1": {"imageinfo": [{"thumburl": "https://upload.wikimedia.org/live-a.jpg"}]},
        "2": {"imageinfo": [{"url": "https://upload.wikimedia.org/live-b.jpg"}]},
        "3": {"imageinfo": [{"url": "https://example.test/fake.jpg"}]},
    }}}


class _FakeProviderResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_places_live_catalog_destination(monkeypatch):
    import backend.places.service as places_service

    def fake_post(url, data=None, timeout=None, headers=None):
        return _FakeProviderResponse(_overpass_payload())

    def fake_get(url, params=None, timeout=None, headers=None):
        return _FakeProviderResponse(_commons_payload())

    monkeypatch.setattr(places_service.httpx, "post", fake_post)
    monkeypatch.setattr(places_service.httpx, "get", fake_get)
    response = client.get("/api/places/live", params={"destination": "Manali", "limit": 5})
    assert response.status_code == 200
    body = response.json()
    assert body["destination"] == "Manali"
    assert body["latitude"] == pytest.approx(32.2396)
    assert body["source"] == "overpass+commons"
    names = [p["name"] for p in body["places"]]
    assert "Bara Imambara" in names and "Hazratganj Park" in names
    assert all(p["image_url"] and p["image_url"].startswith("https://upload.wikimedia.org")
               for p in body["places"])


def test_places_live_unknown_destination_geocoded(monkeypatch):
    import backend.places.service as places_service

    seen = {}

    def fake_get(url, params=None, timeout=None, headers=None):
        if url.endswith("/search"):
            seen["geocode_q"] = params["q"]
            return _FakeProviderResponse([{"lat": "26.85", "lon": "80.94",
                                           "display_name": "Uttar Pradesh, India"}])
        return _FakeProviderResponse(_commons_payload())

    def fake_post(url, data=None, timeout=None, headers=None):
        seen["overpass_q"] = data["data"]
        return _FakeProviderResponse(_overpass_payload())

    monkeypatch.setattr(places_service.httpx, "get", fake_get)
    monkeypatch.setattr(places_service.httpx, "post", fake_post)
    response = client.get("/api/places/live", params={"destination": "Uttar Pradesh"})
    assert response.status_code == 200
    body = response.json()
    assert seen["geocode_q"] == "Uttar Pradesh"
    assert "26.85" in seen["overpass_q"]
    assert len(body["places"]) == 2


def test_places_live_all_providers_fail_returns_empty(monkeypatch):
    import backend.places.service as places_service

    def boom(*args, **kwargs):
        raise RuntimeError("blocked")

    monkeypatch.setattr(places_service.httpx, "get", boom)
    monkeypatch.setattr(places_service.httpx, "post", boom)
    response = client.get("/api/places/live", params={"destination": "Uttar Pradesh"})
    assert response.status_code == 200
    assert response.json()["places"] == []
    assert client.get("/api/places/live").status_code == 422


def test_places_service_never_raises(monkeypatch):
    from backend.places import service as places_service

    def boom(*args, **kwargs):
        raise RuntimeError("blocked")

    monkeypatch.setattr(places_service.httpx, "get", boom)
    monkeypatch.setattr(places_service.httpx, "post", boom)
    assert places_service.geocode_place("X", "http://x", 1) is None
    assert places_service.fetch_attractions(0, 0, "http://x", 1, 1, 1) == []
    assert places_service.fetch_place_images(0, 0, "http://x", 1, 1, 1) == []
    result = places_service.get_live_places("Nowhere", None, None, 5,
                                            "http://x", "http://x", "http://x", 1, 1)
    assert result["places"] == []


# ---------------------------------------------------------------------------
# Live SerpApi restaurant search (mocked transport; never hits the real API)
# ---------------------------------------------------------------------------
def _serpapi_restaurant(**overrides):
    entry = {
        "title": "Riverbank Live Kitchen",
        "place_id": "ChIJtest-place-001",
        "address": "Mall Road, Manali",
        "rating": 4.5,
        "reviews": 2314,
        "gps_coordinates": {"latitude": 32.2396, "longitude": 77.1887},
        "thumbnail": "https://example.test/restaurant.jpg",
        "website": "https://example.test/kitchen",
        "phone": "+91-11111-22222",
        "hours": "Mon-Sun 11:00 AM - 10:30 PM",
        "types": ["restaurant", "food"],
    }
    entry.update(overrides)
    return entry


def _mock_restaurants(monkeypatch, payload, key="test-serpapi-key"):
    import backend.restaurants.service as restaurant_service

    calls = {}
    restaurant_service.clear_restaurant_cache()
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", key)

    def fake_get(url, params, timeout):
        calls["url"] = url
        calls["params"] = params
        calls["count"] = calls.get("count", 0) + 1
        return _FakeSerpApiResponse(payload)

    monkeypatch.setattr(restaurant_service, "_http_get", fake_get)
    return calls


def _restaurant_params(**overrides):
    params = {"destination": "Manali"}
    params.update(overrides)
    return params


def test_restaurants_search_success_and_mapping(monkeypatch):
    calls = _mock_restaurants(monkeypatch, {"local_results": [
        _serpapi_restaurant(),
        _serpapi_restaurant(title="Hillside Live Diner", place_id="ChIJtest-place-002", rating=4.1),
    ]})
    response = client.get("/api/restaurants/search", params=_restaurant_params())
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "serpapi"
    assert body["destination"] == "Manali"
    assert calls["params"]["engine"] == "google_maps"
    assert calls["params"]["type"] == "search"
    assert "Restaurants in Manali" in calls["params"]["q"]
    assert "api_key" not in str(calls["url"])
    assert len(body["results"]) == 2
    first = body["results"][0]
    assert first["name"] == "Riverbank Live Kitchen"
    assert first["place_id"] == "ChIJtest-place-001"
    assert first["address"] == "Mall Road, Manali"
    assert first["rating"] == pytest.approx(4.5)
    assert first["reviews_count"] == 2314
    assert first["latitude"] == pytest.approx(32.2396)
    assert first["image_url"] == "https://example.test/restaurant.jpg"
    assert first["website"] == "https://example.test/kitchen"
    assert first["hours"] == "Mon-Sun 11:00 AM - 10:30 PM"
    assert first["source"] == "serpapi"


def test_restaurants_missing_fields_and_malformed_records(monkeypatch):
    _mock_restaurants(monkeypatch, {"local_results": [
        {"title": "Name Only Eatery"},
        {"rating": 4.0},
        "not-a-record",
        None,
    ]})
    response = client.get("/api/restaurants/search", params=_restaurant_params())
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    only = results[0]
    assert only["name"] == "Name Only Eatery"
    assert only["rating"] is None and only["address"] is None
    assert only["image_url"] is None and only["website"] is None


def test_restaurants_invalid_meal_and_missing_destination(monkeypatch):
    _mock_restaurants(monkeypatch, {"local_results": []})
    assert client.get("/api/restaurants/search",
                      params=_restaurant_params(meal_type="supper")).status_code == 422
    assert client.get("/api/restaurants/search").status_code == 422


def test_restaurants_empty_results_and_error_paths(monkeypatch):
    import httpx
    import backend.restaurants.service as restaurant_service

    _mock_restaurants(monkeypatch, {"local_results": []})
    assert client.get("/api/restaurants/search", params=_restaurant_params()).json()["results"] == []

    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "test-serpapi-key")
    restaurant_service.clear_restaurant_cache()

    def boom(url, params, timeout):
        raise httpx.ConnectError("blocked")

    monkeypatch.setattr(restaurant_service, "_http_get", boom)
    assert client.get("/api/restaurants/search", params=_restaurant_params()).status_code == 502

    def api_error(url, params, timeout):
        return _FakeSerpApiResponse({"error": "Invalid API key"})

    monkeypatch.setattr(restaurant_service, "_http_get", api_error)
    assert client.get("/api/restaurants/search", params=_restaurant_params()).status_code == 502


def test_restaurants_missing_key_returns_503_without_call(monkeypatch):
    import backend.restaurants.service as restaurant_service

    restaurant_service.clear_restaurant_cache()
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "")

    def must_not_run(url, params, timeout):
        raise AssertionError("SerpApi must not be called without a key")

    monkeypatch.setattr(restaurant_service, "_http_get", must_not_run)
    assert client.get("/api/restaurants/search", params=_restaurant_params()).status_code == 503


def test_restaurant_gemini_selection_validation():
    from backend.restaurants.service import (
        select_best_candidate, validate_gemini_selection, rank_with_gemini,
    )

    candidates = [_serpapi_restaurant(), _serpapi_restaurant(
        title="Second", place_id="ChIJtest-place-002", rating=4.1)]
    normalized = [
        {"id": "serpapi-restaurant-ChIJtest-place-001", "place_id": "ChIJtest-place-001",
         "name": "Riverbank Live Kitchen", "rating": 4.5, "reviews_count": 10},
        {"id": "serpapi-restaurant-ChIJtest-place-002", "place_id": "ChIJtest-place-002",
         "name": "Second", "rating": 4.1, "reviews_count": 5},
    ]
    # Hallucinated IDs are rejected; deterministic fallback is a real candidate.
    assert validate_gemini_selection(normalized, "serpapi-restaurant-invented-999") is None
    assert validate_gemini_selection(normalized, "  ") is None
    assert validate_gemini_selection(
        normalized, "serpapi-restaurant-ChIJtest-place-002")["name"] == "Second"
    assert select_best_candidate(normalized)["name"] == "Riverbank Live Kitchen"
    assert select_best_candidate([]) is None
    # Without Gemini configured, ranking falls back to provider order.
    selected, source = rank_with_gemini(normalized, None, {"meal": "dinner"})
    assert selected["name"] == "Riverbank Live Kitchen" and source == "serpapi"
    assert {c["title"] for c in candidates} == {"Riverbank Live Kitchen", "Second"}


def test_restaurants_deduplicate_searches_with_cache(monkeypatch):
    calls = _mock_restaurants(monkeypatch, {"local_results": [_serpapi_restaurant()]})
    assert client.get("/api/restaurants/search", params=_restaurant_params()).status_code == 200
    assert client.get("/api/restaurants/search", params=_restaurant_params()).status_code == 200
    assert calls["count"] == 1


def test_no_hardcoded_restaurant_data_in_service():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(repo, "backend", "restaurants", "service.py")
    with open(path, encoding="utf-8") as handle:
        source = handle.read().lower()
    banned_chains = ["mcdonald", "starbucks", "dominos", "pizza hut", "kfc",
                     "quanjude", "keventers", "bukhara", "karim"]
    assert not any(chain in source for chain in banned_chains)
    assert "local_results" in source and "google_maps" in source


def test_no_hardcoded_restaurant_data_in_service():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(repo, "backend", "restaurants", "service.py")
    with open(path, encoding="utf-8") as handle:
        source = handle.read().lower()
    banned_chains = ["mcdonald", "starbucks", "dominos", "pizza hut", "kfc",
                     "quanjude", "keventers", "bukhara", "karim"]
    assert not any(chain in source for chain in banned_chains)
    assert "local_results" in source and "google_maps" in source


# ---------------------------------------------------------------------------
# Operations consoles: hotels dispatch (assignments, rooms, properties)
# ---------------------------------------------------------------------------
def _ops_approve(trip_id):
    response = client.post(f"/api/ops/trips/{trip_id}/approve", json={})
    assert response.status_code == 200
    return response.json()
def _ops_hotel_id(destination_name="Manali"):
    from backend.database.connection import SessionLocal
    from backend.models.models import Destination, Hotel
    db = SessionLocal()
    try:
        dest = db.query(Destination).filter(Destination.name == destination_name).first()
        assert dest is not None
        hotel = db.query(Hotel).filter(
            Hotel.destination_id == dest.id, Hotel.is_active == True).first()  # noqa: E712
        assert hotel is not None
        return hotel.id, hotel.name
    finally:
        db.close()


def test_ops_properties_come_from_database():
    response = client.get("/api/ops/properties")
    assert response.status_code == 200
    body = response.json()
    assert len(body) > 0
    names = [p["name"] for p in body]
    assert any("Manali" in (p.get("destination_name") or "") for p in body)
    first = body[0]
    assert first["assigned_trip_count"] == len(first["assigned_trip_ids"])
    assert first["price_per_night"] > 0


def test_ops_accommodation_lifecycle_and_status_rules(monkeypatch):
    hotel_id, _ = _ops_hotel_id()
    trip_id = "ops-trip-hotels-001"
    _ops_approve(trip_id)
    _ops_approve("ops-trip-hotels-404")

    # Assign with rooms -> assigned
    created = client.post("/api/ops/accommodations", json={
        "trip_id": trip_id, "hotel_id": hotel_id, "rooms": 2,
        "room_type": "Deluxe", "check_in_date": "2026-11-01", "check_out_date": "2026-11-04",
    })
    assert created.status_code == 201
    assert created.json()["status"] == "assigned"
    assert created.json()["hotel"]["id"] == hotel_id

    # Duplicate POST -> 409
    assert client.post("/api/ops/accommodations", json={
        "trip_id": trip_id, "hotel_id": hotel_id}).status_code == 409

    # Unknown property -> 404
    assert client.post("/api/ops/accommodations", json={
        "trip_id": "ops-trip-hotels-404", "hotel_id": "no-such-hotel"}).status_code == 404

    # Blank trip -> 422
    assert client.post("/api/ops/accommodations", json={
        "trip_id": "  ", "hotel_id": hotel_id}).status_code == 422

    # Remove rooms -> issue (missing required allocation)
    updated = client.put(f"/api/ops/accommodations/{trip_id}/rooms", json={"rooms": 0})
    assert updated.status_code == 200
    assert updated.json()["status"] == "issue"

    # Restore rooms -> assigned again
    restored = client.put(f"/api/ops/accommodations/{trip_id}/rooms",
                          json={"rooms": 1, "room_type": "Suite"})
    assert restored.json()["status"] == "assigned"
    assert restored.json()["room_type"] == "Suite"

    # Manual flag and resolve
    flagged = client.post(f"/api/ops/accommodations/{trip_id}/flag-issue",
                          json={"reason": "Overbooked for Diwali week"})
    assert flagged.json()["status"] == "issue"
    assert "Diwali" in flagged.json()["issue_reason"]
    resolved = client.post(f"/api/ops/accommodations/{trip_id}/resolve-issue", json={})
    assert resolved.json()["status"] == "assigned"

    # Change to no hotel -> pending
    changed = client.put(f"/api/ops/accommodations/{trip_id}", json={"hotel_id": None})
    assert changed.json()["status"] == "pending"

    # Get single + filtered list
    assert client.get(f"/api/ops/accommodations/{trip_id}").status_code == 200
    assigned_only = client.get("/api/ops/accommodations", params={"status": "assigned"})
    assert all(a["status"] == "assigned" for a in assigned_only.json())
    assert client.get("/api/ops/accommodations/no-such-trip").status_code == 404


def test_ops_property_trips_two_way_relationship():
    hotel_id, hotel_name = _ops_hotel_id()
    trip_id = "ops-trip-hotels-002"
    _ops_approve(trip_id)
    created = client.post("/api/ops/accommodations", json={
        "trip_id": trip_id, "hotel_id": hotel_id, "rooms": 1})
    assert created.status_code == 201

    detail = client.get(f"/api/ops/properties/{hotel_id}/trips")
    assert detail.status_code == 200
    assert detail.json()["hotel"]["name"] == hotel_name
    assert trip_id in [a["trip_id"] for a in detail.json()["assignments"]]

    props = client.get("/api/ops/properties").json()
    row = next(p for p in props if p["id"] == hotel_id)
    assert trip_id in row["assigned_trip_ids"]
    assert row["assigned_trip_count"] >= 1
    assert client.get("/api/ops/properties/no-such-hotel/trips").status_code == 404


# ---------------------------------------------------------------------------
# Operations consoles: transport dispatch (fleet, assignments, lifecycle)
# ---------------------------------------------------------------------------
def _ops_vehicle_and_driver():
    vehicles = client.get("/api/ops/vehicles").json()
    drivers = client.get("/api/ops/drivers").json()
    assert len(vehicles) > 0 and len(drivers) > 0
    assert all(v["registration_number"] for v in vehicles)
    assert all(d["name"] for d in drivers)
    return vehicles[0]["id"], drivers[0]["id"]


def test_ops_fleet_inventory_and_onboarding():
    vehicles = client.get("/api/ops/vehicles").json()
    assert any(v["capacity"] >= 1 for v in vehicles)

    created = client.post("/api/ops/vehicles", json={
        "name": "Ops Test Van", "registration_number": "HP99-OPS-0001",
        "vehicle_type": "private_cab", "capacity": 7})
    assert created.status_code == 201
    assert created.json()["is_active"] is True

    dup = client.post("/api/ops/vehicles", json={
        "name": "Ops Test Van 2", "registration_number": "HP99-OPS-0001"})
    assert dup.status_code == 409

    driver = client.post("/api/ops/drivers", json={
        "name": "Ops Test Driver", "phone": "+91 90000 00001"})
    assert driver.status_code == 201
    assert driver.json()["name"] == "Ops Test Driver"
    assert client.post("/api/ops/drivers", json={"name": "  "}).status_code == 422


def test_ops_transport_lifecycle_and_conflicts():
    vehicle_id, driver_id = _ops_vehicle_and_driver()
    trip_a = "ops-trip-transport-001"
    trip_b = "ops-trip-transport-002"
    _ops_approve(trip_a)
    _ops_approve(trip_b)
    _ops_approve("ops-trip-x")

    created = client.post("/api/ops/transport", json={
        "trip_id": trip_a, "vehicle_id": vehicle_id, "driver_id": driver_id,
        "origin": "Delhi", "destination": "Manali",
        "pickup_at": "2026-11-01T09:00:00", "dropoff_at": "2026-11-01T18:00:00"})
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "assigned"
    assert body["vehicle"]["registration_number"]
    assert body["driver"]["name"]

    # Same vehicle overlapping window on another trip -> 409
    conflict = client.post("/api/ops/transport", json={
        "trip_id": trip_b, "vehicle_id": vehicle_id,
        "origin": "Delhi", "destination": "Shimla",
        "pickup_at": "2026-11-01T12:00:00", "dropoff_at": "2026-11-01T20:00:00"})
    assert conflict.status_code == 409

    # Same driver overlapping window -> 409
    vehicles = client.get("/api/ops/vehicles").json()
    other_vehicle = next(v["id"] for v in vehicles if v["id"] != vehicle_id)
    driver_conflict = client.post("/api/ops/transport", json={
        "trip_id": trip_b, "vehicle_id": other_vehicle, "driver_id": driver_id,
        "pickup_at": "2026-11-01T12:00:00", "dropoff_at": "2026-11-01T20:00:00"})
    assert driver_conflict.status_code == 409

    # Non-overlapping window on another trip is fine
    ok = client.post("/api/ops/transport", json={
        "trip_id": trip_b, "vehicle_id": vehicle_id, "driver_id": driver_id,
        "pickup_at": "2026-11-03T09:00:00", "dropoff_at": "2026-11-03T18:00:00"})
    assert ok.status_code == 201

    # Unknown vehicle/driver -> 404
    assert client.post("/api/ops/transport", json={
        "trip_id": "ops-trip-x", "vehicle_id": "no-such-vehicle"}).status_code == 404
    assert client.post("/api/ops/transport", json={
        "trip_id": "ops-trip-x", "driver_id": "no-such-driver"}).status_code == 404

    # Bad window ordering -> 422
    assert client.post("/api/ops/transport", json={
        "trip_id": "ops-trip-x", "pickup_at": "2026-11-05T10:00:00",
        "dropoff_at": "2026-11-05T09:00:00"}).status_code == 422

    # Timing update persists and revalidates windows
    timing = client.put(f"/api/ops/transport/{trip_b}/timing", json={
        "pickup_at": "2026-11-04T09:00:00", "dropoff_at": "2026-11-04T18:00:00"})
    assert timing.status_code == 200
    assert timing.json()["pickup_at"].startswith("2026-11-04")

    # Lifecycle: assigned -> en_route -> delayed (reason required) -> resolve -> completed
    assert client.post(f"/api/ops/transport/{trip_a}/status",
                       json={"to_status": "en_route"}).json()["status"] == "en_route"
    assert client.post(f"/api/ops/transport/{trip_a}/status",
                       json={"to_status": "delayed"}).status_code == 422
    delayed = client.post(f"/api/ops/transport/{trip_a}/status",
                          json={"to_status": "delayed", "delay_reason": "Landslide on NH-3"})
    assert delayed.json()["status"] == "delayed"
    assert "Landslide" in delayed.json()["delay_reason"]
    resolved = client.post(f"/api/ops/transport/{trip_a}/status",
                           json={"to_status": "en_route"})
    assert resolved.json()["status"] == "en_route"
    assert resolved.json()["delay_reason"] is None
    completed = client.post(f"/api/ops/transport/{trip_a}/status",
                            json={"to_status": "completed"})
    assert completed.json()["status"] == "completed"

    # Terminal state rejects further moves; illegal jumps rejected
    assert client.post(f"/api/ops/transport/{trip_a}/status",
                       json={"to_status": "en_route"}).status_code == 422
    assert client.post(f"/api/ops/transport/{trip_b}/status",
                       json={"to_status": "completed"}).status_code in (200, 422)

    # Filtered list + single fetch + missing trip
    delayed_only = client.get("/api/ops/transport", params={"status": "delayed"})
    assert all(a["status"] == "delayed" for a in delayed_only.json())
    assert client.get(f"/api/ops/transport/{trip_a}").status_code == 200
    assert client.get("/api/ops/transport/no-such-trip").status_code == 404


def test_ops_traveler_notification_is_persisted():
    vehicle_id, driver_id = _ops_vehicle_and_driver()
    trip_id = "ops-trip-notify-001"
    _ops_approve(trip_id)
    created = client.post("/api/ops/transport", json={
        "trip_id": trip_id, "vehicle_id": vehicle_id, "driver_id": driver_id,
        "origin": "Delhi", "destination": "Manali",
        "pickup_at": "2026-12-01T09:00:00", "dropoff_at": "2026-12-01T18:00:00"})
    assert created.status_code == 201

    sent = client.post(f"/api/ops/transport/{trip_id}/notify", json={
        "event": "vehicle_change", "note": "Upgraded to Innova"})
    assert sent.status_code == 201
    body = sent.json()
    assert "Upgraded to Innova" in body["message"]
    assert vehicle_id is not None and body["message"].startswith("Your vehicle has changed")

    bad_event = client.post(f"/api/ops/transport/{trip_id}/notify", json={"event": "party"})
    assert bad_event.status_code == 422

    # Notification persisted in backend database (traveler inbox source of truth)
    from backend.database.connection import SessionLocal
    from backend.models.models import Notification
    db = SessionLocal()
    try:
        row = db.query(Notification).filter(Notification.id == body["id"]).first()
        assert row is not None and row.message == body["message"]
    finally:
        db.close()


def test_ops_routes_registered_in_openapi():
    spec = client.get("/openapi.json").json()
    for path in ("/api/ops/accommodations", "/api/ops/properties",
                 "/api/ops/vehicles", "/api/ops/drivers", "/api/ops/transport",
                 "/api/ops/transport/{trip_id}/notify"):
        assert path in spec["paths"], path


def test_ops_console_has_no_hardcoded_operational_data():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    banned = ["Hotel Taj", "Marriott", "TRIP-001", "John Doe", "Driver 1",
              "Vehicle A", "MH-01-AB-1234"]
    offenders = []
    for root, _, files in os.walk(os.path.join(repo, "src", "components", "operator")):
        for filename in files:
            if filename.endswith((".ts", ".tsx")) and filename in (
                    "OperatorHotels.tsx", "OperatorTransport.tsx"):
                path = os.path.join(root, filename)
                with open(path, encoding="utf-8") as handle:
                    content = handle.read()
                for phrase in banned:
                    if phrase in content:
                        offenders.append(f"{filename}: {phrase}")
                assert "TF FLEET" not in content, f"{filename} still fabricates fleet data"
                assert "Fleet Chauffeur" not in content, f"{filename} still fabricates drivers"
                assert "contracted_rooms: 10" not in content, f"{filename} still fabricates rooms"
    assert offenders == []


def test_ops_console_has_no_hardcoded_operational_data():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    banned = ["Hotel Taj", "Marriott", "TRIP-001", "John Doe", "Driver 1",
              "Vehicle A", "MH-01-AB-1234"]
    offenders = []
    for root, _, files in os.walk(os.path.join(repo, "src", "components", "operator")):
        for filename in files:
            if filename.endswith((".ts", ".tsx")) and filename in (
                    "OperatorHotels.tsx", "OperatorTransport.tsx"):
                path = os.path.join(root, filename)
                with open(path, encoding="utf-8") as handle:
                    content = handle.read()
                for phrase in banned:
                    if phrase in content:
                        offenders.append(f"{filename}: {phrase}")
                assert "TF FLEET" not in content, f"{filename} still fabricates fleet data"
                assert "Fleet Chauffeur" not in content, f"{filename} still fabricates drivers"
                assert "contracted_rooms: 10" not in content, f"{filename} still fabricates rooms"
    assert offenders == []


# ---------------------------------------------------------------------------
# Operations consoles: activities dispatch (assignments, vendors, capacity)
# ---------------------------------------------------------------------------
def _ops_activity_id(title_part="Paragliding"):
    from backend.database.connection import SessionLocal
    from backend.models.models import Activity
    db = SessionLocal()
    try:
        activity = db.query(Activity).filter(
            Activity.title.ilike(f"%{title_part}%"), Activity.is_active == True).first()  # noqa: E712
        assert activity is not None
        return activity.id, activity.title, activity.capacity
    finally:
        db.close()


def _ops_activity_vendor_id():
    from backend.database.connection import SessionLocal
    from backend.models.models import Vendor
    db = SessionLocal()
    try:
        vendor = db.query(Vendor).filter(
            Vendor.vendor_type == "activity", Vendor.is_verified == True).first()  # noqa: E712
        assert vendor is not None
        return vendor.id, vendor.name
    finally:
        db.close()


def _ops_hotel_vendor_id():
    from backend.database.connection import SessionLocal
    from backend.models.models import Vendor
    db = SessionLocal()
    try:
        vendor = db.query(Vendor).filter(Vendor.vendor_type == "hotel").first()
        assert vendor is not None
        return vendor.id
    finally:
        db.close()


def test_ops_activity_assignment_lifecycle_and_price():
    activity_id, title, capacity = _ops_activity_id()
    vendor_id, _ = _ops_activity_vendor_id()
    trip_id = "ops-trip-activity-001"
    _ops_approve(trip_id)
    _ops_approve("ops-trip-x")

    created = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id, "vendor_id": vendor_id,
        "scheduled_date": "2026-11-02", "start_time": "09:00", "end_time": "12:30",
        "participants": 4})
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "pending"
    assert body["activity"]["title"] == title
    assert body["vendor"]["id"] == vendor_id
    assert body["price"]["unit_price"] > 0
    assert body["price"]["total_price"] == pytest.approx(body["price"]["unit_price"] * 4)
    assert body["remaining_capacity"] == capacity - 4
    assignment_id = body["id"]

    # Retrieve single + persistence across reads
    fetched = client.get(f"/api/ops/activities/{assignment_id}")
    assert fetched.status_code == 200
    assert fetched.json()["trip_id"] == trip_id

    # Confirm requires nothing more here -> confirmed
    confirmed = client.post(f"/api/ops/activities/{assignment_id}/confirm", json={})
    assert confirmed.json()["status"] == "confirmed"

    # Update allocation persists
    updated = client.put(f"/api/ops/activities/{assignment_id}/allocation",
                         json={"participants": 6})
    assert updated.json()["participants"] == 6
    assert updated.json()["price"]["total_price"] == pytest.approx(
        updated.json()["price"]["unit_price"] * 6)

    # Invalid activity / vendor -> 404
    assert client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-x", "activity_id": "no-such-activity"}).status_code == 404
    assert client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-x", "activity_id": activity_id,
        "vendor_id": "no-such-vendor"}).status_code == 404

    # Hotel-type vendor is not eligible for activities -> 422
    hotel_vendor = _ops_hotel_vendor_id()
    bad_pair = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-x", "activity_id": activity_id, "vendor_id": hotel_vendor})
    assert bad_pair.status_code == 422

    # Missing trip -> 422
    assert client.post("/api/ops/activities", json={
        "trip_id": "  ", "activity_id": activity_id}).status_code == 422
    assert client.get("/api/ops/activities/no-such-id").status_code == 404


def test_ops_activity_capacity_conflicts():
    activity_id, _, capacity = _ops_activity_id()
    assert capacity is not None and capacity > 0
    trip_id = "ops-trip-activity-002"
    _ops_approve(trip_id)

    over = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id, "participants": capacity + 5})
    assert over.status_code == 409

    created = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id, "participants": 2})
    assert created.status_code == 201
    assignment_id = created.json()["id"]

    over_update = client.put(f"/api/ops/activities/{assignment_id}/allocation",
                             json={"participants": capacity + 1})
    assert over_update.status_code == 409

    exact = client.put(f"/api/ops/activities/{assignment_id}/allocation",
                       json={"participants": capacity})
    assert exact.json()["participants"] == capacity
    assert exact.json()["remaining_capacity"] == 0


def test_ops_activity_schedule_conflicts_and_trip_dates():
    from backend.database.connection import SessionLocal
    from backend.models.models import Trip
    db = SessionLocal()
    try:
        trip = db.query(Trip).first()
        assert trip is not None
        trip_id, start, end = trip.id, trip.start_date, trip.end_date
    finally:
        db.close()
    _ops_approve("ops-trip-activity-003")
    _ops_approve("ops-trip-activity-004")
    _ops_approve(trip_id)

    activity_id, _, _ = _ops_activity_id()
    vendor_id, _ = _ops_activity_vendor_id()

    first = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-003", "activity_id": activity_id,
        "vendor_id": vendor_id, "scheduled_date": "2026-11-05",
        "start_time": "09:00", "end_time": "11:00", "participants": 2})
    assert first.status_code == 201

    # Overlapping activity on same trip -> 409
    overlap = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-003", "activity_id": activity_id,
        "scheduled_date": "2026-11-05", "start_time": "10:30", "end_time": "12:00"})
    assert overlap.status_code == 409

    # Same vendor overlapping on another trip -> 409
    vendor_overlap = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-004", "activity_id": activity_id,
        "vendor_id": vendor_id, "scheduled_date": "2026-11-05",
        "start_time": "10:00", "end_time": "12:00"})
    assert vendor_overlap.status_code == 409

    # Adjacent (touching) window is fine
    adjacent = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-003", "activity_id": activity_id,
        "scheduled_date": "2026-11-05", "start_time": "11:00", "end_time": "12:00"})
    assert adjacent.status_code == 201

    # End before start -> 422
    assert client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-003", "activity_id": activity_id,
        "scheduled_date": "2026-11-05", "start_time": "14:00",
        "end_time": "12:00"}).status_code == 422

    # Outside the backend trip window -> 422 (when trip exists with dates)
    if start and end:
        outside = client.post("/api/ops/activities", json={
            "trip_id": trip_id, "activity_id": activity_id, "scheduled_date": "2001-01-01"})
        assert outside.status_code == 422


def test_ops_activity_status_confirm_flag_resolve():
    activity_id, _, _ = _ops_activity_id()
    vendor_id, _ = _ops_activity_vendor_id()
    trip_id = "ops-trip-activity-005"
    _ops_approve(trip_id)

    # Incomplete (no vendor/schedule) cannot confirm -> 422
    bare = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id})
    assert bare.status_code == 201
    assignment_id = bare.json()["id"]
    assert client.post(f"/api/ops/activities/{assignment_id}/confirm", json={}).status_code == 422

    # Complete it, then confirm
    filled = client.put(f"/api/ops/activities/{assignment_id}", json={
        "vendor_id": vendor_id, "scheduled_date": "2026-11-06",
        "start_time": "09:00", "end_time": "11:00", "participants": 2})
    assert filled.status_code == 200
    assert client.post(f"/api/ops/activities/{assignment_id}/confirm", json={}).json()["status"] == "confirmed"

    # Flag and resolve
    flagged = client.post(f"/api/ops/activities/{assignment_id}/flag-issue",
                          json={"reason": "Guide called in sick"})
    assert flagged.json()["status"] == "issue"
    resolved = client.post(f"/api/ops/activities/{assignment_id}/resolve-issue", json={})
    assert resolved.json()["status"] == "confirmed"

    # Filtered lists reflect backend statuses
    for status in ("pending", "confirmed", "issue"):
        listed = client.get("/api/ops/activities", params={"status": status})
        assert all(a["status"] == status for a in listed.json())


def test_ops_vendor_activity_relationships_both_directions():
    activity_id, title, _ = _ops_activity_id()
    vendor_id, vendor_name = _ops_activity_vendor_id()

    eligible = client.get(f"/api/ops/activity-inventory/{activity_id}/vendors")
    assert eligible.status_code == 200
    assert eligible.json()["activity"]["title"] == title
    assert vendor_id in [v["id"] for v in eligible.json()["vendors"]]
    assert all(v["is_verified"] for v in eligible.json()["vendors"])

    trip_id = "ops-trip-activity-006"
    _ops_approve(trip_id)
    created = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id, "vendor_id": vendor_id,
        "scheduled_date": "2026-11-07", "start_time": "09:00", "participants": 2})
    assert created.status_code == 201

    detail = client.get(f"/api/ops/vendors/{vendor_id}/assignments")
    assert detail.status_code == 200
    assert detail.json()["vendor"]["name"] == vendor_name
    assert trip_id in detail.json()["assigned_trip_ids"]
    assert trip_id in [a["trip_id"] for a in detail.json()["assignments"]]

    by_vendor = client.get("/api/ops/activities", params={"vendor_id": vendor_id})
    assert all(a["vendor_id"] == vendor_id for a in by_vendor.json())
    by_trip = client.get("/api/ops/activities", params={"trip_id": trip_id})
    assert all(a["trip_id"] == trip_id for a in by_trip.json())
    assert client.get("/api/ops/vendors/no-such-vendor/assignments").status_code == 404


def test_ops_vendor_onboarding_and_verify():
    created = client.post("/api/ops/vendors", json={
        "name": "Ops Test Outfitters", "vendor_type": "activity",
        "contact_email": "ops@test-outfitters.example", "phone": "+91 90000 00002"})
    assert created.status_code == 201
    vendor_id = created.json()["id"]
    assert created.json()["is_verified"] is True

    inventory = client.get("/api/ops/vendors").json()
    assert vendor_id in [v["id"] for v in inventory]

    suspended = client.post(f"/api/ops/vendors/{vendor_id}/verify", json={"is_verified": False})
    assert suspended.json()["is_verified"] is False

    activity_id, _, _ = _ops_activity_id()
    _ops_approve("ops-trip-activity-007")
    rejected = client.post("/api/ops/activities", json={
        "trip_id": "ops-trip-activity-007", "activity_id": activity_id, "vendor_id": vendor_id})
    assert rejected.status_code == 422

    assert client.post("/api/ops/vendors", json={"name": "  "}).status_code == 422

    activity_list = client.get("/api/ops/activity-inventory").json()
    assert len(activity_list) > 0
    assert all(a["title"] for a in activity_list)


def test_ops_activity_routes_registered_in_openapi():
    spec = client.get("/openapi.json").json()
    for path in ("/api/ops/activities", "/api/ops/vendors",
                 "/api/ops/vendors/{vendor_id}/assignments",
                 "/api/ops/activity-inventory/{activity_id}/vendors"):
        assert path in spec["paths"], path


def test_ops_activity_console_has_no_hardcoded_operational_data():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    banned = ["TRIP-001", "TRIP-002", "Vendor A", "Vendor B", "Activity 1",
              "Activity 2", "John Doe", "+91 9999999999", "fake@example.com"]
    path = os.path.join(repo, "src", "components", "operator", "OperatorVendors.tsx")
    with open(path, encoding="utf-8") as handle:
        content = handle.read()
    offenders = [phrase for phrase in banned if phrase in content]
    assert offenders == []
    assert "activities[0]" not in content
    assert "vendors[1]" not in content


# ---------------------------------------------------------------------------
# Operator approval pipeline (approve -> accept -> finalize, gated + locked)
# ---------------------------------------------------------------------------
def test_ops_pipeline_gates_assignments_before_approval():
    hotel_id, _ = _ops_hotel_id()
    vehicle_id, driver_id = _ops_vehicle_and_driver()
    activity_id, _, _ = _ops_activity_id()
    trip_id = "ops-pipe-gated-001"

    assert client.post("/api/ops/accommodations", json={
        "trip_id": trip_id, "hotel_id": hotel_id, "rooms": 1}).status_code == 409
    assert client.post("/api/ops/transport", json={
        "trip_id": trip_id, "vehicle_id": vehicle_id}).status_code == 409
    assert client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id}).status_code == 409

    pipeline = client.get(f"/api/ops/trips/{trip_id}/pipeline").json()
    assert pipeline["approval"]["approved"] is False
    assert pipeline["progress"] == {"assigned": 0, "total": 3}

    # Approve is idempotent
    assert client.post(f"/api/ops/trips/{trip_id}/approve", json={}).status_code == 200
    assert client.post(f"/api/ops/trips/{trip_id}/approve", json={}).status_code == 200

    # Accept requires approval too
    assert client.post("/api/ops/trips/never-approved-trip/accept", json={}).status_code == 409
    accepted = client.post(f"/api/ops/trips/{trip_id}/accept", json={})
    assert accepted.json()["assignment_started"] is True


def test_ops_pipeline_finalize_validation_lock_and_idempotency():
    from backend.database.connection import SessionLocal
    from backend.models.models import Notification

    hotel_id, _ = _ops_hotel_id()
    vehicle_id, driver_id = _ops_vehicle_and_driver()
    activity_id, _, _ = _ops_activity_id()
    vendor_id, _ = _ops_activity_vendor_id()
    trip_id = "ops-pipe-final-001"
    _ops_approve(trip_id)
    client.post(f"/api/ops/trips/{trip_id}/accept", json={})

    # Incomplete (nothing attached) -> 422 with missing list
    blocked = client.post(f"/api/ops/trips/{trip_id}/finalize", json={})
    assert blocked.status_code == 422
    assert "hotel" in blocked.json()["detail"]

    client.post("/api/ops/accommodations", json={
        "trip_id": trip_id, "hotel_id": hotel_id, "rooms": 1,
        "check_in_date": "2026-12-10", "check_out_date": "2026-12-12"})
    client.post("/api/ops/transport", json={
        "trip_id": trip_id, "vehicle_id": vehicle_id, "driver_id": driver_id,
        "origin": "Delhi", "destination": "Manali",
        "pickup_at": "2026-12-10T09:00:00", "dropoff_at": "2026-12-10T18:00:00"})
    created = client.post("/api/ops/activities", json={
        "trip_id": trip_id, "activity_id": activity_id, "vendor_id": vendor_id,
        "scheduled_date": "2026-12-11", "start_time": "09:00",
        "end_time": "11:00", "participants": 2})
    client.post(f"/api/ops/activities/{created.json()['id']}/confirm", json={})

    finalized = client.post(f"/api/ops/trips/{trip_id}/finalize", json={})
    assert finalized.status_code == 200
    body = finalized.json()
    assert body["finalized"] is True
    assert body["traveler_notified"] is True
    assert len(body["partners"]) >= 1

    pipeline = client.get(f"/api/ops/trips/{trip_id}/pipeline").json()
    assert pipeline["approval"]["finalized"] is True
    assert pipeline["progress"] == {"assigned": 3, "total": 3}

    # Locked: every mutation rejected
    assert client.put(f"/api/ops/accommodations/{trip_id}/rooms",
                      json={"rooms": 3}).status_code == 409
    assert client.post(f"/api/ops/transport/{trip_id}/status",
                       json={"to_status": "completed"}).status_code == 409
    assert client.put(f"/api/ops/activities/{created.json()['id']}/allocation",
                      json={"participants": 3}).status_code == 409

    # Idempotent re-finalize: no duplicate notifications
    db = SessionLocal()
    try:
        before = db.query(Notification).filter(
            Notification.title == "Trip Finalized").count()
    finally:
        db.close()
    again = client.post(f"/api/ops/trips/{trip_id}/finalize", json={})
    assert again.status_code == 200
    assert again.json()["traveler_notified"] is False
    db = SessionLocal()
    try:
        after = db.query(Notification).filter(
            Notification.title == "Trip Finalized").count()
        assert after == before
    finally:
        db.close()

    approvals = client.get("/api/ops/approvals").json()
    assert trip_id in [a["trip_id"] for a in approvals]


def test_ops_pipeline_routes_registered_in_openapi():
    spec = client.get("/openapi.json").json()
    for path in ("/api/ops/trips/{trip_id}/approve", "/api/ops/trips/{trip_id}/accept",
                 "/api/ops/trips/{trip_id}/pipeline", "/api/ops/trips/{trip_id}/finalize",
                 "/api/ops/approvals"):
        assert path in spec["paths"], path


# ---------------------------------------------------------------------------
# Trip communications (internal operator messages; traveler-invisible)
# ---------------------------------------------------------------------------
def test_ops_trip_messages_create_list_filter_and_overview():
    trip_id = "ops-comms-001"

    # Empty timeline for a fresh trip
    assert client.get(f"/api/ops/trips/{trip_id}/messages").json() == []

    # Create across categories; urgent category forces the urgent flag
    first = client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": trip_id, "operator_name": "Rajesh Sharma",
        "category": "general", "body": "Pre-departure checklist shared with the ground team.",
    })
    assert first.status_code == 201
    assert first.json()["is_urgent"] is False

    second = client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": trip_id, "operator_name": "Rajesh Sharma",
        "category": "hotel", "body": "Hotel reconfirmed for all rooms.", "is_urgent": True,
    })
    assert second.status_code == 201
    assert second.json()["is_urgent"] is True

    third = client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": trip_id, "category": "urgent",
        "body": "Road closure reported near the transit hub.",
    })
    assert third.status_code == 201
    assert third.json()["category"] == "urgent"
    assert third.json()["is_urgent"] is True
    assert third.json()["operator_name"] == "operator"

    # Chronological full timeline
    timeline = client.get(f"/api/ops/trips/{trip_id}/messages").json()
    assert [m["id"] for m in timeline] == [
        first.json()["id"], second.json()["id"], third.json()["id"]]
    assert all(m["trip_id"] == trip_id for m in timeline)

    # Category filter
    hotels = client.get(f"/api/ops/trips/{trip_id}/messages",
                        params={"category": "hotel"}).json()
    assert [m["id"] for m in hotels] == [second.json()["id"]]
    assert client.get(f"/api/ops/trips/{trip_id}/messages",
                      params={"category": "bogus"}).status_code == 422

    # Overview aggregates per-trip counts
    overview = {e["trip_id"]: e for e in client.get("/api/ops/messages/overview").json()}
    assert overview[trip_id]["message_count"] == 3
    assert overview[trip_id]["urgent_count"] == 2
    assert overview[trip_id]["latest_at"] == third.json()["created_at"]

    # Validation: blank body, bad category, mismatched trip id
    assert client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": trip_id, "body": "   "}).status_code == 422
    assert client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": trip_id, "category": "carrier-pigeon",
        "body": "Hello?"}).status_code == 422
    assert client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": "some-other-trip", "body": "Misfiled"}).status_code == 422
    assert client.post(f"/api/ops/trips/{trip_id}/messages", json={
        "trip_id": "  ", "body": "No trip"}).status_code == 422

    # Routes registered
    spec = client.get("/openapi.json").json()
    for path in ("/api/ops/messages/overview", "/api/ops/trips/{trip_id}/messages"):
        assert path in spec["paths"], path


# ---------------------------------------------------------------------------
# Traveler trip confirmation (planning -> confirmed, idempotent, owned)
# ---------------------------------------------------------------------------
def _confirm_trip_payload(destination="Manali"):
    return {
        "title": "Confirm Drill Trip",
        "destination_name": destination,
        "duration_days": 3,
        "total_budget": 60000.0,
        "traveler_count": 2,
        "currency": "INR",
        "start_date": "2026-11-01T09:00:00",
        "end_date": "2026-11-03T18:00:00",
    }


def test_trip_confirm_happy_path_persists_and_notifies():
    from backend.database.connection import SessionLocal
    from backend.models.models import ChangeHistory, Notification

    created = client.post("/api/trips", json=_confirm_trip_payload())
    assert created.status_code == 200
    trip_id = created.json()["id"]
    owner = created.json()["user_id"]
    itinerary_count = len(created.json()["itinerary"])
    assert itinerary_count > 0

    confirmed = client.post(f"/api/trips/{trip_id}/confirm", json={"user_id": owner})
    assert confirmed.status_code == 200
    body = confirmed.json()
    assert body["status"] == "success"
    assert body["already_confirmed"] is False
    assert body["confirmed_at"] is not None
    assert body["trip"]["status"] == "confirmed"
    assert body["trip"]["id"] == trip_id

    # Operator visibility: confirmed trip listed by status filter
    listed = client.get("/api/trips", params={"status": "confirmed"})
    assert trip_id in [t["id"] for t in listed.json()]

    # History + notification persisted exactly once
    db = SessionLocal()
    try:
        history = db.query(ChangeHistory).filter(
            ChangeHistory.trip_id == trip_id, ChangeHistory.action == "trip_confirmed").all()
        assert len(history) == 1
        notes = db.query(Notification).filter(
            Notification.trip_id == trip_id, Notification.title == "Trip Confirmed").all()
        assert len(notes) == 1
        assert trip_id in notes[0].message
    finally:
        db.close()

    # Idempotent reconfirm: same state, no duplicates
    again = client.post(f"/api/trips/{trip_id}/confirm", json={"user_id": owner})
    assert again.status_code == 200
    assert again.json()["already_confirmed"] is True
    db = SessionLocal()
    try:
        assert db.query(ChangeHistory).filter(
            ChangeHistory.trip_id == trip_id, ChangeHistory.action == "trip_confirmed").count() == 1
        assert db.query(Notification).filter(
            Notification.trip_id == trip_id, Notification.title == "Trip Confirmed").count() == 1
    finally:
        db.close()

    # No ops assignments fabricated by confirmation
    assert client.get("/api/ops/accommodations/no-such-trip-xyz").status_code == 404
    assert client.get("/api/ops/transport/no-such-trip-xyz").status_code == 404


def test_trip_confirm_rejects_bad_requests():
    created = client.post("/api/trips", json=_confirm_trip_payload())
    trip_id = created.json()["id"]
    owner = created.json()["user_id"]

    assert client.post("/api/trips/no-such-trip/confirm", json={"user_id": owner}).status_code == 404
    assert client.post(f"/api/trips/{trip_id}/confirm", json={"user_id": "usr-someone-else"}).status_code == 403

    # Non-confirmable status
    client.put(f"/api/trips/{trip_id}", json={"status": "cancelled"})
    assert client.post(f"/api/trips/{trip_id}/confirm", json={"user_id": owner}).status_code == 422

    # Missing dates cannot confirm
    nodates = client.post("/api/trips", json={
        "title": "Dateless", "destination_name": "Manali",
        "duration_days": 2, "total_budget": 10000.0, "traveler_count": 1})
    assert nodates.status_code == 200
    assert client.post(f"/api/trips/{nodates.json()['id']}/confirm",
                       json={"user_id": nodates.json()["user_id"]}).status_code == 422


def test_trip_confirm_route_registered_in_openapi():
    spec = client.get("/openapi.json").json()
    assert "/api/trips/{trip_id}/confirm" in spec["paths"]


# ---------------------------------------------------------------------------
# Location-aware restaurant ranking (no provider calls; pure ranking logic)
# ---------------------------------------------------------------------------
def _ranked_candidate(name, lat, lng, rating=4.0, reviews=100, hours=None):
    return {"id": f"serpapi-restaurant-{name}", "place_id": name, "name": name,
            "address": f"{name} address", "rating": rating, "reviews_count": reviews,
            "latitude": lat, "longitude": lng, "hours": hours, "types": ["restaurant"]}


def test_haversine_km_measures_gateway_to_colaba():
    from backend.restaurants.service import haversine_km

    # Gateway of India (18.9220, 72.8347) to Colaba Causeway (~18.9067, 72.8147).
    distance = haversine_km(18.9220, 72.8347, 18.9067, 72.8147)
    assert distance == pytest.approx(2.7, abs=0.4)
    assert haversine_km(18.9220, 72.8347, 18.9220, 72.8347) == pytest.approx(0.0)
    assert haversine_km(None, 72.8, 18.9, 72.8) is None
    assert haversine_km("bad", 72.8, 18.9, 72.8) is None


def test_rank_prefers_nearby_restaurant_over_higher_rated_far_one():
    from backend.restaurants.service import rank_candidates_for_anchor

    anchor = {"anchor_latitude": 18.9220, "anchor_longitude": 72.8347}  # Gateway of India
    near = _ranked_candidate("Gateway Nearby Kitchen", 18.9210, 72.8330, rating=4.1)
    far = _ranked_candidate("Distant Fine Dining", 19.1000, 72.9000, rating=4.9, reviews=9000)
    ranked = rank_candidates_for_anchor([far, near], **anchor)
    assert ranked[0]["name"] == "Gateway Nearby Kitchen"
    assert ranked[0]["distance_km"] == pytest.approx(0.2, abs=0.2)
    assert ranked[1]["name"] == "Distant Fine Dining"
    # Inputs are not mutated with distance keys.
    assert "distance_km" not in near and "distance_km" not in far


def test_rank_without_anchor_coordinates_falls_back_to_rating_order():
    from backend.restaurants.service import rank_candidates_for_anchor

    low = _ranked_candidate("Low Rated", 18.9, 72.8, rating=3.8)
    high = _ranked_candidate("High Rated", 18.9, 72.8, rating=4.7)
    ranked = rank_candidates_for_anchor([low, high])
    assert [r["name"] for r in ranked] == ["High Rated", "Low Rated"]
    assert all(r["distance_km"] is None for r in ranked)


def test_rank_deprioritizes_closed_venues_and_applies_max_distance():
    from backend.restaurants.service import rank_candidates_for_anchor

    anchor = {"anchor_latitude": 18.9220, "anchor_longitude": 72.8347}
    closed_near = _ranked_candidate("Closed Nearby", 18.9215, 72.8340, rating=4.8,
                                   hours="Monday: Closed")
    open_near = _ranked_candidate("Open Nearby", 18.9210, 72.8330, rating=4.2)
    far_open = _ranked_candidate("Far Open", 19.3000, 73.0000, rating=4.9)
    ranked = rank_candidates_for_anchor([closed_near, open_near, far_open], **anchor)
    assert ranked[0]["name"] == "Open Nearby"
    nearby_only = rank_candidates_for_anchor(
        [closed_near, open_near, far_open], max_distance_km=15.0, **anchor)
    assert {r["name"] for r in nearby_only} == {"Closed Nearby", "Open Nearby"}
    excluded = rank_candidates_for_anchor(
        [closed_near, open_near], exclude_ids=["serpapi-restaurant-Open Nearby"], **anchor)
    assert [r["name"] for r in excluded] == ["Closed Nearby"]
    assert rank_candidates_for_anchor([], **anchor) == []


# ---------------------------------------------------------------------------
# Real per-location images via SerpApi Google Images (mocked; never hits API)
# ---------------------------------------------------------------------------
def _serpapi_image(title="Nishat Bagh", original="https://upload.wikimedia.org/real-garden.jpg",
                   thumbnail="https://encrypted-tbn0.gstatic.com/real-thumb"):
    return {"title": title, "original": original, "thumbnail": thumbnail}


def _mock_place_images(monkeypatch, payload, key="test-serpapi-key"):
    import backend.images.service as images_service

    images_service.clear_image_cache()
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", key)
    calls = {}

    def fake_get(url, params, timeout):
        calls["url"] = url
        calls["params"] = params
        calls["count"] = calls.get("count", 0) + 1
        return _FakeSerpApiResponse(payload)

    monkeypatch.setattr(images_service, "_http_get", fake_get)
    return calls


def test_place_image_returns_real_provider_photo(monkeypatch):
    calls = _mock_place_images(monkeypatch, {"images_results": [_serpapi_image()]})
    response = client.get("/api/places/image",
                          params={"location": "Nishat Bagh", "destination": "Kashmir"})
    assert response.status_code == 200
    body = response.json()
    assert body["image_url"] == "https://upload.wikimedia.org/real-garden.jpg"
    assert body["images"] == ["https://upload.wikimedia.org/real-garden.jpg"]
    assert body["source"] == "serpapi_images"
    assert body["location"] == "Nishat Bagh"
    assert calls["params"]["engine"] == "google_images"
    assert "Nishat Bagh" in calls["params"]["q"] and "Kashmir" in calls["params"]["q"]
    assert "api_key" not in str(calls["url"])


def test_place_image_count_returns_distinct_photos_in_one_call(monkeypatch):
    calls = _mock_place_images(monkeypatch, {"images_results": [
        _serpapi_image(title="Howrah Bridge", original="https://example.test/howrah.jpg"),
        _serpapi_image(title="Victoria Memorial",
                       original="https://example.test/victoria.jpg"),
        _serpapi_image(title="Howrah Bridge duplicate",
                       original="https://example.test/howrah.jpg"),
        _serpapi_image(title="Park Street", original="https://example.test/park.jpg"),
    ]})
    response = client.get("/api/places/image",
                          params={"location": "Kolkata", "count": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["images"] == ["https://example.test/howrah.jpg",
                              "https://example.test/victoria.jpg",
                              "https://example.test/park.jpg"]
    assert body["image_url"] == body["images"][0]
    assert calls.get("count", 0) == 1
    assert client.get("/api/places/image",
                      params={"location": "Kolkata", "count": 99}).status_code == 422


def test_place_image_skips_unusable_records_and_empty_results(monkeypatch):
    _mock_place_images(monkeypatch, {"images_results": [
        {"title": "No URLs Here"},
        {"title": "Bad", "original": "ftp://example.test/x.jpg"},
        "not-a-record",
        None,
        _serpapi_image(title="Fallback", original=None),
    ]})
    response = client.get("/api/places/image", params={"location": "Dal Lake"})
    assert response.status_code == 200
    assert response.json()["image_url"] == "https://encrypted-tbn0.gstatic.com/real-thumb"

    _mock_place_images(monkeypatch, {"images_results": []})
    response = client.get("/api/places/image", params={"location": "Nowhere Imaginary"})
    assert response.status_code == 200
    assert response.json()["image_url"] is None
    assert response.json()["source"] == "none"
    assert client.get("/api/places/image").status_code == 422


def test_place_image_skips_watermarked_and_unreliable_hosts(monkeypatch):
    _mock_place_images(monkeypatch, {"images_results": [
        _serpapi_image(title="Watermarked", original="https://c8.alamy.com/comp/watermarked.jpg"),
        _serpapi_image(title="Crawler link",
                       original="https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1",
                       thumbnail=None),
        _serpapi_image(title="Flight video still",
                       original="https://i.ytimg.com/vi/abc/maxresdefault.jpg",
                       thumbnail=None),
        _serpapi_image(title="Express route map", original="https://example.test/map.png"),
        _serpapi_image(title="Line overview",
                       original="https://upload.wikimedia.org/line_Route_map.png"),
        _serpapi_image(title="Real Palace", original="https://example.test/palace.jpg"),
    ]})
    response = client.get("/api/places/image", params={"location": "Palace"})
    assert response.status_code == 200
    assert response.json()["image_url"] == "https://example.test/palace.jpg"


def test_place_image_error_paths_and_missing_key(monkeypatch):
    import httpx
    import backend.images.service as images_service

    _mock_place_images(monkeypatch, {"images_results": []})
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "test-serpapi-key")
    images_service.clear_image_cache()

    def boom(url, params, timeout):
        raise httpx.ConnectError("blocked")

    monkeypatch.setattr(images_service, "_http_get", boom)
    response = client.get("/api/places/image", params={"location": "Dal Lake"})
    assert response.status_code == 200  # image lookup never breaks the trip
    assert response.json()["image_url"] is None

    def api_error(url, params, timeout):
        return _FakeSerpApiResponse({"error": "Invalid API key"})

    monkeypatch.setattr(images_service, "_http_get", api_error)
    degraded = client.get("/api/places/image", params={"location": "Dal Lake"})
    assert degraded.status_code == 200  # image lookup never breaks the trip
    assert degraded.json()["image_url"] is None

    images_service.clear_image_cache()
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "")

    def must_not_run(url, params, timeout):
        raise AssertionError("SerpApi must not be called without a key")

    monkeypatch.setattr(images_service, "_http_get", must_not_run)
    assert client.get("/api/places/image", params={"location": "Dal Lake"}).status_code == 503


def test_place_image_deduplicates_repeated_locations(monkeypatch):
    calls = _mock_place_images(monkeypatch, {"images_results": [_serpapi_image()]})
    params = {"location": "Dal Lake", "destination": "Kashmir"}
    first = client.get("/api/places/image", params=params)
    second = client.get("/api/places/image", params=params)
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["image_url"] == "https://upload.wikimedia.org/real-garden.jpg"
    assert calls.get("count", 0) == 1


def test_place_image_failure_is_not_cached(monkeypatch):
    import httpx
    import backend.images.service as images_service

    images_service.clear_image_cache()
    monkeypatch.setattr(_settings, "SERPAPI_API_KEY", "test-serpapi-key")
    calls = {"count": 0}

    def flaky(url, params, timeout):
        calls["count"] += 1
        if calls["count"] == 1:
            raise httpx.ConnectError("transient")
        return _FakeSerpApiResponse({"images_results": [_serpapi_image()]})

    monkeypatch.setattr(images_service, "_http_get", flaky)
    params = {"location": "Dal Lake", "destination": "Kashmir"}
    assert client.get("/api/places/image", params=params).json()["image_url"] is None
    retry = client.get("/api/places/image", params=params)
    assert retry.json()["image_url"] == "https://upload.wikimedia.org/real-garden.jpg"
    assert calls["count"] == 2


def test_no_hardcoded_image_urls_in_images_service():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(repo, "backend", "images", "service.py")
    with open(path, encoding="utf-8") as handle:
        source = handle.read()
    assert "unsplash.com" not in source
    assert "images_results" in source and "google_images" in source


# ---------------------------------------------------------------------------
# Traveler password authentication + owned trip snapshots
# ---------------------------------------------------------------------------
def _traveler_signup(email="traveler.auth.case@tourflow.ai", password="WanderSafe123",
                     full_name="Auth Case Traveler"):
    return client.post("/api/auth/traveler/signup", json={
        "full_name": full_name, "email": email, "password": password})


def _traveler_login(email="traveler.auth.case@tourflow.ai", password="WanderSafe123"):
    return client.post("/api/auth/traveler/login", json={
        "email": email, "password": password})


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def _owned_snapshot(trip_id="trp-owned-case-001"):
    return {
        "id": trip_id, "title": "Owned Case Trip",
        "status": "planning", "duration_days": 4,
        "destination": {"name": "Manali"},
        "start_date": "2026-10-01", "end_date": "2026-10-04",
        "formatted_dates": "Oct 1 – Oct 4, 2026",
        "itinerary": [], "bookings": [],
    }


def test_traveler_signup_login_and_session():
    created = _traveler_signup()
    assert created.status_code == 201
    body = created.json()
    assert body["user"]["email"] == "traveler.auth.case@tourflow.ai"
    assert body["user"]["full_name"] == "Auth Case Traveler"
    assert body["token"]
    # No password material leaks into responses
    assert "password" not in json.dumps(body).lower()
    user_id = body["user"]["id"]

    # Duplicate email is rejected without creating a second account
    assert _traveler_signup().status_code == 409

    # Login works and identifies the same traveler
    logged = _traveler_login()
    assert logged.status_code == 200
    assert logged.json()["user"]["id"] == user_id
    assert logged.json()["token"]

    # Invalid credentials are rejected
    assert _traveler_login(password="WrongPassword999").status_code == 401
    assert _traveler_login(email="nobody@tourflow.ai").status_code == 401

    # Session validation
    me = client.get("/api/auth/traveler/me",
                    headers=_auth_headers(logged.json()["token"]))
    assert me.status_code == 200
    assert me.json()["id"] == user_id
    assert client.get("/api/auth/traveler/me").status_code == 401
    assert client.get("/api/auth/traveler/me",
                      headers=_auth_headers("garbage")).status_code == 401

    # Expired sessions are rejected
    import jwt as pyjwt
    from backend.database.config import settings
    from datetime import datetime, timedelta, timezone
    stale = pyjwt.encode(
        {"sub": user_id, "role": "traveler",
         "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())},
        settings.TRAVELER_JWT_SECRET, algorithm="HS256")
    assert client.get("/api/auth/traveler/me",
                      headers=_auth_headers(stale)).status_code == 401

    # Passwords are hashed at rest, never plaintext
    from backend.database.connection import SessionLocal
    from backend.models.models import User
    db = SessionLocal()
    try:
        row = db.query(User).filter(User.email == "traveler.auth.case@tourflow.ai").first()
        assert row is not None
        assert row.password_hash and row.password_hash != "WanderSafe123"
        assert row.password_hash.startswith("$2")
    finally:
        db.close()


def test_traveler_trip_ownership_isolation_and_relogin():
    first = _traveler_signup(email="owner.one@tourflow.ai")
    assert first.status_code == 201
    token_one = first.json()["token"]
    user_one = first.json()["user"]["id"]
    second = _traveler_signup(email="owner.two@tourflow.ai")
    token_two = second.json()["token"]

    trip_id = "trp-owned-case-001"
    saved = client.post("/api/traveler/trips",
                        json={"trip_id": trip_id, "trip": _owned_snapshot(trip_id)},
                        headers=_auth_headers(token_one))
    assert saved.status_code == 201
    assert saved.json() == {"trip_id": trip_id, "owned": True, "updated": False}

    # Re-saving the same trip updates instead of duplicating
    snapshot = _owned_snapshot(trip_id)
    snapshot["status"] = "confirmed"
    again = client.post("/api/traveler/trips",
                        json={"trip_id": trip_id, "trip": snapshot},
                        headers=_auth_headers(token_one))
    assert again.json() == {"trip_id": trip_id, "owned": True, "updated": True}

    # Owner lists and retrieves their own trip
    mine = client.get("/api/traveler/trips", headers=_auth_headers(token_one)).json()
    assert trip_id in [t["trip_id"] for t in mine]
    entry = [t for t in mine if t["trip_id"] == trip_id][0]
    assert entry["destination"] == "Manali"
    assert entry["duration_days"] == 4
    assert entry["status"] == "confirmed"
    assert entry["updated_at"]
    fetched = client.get(f"/api/traveler/trips/{trip_id}",
                         headers=_auth_headers(token_one))
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Owned Case Trip"

    # Trip is associated with the correct traveler in the database
    from backend.database.connection import SessionLocal
    from backend.models.models import Trip
    db = SessionLocal()
    try:
        row = db.query(Trip).filter(Trip.id == trip_id).first()
        assert row is not None
        assert row.user_id == user_one
        assert isinstance(row.canonical_snapshot, dict)
    finally:
        db.close()

    # Another traveler cannot read it (no existence leak) or claim it
    assert client.get(f"/api/traveler/trips/{trip_id}",
                      headers=_auth_headers(token_two)).status_code == 404
    assert trip_id not in [t["trip_id"] for t in client.get(
        "/api/traveler/trips", headers=_auth_headers(token_two)).json()]
    clash = client.post("/api/traveler/trips",
                        json={"trip_id": trip_id, "trip": _owned_snapshot(trip_id)},
                        headers=_auth_headers(token_two))
    assert clash.status_code == 403

    # Unauthenticated access is rejected everywhere
    assert client.get("/api/traveler/trips").status_code == 401
    assert client.get(f"/api/traveler/trips/{trip_id}").status_code == 401
    assert client.post("/api/traveler/trips",
                       json={"trip_id": trip_id,
                             "trip": _owned_snapshot(trip_id)}).status_code == 401

    # Trip remains accessible after a fresh login (new session/token)
    relogin = _traveler_login(email="owner.one@tourflow.ai")
    assert relogin.status_code == 200
    refetched = client.get(f"/api/traveler/trips/{trip_id}",
                           headers=_auth_headers(relogin.json()["token"]))
    assert refetched.status_code == 200
    assert refetched.json()["id"] == trip_id


def test_operator_login_untouched_by_traveler_auth(monkeypatch):
    # Unconfigured operator password still reports 503
    monkeypatch.delenv("OPERATOR_LOGIN_PASSWORD", raising=False)
    assert client.post("/api/auth/operator-login", json={
        "email": "rahul.operator@tourflow.ai", "password": "x"}).status_code == 503
    # Configured shared password keeps working and rejects wrong passwords
    monkeypatch.setenv("OPERATOR_LOGIN_PASSWORD", "ops-secret")
    assert client.post("/api/auth/operator-login", json={
        "email": "rahul.operator@tourflow.ai",
        "password": "ops-secret"}).status_code == 200
    assert client.post("/api/auth/operator-login", json={
        "email": "rahul.operator@tourflow.ai",
        "password": "wrong"}).status_code == 401
    # Traveler passwords are not valid operator credentials and vice versa
    assert client.post("/api/auth/operator-login", json={
        "email": "owner.one@tourflow.ai",
        "password": "WanderSafe123"}).status_code == 401
