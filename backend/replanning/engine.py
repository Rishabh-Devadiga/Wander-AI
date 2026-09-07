"""Catalog-grounded disruption proposals for existing trip itineraries."""

import json
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.models import Activity, Alert, ChangeHistory, ItineraryItem, Trip


class ReplanningEngine:
    """Create reviewable, catalog-backed proposals without applying itinerary changes."""

    _ACTIVE_ITEM_STATUSES = {"proposed", "confirmed"}
    _OUTDOOR_DISRUPTION_TERMS = {
        "weather", "snow", "snowfall", "storm", "rain", "rainfall", "road",
        "closure", "blocked", "landslide", "flood", "wind",
    }
    _LOW_RISK_CATEGORIES = {"culture", "relaxation"}

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
        alert = Alert(
            trip_id=trip.id, alert_type=alert_type, severity=severity, title=title,
            description=description, is_resolved=False,
        )
        self.db.add(alert)

        affected_items = self._affected_items(trip, trigger_event)
        requested_alternative_id = trigger_event.get("alternative_id")
        requested_alternative = self._valid_activity(trip, requested_alternative_id) if requested_alternative_id else None
        rejected_alternative_id = requested_alternative_id if requested_alternative_id and not requested_alternative else None

        proposals: List[Dict[str, Any]] = []
        for item in affected_items:
            if item.item_type != "activity":
                continue
            alternative = requested_alternative or self._best_alternative(trip)
            if alternative is None:
                continue
            old_value = self._item_value(item)
            new_value = self._activity_value(alternative, trip.traveler_count)
            proposals.append({
                "itinerary_item_id": item.id, "day_number": item.day_number,
                "old_item": old_value, "alternative": new_value,
                "reason": f"Catalog alternative for {alert_type}: {title}",
            })
            self.db.add(ChangeHistory(
                trip_id=trip.id, changed_by="ai", action="replan_proposed",
                field_changed=f"itinerary:{item.id}",
                old_value=json.dumps(old_value, sort_keys=True),
                new_value=json.dumps(new_value, sort_keys=True),
                reason=f"Proposal generated for {alert_type}: {title}",
            ))

        plan: Dict[str, Any] = {
            "trip_id": trip.id, "trigger_event": trigger_event, "status": "replan_proposed",
            "impact_summary": self._impact_summary(affected_items, proposals, alert_type),
            "affected_items": [self._item_value(item) for item in affected_items],
            "proposals": proposals, "recommended_actions": self._recommended_actions(proposals),
        }
        if rejected_alternative_id:
            plan["rejected_alternative_id"] = rejected_alternative_id

        self.db.commit()
        self.db.refresh(alert)
        return {"status": "success", "trip_id": trip_id, "alert_id": alert.id, "ai_replan_plan": plan}

    def _affected_items(self, trip: Trip, trigger_event: Dict[str, Any]) -> List[ItineraryItem]:
        event_text = " ".join(str(trigger_event.get(key, "")) for key in ("type", "title", "description")).lower()
        event_terms = set(re.findall(r"[a-z0-9]+", event_text))
        active_items = [item for item in trip.itinerary if item.status in self._ACTIVE_ITEM_STATUSES]
        matched = [item for item in active_items if self._item_matches_event(item, event_terms)]
        if matched:
            return matched
        if event_terms & self._OUTDOOR_DISRUPTION_TERMS:
            return [item for item in active_items if item.item_type in {"activity", "transport"}]
        return []

    @staticmethod
    def _item_matches_event(item: ItineraryItem, event_terms: set[str]) -> bool:
        values = [item.title or "", item.description or "", item.location or ""]
        if item.activity:
            values.extend([item.activity.title or "", item.activity.description or "", item.activity.meeting_point or ""])
        item_terms = {term for value in values for term in re.findall(r"[a-z0-9]+", value.lower()) if len(term) >= 5}
        return bool(item_terms & event_terms)

    def _best_alternative(self, trip: Trip) -> Optional[Activity]:
        candidates = self.db.query(Activity).filter(
            Activity.destination_id == trip.destination_id, Activity.is_active == True,  # noqa: E712
            Activity.currency == trip.currency, Activity.duration_hours > 0,
        ).all()
        active_activity_ids = {entry.activity_id for entry in trip.itinerary if entry.activity_id}
        candidates = [candidate for candidate in candidates if candidate.id not in active_activity_ids]
        if not candidates:
            return None
        return min(candidates, key=lambda candidate: (
            0 if candidate.category in self._LOW_RISK_CATEGORIES else 1,
            candidate.price_per_person, candidate.id,
        ))

    def _valid_activity(self, trip: Trip, activity_id: Any) -> Optional[Activity]:
        if not isinstance(activity_id, str) or not activity_id:
            return None
        if any(item.activity_id == activity_id for item in trip.itinerary):
            return None
        return self.db.query(Activity).filter(
            Activity.id == activity_id, Activity.destination_id == trip.destination_id,
            Activity.is_active == True, Activity.currency == trip.currency,  # noqa: E712
            Activity.duration_hours > 0,
        ).first()

    @staticmethod
    def _item_value(item: ItineraryItem) -> Dict[str, Any]:
        return {
            "id": item.id, "day_number": item.day_number, "order_index": item.order_index,
            "item_type": item.item_type, "title": item.title, "description": item.description,
            "activity_id": item.activity_id, "location": item.location, "cost": item.cost,
            "currency": item.trip.currency, "status": item.status,
        }

    @staticmethod
    def _activity_value(activity: Activity, traveler_count: int) -> Dict[str, Any]:
        return {
            "activity_id": activity.id, "title": activity.title, "description": activity.description,
            "location": activity.meeting_point, "cost": round(activity.price_per_person * traveler_count, 2),
            "currency": activity.currency, "duration_hours": activity.duration_hours,
        }

    @staticmethod
    def _impact_summary(affected_items: List[ItineraryItem], proposals: List[Dict[str, Any]], alert_type: str) -> str:
        return (f"{len(affected_items)} active itinerary item(s) were inspected for {alert_type}; "
                f"{len(proposals)} catalog-backed replacement proposal(s) are available.")

    @staticmethod
    def _recommended_actions(proposals: List[Dict[str, Any]]) -> List[str]:
        if not proposals:
            return ["Review the affected itinerary items; no unplanned inventory was added."]
        return [f"Review the Day {proposal['day_number']} replacement for {proposal['old_item']['title']}."
                for proposal in proposals]
