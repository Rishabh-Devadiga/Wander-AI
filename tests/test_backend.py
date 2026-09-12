import json
import os

import pytest
from fastapi.testclient import TestClient
from backend.main import app
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
    run_seed()

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

        def get_recommendations(self, destination_id, preferences):
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


def test_trip_optimizer_rebuilds_proposed_items_from_ranked_catalog(monkeypatch):
    import backend.itinerary.generator as itinerary_generator

    class RankedEngine:
        def __init__(self, db):
            pass

        def get_recommendations(self, destination_id, preferences):
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
