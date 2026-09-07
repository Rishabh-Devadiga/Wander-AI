"""Catalog-grounded, non-mutating booking-readiness recommendation service."""

from collections import Counter
from typing import Any, Dict, Iterable

from sqlalchemy.orm import Session

from backend.booking.crew import BookingRecommendationCrew
from backend.models.models import Activity, Booking, Hotel, TransportOption, Trip
from backend.schemas.schemas import (
    BookingCrewOutput, BookingRecommendationContext, BookingRecommendationItem,
    BookingRecommendationResult,
)


class BookingRecommendationExecutionError(Exception):
    """Raised when CrewAI booking output cannot be safely validated."""


class BookingRecommendationValidationError(Exception):
    """Raised when canonical trip selections cannot be booked safely."""


class BookingRecommendationService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: BookingRecommendationContext) -> BookingRecommendationResult:
        trip = self.db.query(Trip).filter(Trip.id == context.trip_id).first()
        if not trip:
            raise LookupError("Trip is not present in the TourFlow catalog")
        if not trip.destination:
            raise BookingRecommendationValidationError("Trip does not have a catalog destination")
        if trip.traveler_count < 1:
            raise BookingRecommendationValidationError("Trip traveler count must be at least one")

        items, missing = self._booking_items(trip)
        endpoint = f"/api/trips/{trip.id}/lock-booking"
        if missing:
            return BookingRecommendationResult(
                trip_id=trip.id, destination=trip.destination.name, booking_items=[], total_catalog_cost=0.0,
                currency=trip.currency.upper(), booking_status="missing_selection",
                booking_readiness="booking_information_missing", existing_booking_count=len(trip.bookings),
                missing_requirements=missing, validation_notes=["No booking was created; add valid catalog selections through the explicit trip change routes."],
                explicit_booking_endpoint=endpoint, source="catalog_validation", catalog_validated=True,
            )

        total = round(sum(item.total_catalog_cost for item in items), 2)
        if total > trip.total_budget:
            return BookingRecommendationResult(
                trip_id=trip.id, destination=trip.destination.name, booking_items=items, total_catalog_cost=total,
                currency=trip.currency.upper(), booking_status="over_budget", booking_readiness="not_ready",
                existing_booking_count=len(trip.bookings), missing_requirements=[],
                validation_notes=["Catalog-derived booking total exceeds the trip budget; no booking was created."],
                explicit_booking_endpoint=endpoint, source="catalog_validation", catalog_validated=True,
            )

        if not self.gemini_service.is_available():
            output = BookingCrewOutput(booking_keys=[item.booking_key for item in items], booking_notes=[
                "Validated catalog selections are ready for the explicit booking route.",
            ])
            return self._result(trip, items, output, "catalog_fallback")
        try:
            output = BookingRecommendationCrew(self.gemini_service).run(
                self._trip_context(trip), [item.model_dump(mode="json") for item in items],
            )
            return self._result(trip, items, output, "crewai")
        except BookingRecommendationValidationError:
            raise
        except Exception as exc:
            raise BookingRecommendationExecutionError("Booking recommendations could not be validated") from exc

    def _booking_items(self, trip: Trip) -> tuple[list[BookingRecommendationItem], list[str]]:
        hotel_counts = Counter(item.hotel_id for item in trip.itinerary if item.hotel_id)
        transport_counts = Counter(item.transport_id for item in trip.itinerary if item.transport_id)
        activity_counts = Counter(item.activity_id for item in trip.itinerary if item.activity_id)
        missing = []
        if not hotel_counts:
            missing.append("A catalog accommodation selection is required.")
        if not transport_counts:
            missing.append("A catalog transportation selection is required.")
        if not activity_counts:
            missing.append("At least one catalog activity selection is required.")
        if missing:
            return [], missing

        existing = self._existing_bookings(trip.bookings)
        items = []
        for hotel_id, occurrences in hotel_counts.items():
            hotel = self._hotel(trip, hotel_id)
            nights = max(1, trip.duration_days - 1) if len(hotel_counts) == 1 else occurrences
            items.append(self._item("hotel", hotel.id, hotel.name, hotel.description, nights, hotel.price_per_night, hotel.currency, existing))
        for transport_id, occurrences in transport_counts.items():
            transport = self._transport(trip, transport_id)
            items.append(self._item("transport", transport.id, transport.name, f"{transport.route_from} to {transport.route_to}", occurrences, transport.price, transport.currency, existing))
        for activity_id, occurrences in activity_counts.items():
            activity = self._activity(trip, activity_id)
            quantity = occurrences * trip.traveler_count
            items.append(self._item("activity", activity.id, activity.title, activity.description, quantity, activity.price_per_person, activity.currency, existing))
        return items, []

    @staticmethod
    def _existing_bookings(bookings: Iterable[Booking]) -> Dict[tuple[str, str], Booking]:
        return {(booking.item_type, booking.item_id): booking for booking in bookings if booking.item_id}

    @staticmethod
    def _item(item_type: str, catalog_id: str, name: str, description: str | None, quantity: int,
              unit_cost: float, currency: str, existing: Dict[tuple[str, str], Booking]) -> BookingRecommendationItem:
        booking = existing.get((item_type, catalog_id))
        return BookingRecommendationItem(
            booking_key=f"{item_type}:{catalog_id}", item_type=item_type, catalog_id=catalog_id,
            name=name, description=description, quantity=quantity, unit_catalog_cost=unit_cost,
            total_catalog_cost=round(unit_cost * quantity, 2), currency=currency,
            existing_booking_reference=booking.booking_reference if booking else None,
            existing_booking_status=booking.status if booking else None,
            existing_payment_status=booking.payment_status if booking else None,
        )

    @staticmethod
    def _hotel(trip: Trip, hotel_id: str) -> Hotel:
        hotel = next((item for item in trip.destination.hotels if item.id == hotel_id), None)
        if not hotel or not hotel.is_active or hotel.currency != trip.currency.upper():
            raise BookingRecommendationValidationError("Trip references an inactive or unknown catalog hotel")
        return hotel

    @staticmethod
    def _transport(trip: Trip, transport_id: str) -> TransportOption:
        transport = next((item for item in trip.destination.transport_options if item.id == transport_id), None)
        if (not transport or not transport.is_active or transport.currency != trip.currency.upper()
                or transport.capacity < trip.traveler_count):
            raise BookingRecommendationValidationError("Trip references an inactive, unknown, or insufficient-capacity transport option")
        return transport

    @staticmethod
    def _activity(trip: Trip, activity_id: str) -> Activity:
        activity = next((item for item in trip.destination.activities if item.id == activity_id), None)
        if (not activity or not activity.is_active or activity.currency != trip.currency.upper()
                or activity.duration_hours <= 0):
            raise BookingRecommendationValidationError("Trip references an inactive, unknown, or invalid catalog activity")
        return activity

    @staticmethod
    def _trip_context(trip: Trip) -> Dict[str, Any]:
        return {
            "trip_id": trip.id, "destination": trip.destination.name, "traveler_count": trip.traveler_count,
            "duration_days": trip.duration_days, "total_budget": trip.total_budget, "currency": trip.currency,
            "existing_booking_count": len(trip.bookings),
        }

    @staticmethod
    def _result(trip: Trip, items: list[BookingRecommendationItem], output: BookingCrewOutput, source: str) -> BookingRecommendationResult:
        expected = {item.booking_key for item in items}
        if len(output.booking_keys) != len(set(output.booking_keys)) or set(output.booking_keys) != expected:
            raise BookingRecommendationValidationError("AI booking output did not preserve the validated catalog selections")
        return BookingRecommendationResult(
            trip_id=trip.id, destination=trip.destination.name, booking_items=items,
            total_catalog_cost=round(sum(item.total_catalog_cost for item in items), 2), currency=trip.currency.upper(),
            booking_status="ready", booking_readiness="has_existing_bookings" if trip.bookings else "ready_for_explicit_booking",
            existing_booking_count=len(trip.bookings), missing_requirements=[], validation_notes=output.booking_notes,
            explicit_booking_endpoint=f"/api/trips/{trip.id}/lock-booking", source=source, catalog_validated=True,
        )
