import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.connection import SessionLocal
from backend.models.models import Destination, Trip, User, Hotel, Activity, TransportOption
from database.seed_data.seed import run_seed

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
