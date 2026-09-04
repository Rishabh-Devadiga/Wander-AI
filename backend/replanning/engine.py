from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models.models import Trip, Alert, ChangeHistory, ItineraryItem
from backend.ai.gemini_service import gemini_service

class ReplanningEngine:
    """
    Handles dynamic disruption management (weather, road blocks, flight delays)
    and logs changes into Trip's change_history and alerts.
    """
    def __init__(self, db: Session):
        self.db = db

    def handle_disruption(self, trip_id: str, trigger_event: Dict[str, Any]) -> Dict[str, Any]:
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return {"status": "error", "message": "Trip not found"}

        alert_type = trigger_event.get("type", "weather")
        title = trigger_event.get("title", f"Real-time Alert: {alert_type.capitalize()}")
        description = trigger_event.get("description", "Potential itinerary schedule impact detected.")
        severity = trigger_event.get("severity", "warning")

        # 1. Create Alert on Trip
        alert = Alert(
            trip_id=trip.id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            is_resolved=False
        )
        self.db.add(alert)

        # 2. Trigger AI replan proposal
        ai_replan = gemini_service.replan(trip_id=trip.id, trigger_event=trigger_event)

        # 3. Log Change History
        history = ChangeHistory(
            trip_id=trip.id,
            changed_by="ai",
            action="replan_triggered",
            field_changed="itinerary_schedule",
            old_value="standard_schedule",
            new_value="weather_adapted_schedule",
            reason=f"Automated adaptive response to {alert_type}: {title}"
        )
        self.db.add(history)
        self.db.commit()

        return {
            "status": "success",
            "trip_id": trip_id,
            "alert_id": alert.id,
            "ai_replan_plan": ai_replan
        }
