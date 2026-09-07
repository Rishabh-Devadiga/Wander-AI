"""Catalog-grounded, non-mutating service for the Assistant Agent."""

import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.assistant.crew import AssistantCrew
from backend.models.models import Trip
from backend.schemas.schemas import (
    AssistantChatContext, AssistantChatResult, AssistantCrewOutput, AssistantReference,
)


class AssistantExecutionError(Exception):
    """Raised when configured CrewAI assistant output cannot be validated."""


class AssistantValidationError(Exception):
    """Raised when persisted trip context contains invalid catalog references."""


class AssistantService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: AssistantChatContext) -> AssistantChatResult:
        trip = self.db.query(Trip).filter(Trip.id == context.trip_id).first()
        if not trip:
            raise LookupError("Trip is not present in the TourFlow catalog")
        if not trip.destination:
            raise AssistantValidationError("Trip does not have a catalog destination")
        trip_context, references = self._validated_context(trip)
        if not self.gemini_service.is_available():
            output = self._fallback(context.message, trip_context)
            return self._result(trip, context.message, references, output, "catalog_fallback")
        try:
            output = AssistantCrew(self.gemini_service).run(context.message, trip_context)
            return self._result(trip, context.message, references, output, "crewai")
        except AssistantValidationError:
            raise
        except Exception as exc:
            raise AssistantExecutionError("Assistant response could not be validated") from exc

    def _validated_context(self, trip: Trip) -> tuple[Dict[str, Any], Dict[str, AssistantReference]]:
        hotels = {item.id: item for item in trip.destination.hotels if item.is_active}
        transports = {item.id: item for item in trip.destination.transport_options if item.is_active}
        activities = {item.id: item for item in trip.destination.activities if item.is_active}
        references: Dict[str, AssistantReference] = {}
        itinerary = []
        itinerary_total = 0.0
        for item in trip.itinerary:
            catalog_title = None
            catalog_id = None
            catalog_cost = float(item.cost or 0)
            if item.hotel_id:
                hotel = hotels.get(item.hotel_id)
                if not hotel:
                    raise AssistantValidationError("Trip itinerary references an inactive or unknown catalog hotel")
                catalog_title = hotel.name
                catalog_id = hotel.id
                catalog_cost = float(hotel.price_per_night or item.cost or 0)
                references[hotel.id] = AssistantReference(reference_id=hotel.id, reference_type="hotel", title=hotel.name)
            if item.transport_id:
                transport = transports.get(item.transport_id)
                if not transport or transport.capacity < trip.traveler_count:
                    raise AssistantValidationError("Trip itinerary references an inactive, unknown, or insufficient-capacity transport option")
                catalog_title = transport.name
                catalog_id = transport.id
                catalog_cost = float(transport.price or item.cost or 0)
                references[transport.id] = AssistantReference(reference_id=transport.id, reference_type="transport", title=transport.name)
            if item.activity_id:
                activity = activities.get(item.activity_id)
                if not activity or activity.duration_hours <= 0:
                    raise AssistantValidationError("Trip itinerary references an inactive, unknown, or invalid catalog activity")
                catalog_title = activity.title
                catalog_id = activity.id
                catalog_cost = float(activity.price_per_person or 0) * float(trip.traveler_count or 1)
                references[activity.id] = AssistantReference(reference_id=activity.id, reference_type="activity", title=activity.title)
            itinerary_total += catalog_cost
            references[item.id] = AssistantReference(reference_id=item.id, reference_type="itinerary_item", title=item.title,
                                                       day_number=item.day_number, status=item.status)
            itinerary.append({"itinerary_item_id": item.id, "day_number": item.day_number, "order_index": item.order_index,
                              "item_type": item.item_type, "title": catalog_title or item.title, "status": item.status,
                              "start_time": item.start_time, "end_time": item.end_time, "location": item.location,
                              "catalog_id": catalog_id, "catalog_cost": round(catalog_cost, 2), "currency": trip.currency})
        bookings = []
        booking_total = 0.0
        for booking in trip.bookings:
            booking_total += float(booking.amount or 0)
            references[booking.id] = AssistantReference(reference_id=booking.id, reference_type="booking",
                                                         title=booking.booking_reference, status=booking.status)
            bookings.append({"booking_id": booking.id, "booking_reference": booking.booking_reference,
                             "item_type": booking.item_type, "status": booking.status,
                             "payment_status": booking.payment_status, "amount": booking.amount,
                             "currency": booking.currency})
        alerts = [{"alert_id": alert.id, "alert_type": alert.alert_type, "severity": alert.severity,
                   "title": alert.title, "description": alert.description, "is_resolved": alert.is_resolved}
                  for alert in trip.alerts]
        preferences = trip.preferences
        payload = {
            "trip_id": trip.id, "destination": trip.destination.name, "trip_status": trip.status,
            "start_date": trip.start_date.isoformat() if trip.start_date else None,
            "end_date": trip.end_date.isoformat() if trip.end_date else None,
            "duration_days": trip.duration_days, "traveler_count": trip.traveler_count,
            "total_budget": trip.total_budget, "currency": trip.currency,
            "itinerary_catalog_total": round(itinerary_total, 2),
            "booking_total": round(booking_total, 2),
            "preferences": {"budget_tier": preferences.budget_tier if preferences else None,
                            "interests": preferences.interests if preferences else [],
                            "accommodation_types": preferences.accommodation_types if preferences else [],
                            "transport_preferences": preferences.transport_preferences if preferences else [],
                            "dietary_requirements": preferences.dietary_requirements if preferences else [],
                            "special_requests": preferences.special_requests if preferences else None},
            "itinerary": itinerary, "bookings": bookings, "alerts": alerts,
            "allowed_reference_ids": list(references),
        }
        return payload, references

    @staticmethod
    def _fallback(message: str, payload: Dict[str, Any]) -> AssistantCrewOutput:
        text = message.lower()
        if any(word in text for word in ("change", "cancel", "book ", "reserve", "add ", "remove")):
            response = "This assistant is read-only. Use the relevant explicit trip or booking operation to make that change."
        elif "cost" in text or "price" in text or "budget" in text:
            response = (f"Your trip budget is {payload['currency']} {payload['total_budget']:,.0f}. "
                        f"The validated itinerary items currently total about {payload['currency']} "
                        f"{payload['itinerary_catalog_total']:,.0f}, and recorded bookings total "
                        f"{payload['currency']} {payload['booking_total']:,.0f}.")
        elif "hotel" in text or "stay" in text:
            hotel = next((item for item in payload["itinerary"] if item["item_type"] == "hotel"), None)
            response = f"Your current accommodation is {hotel['title']}." if hotel else "No catalog accommodation is selected in this trip itinerary."
        elif "transport" in text or "travel" in text:
            transport = next((item for item in payload["itinerary"] if item["item_type"] == "transport"), None)
            response = f"Your planned transportation is {transport['title']}." if transport else "No catalog transportation is selected in this trip itinerary."
        elif "booking" in text or "reservation" in text:
            response = f"This trip has {len(payload['bookings'])} recorded booking(s)."
        elif "preference" in text:
            prefs = payload["preferences"]
            response = (f"Your current interests are: {', '.join(prefs['interests']) or 'not specified'}. "
                        f"Accommodation preferences: {', '.join(prefs['accommodation_types']) or 'not specified'}. "
                        f"Transport preferences: {', '.join(prefs['transport_preferences']) or 'not specified'}.")
        elif "activity" in text or "activities" in text or "day" in text or "tomorrow" in text:
            day_number = AssistantService._requested_day(text)
            items = [item for item in payload["itinerary"] if day_number is None or item["day_number"] == day_number]
            if "activity" in text or "activities" in text:
                items = [item for item in items if item["item_type"] == "activity"]
            response = AssistantService._format_items(items, payload["currency"], day_number)
        else:
            response = (f"Your {payload['duration_days']}-day {payload['destination']} trip is currently "
                        f"{payload['trip_status']} for {payload['traveler_count']} traveler(s), with "
                        f"{len(payload['itinerary'])} itinerary item(s).")
        return AssistantCrewOutput(response=response, referenced_ids=[], suggested_actions=[])

    @staticmethod
    def _requested_day(text: str) -> Optional[int]:
        match = re.search(r"\bday\s*(\d+)\b", text)
        if match:
            return int(match.group(1))
        if "tomorrow" in text:
            return 2
        return None

    @staticmethod
    def _format_items(items: List[Dict[str, Any]], currency: str, day_number: Optional[int]) -> str:
        if not items:
            if day_number is not None:
                return f"No validated itinerary items are planned for Day {day_number}."
            return "No validated itinerary items are currently planned."
        prefix = f"Day {day_number}: " if day_number is not None else "Current plan: "
        details = []
        for item in items[:6]:
            time_range = " ".join(part for part in (item.get("start_time"), item.get("end_time")) if part)
            cost = f"{currency} {item['catalog_cost']:,.0f}" if item.get("catalog_cost") is not None else None
            bits = [item["title"], item.get("status"), time_range or None, cost]
            details.append(" (".join([bits[0], ", ".join(str(bit) for bit in bits[1:] if bit)]) + ")" if any(bits[1:]) else bits[0])
        return prefix + "; ".join(details)

    @staticmethod
    def _result(trip: Trip, message: str, references: Dict[str, AssistantReference], output: AssistantCrewOutput,
                source: str) -> AssistantChatResult:
        if len(output.referenced_ids) != len(set(output.referenced_ids)):
            raise AssistantValidationError("Assistant output repeats a reference ID")
        selected = []
        for reference_id in output.referenced_ids:
            reference = references.get(reference_id)
            if not reference:
                raise AssistantValidationError("Assistant output references data outside the validated trip context")
            selected.append(reference)
        return AssistantChatResult(trip_id=trip.id, message=message, response=output.response,
                                   references=selected, suggested_actions=output.suggested_actions,
                                   source=source, context_validated=True)
