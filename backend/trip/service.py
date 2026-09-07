"""Catalog-grounded, non-mutating trip management recommendation service."""

from typing import Any, Dict, Iterable

from sqlalchemy.orm import Session

from backend.models.models import Activity, Hotel, ItineraryItem, TransportOption, Trip
from backend.schemas.schemas import (
    ItineraryCatalogHotel, ItineraryCatalogTransport, TripManagementActivity,
    TripManagementContext, TripManagementCrewOutput, TripManagementItineraryReference,
    TripManagementResult,
)
from backend.trip.crew import TripManagementCrew


class TripManagementExecutionError(Exception):
    """Raised when CrewAI trip-management output cannot be safely validated."""


class TripManagementValidationError(Exception):
    """Raised when trip or catalog constraints cannot produce a safe management view."""


class TripManagementService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: TripManagementContext) -> TripManagementResult:
        trip = self.db.query(Trip).filter(Trip.id == context.trip_id).first()
        if not trip:
            raise LookupError("Trip is not present in the TourFlow catalog")
        if not trip.destination:
            raise TripManagementValidationError("Trip does not have a catalog destination")
        hotels, transports, activities = self._filter_candidates(trip)
        if not hotels or not transports or not activities:
            raise LookupError("Active catalog inventory cannot satisfy trip management requirements")
        itinerary_references = self._validated_itinerary_references(trip, hotels, transports, activities)
        catalog = self._catalog_payload(hotels, transports, activities)
        if not self.gemini_service.is_available():
            output = self._fallback(hotels, transports, activities, trip)
            return self._result(trip, hotels, transports, activities, itinerary_references, output, "catalog_fallback")
        try:
            output = TripManagementCrew(self.gemini_service).run(self._trip_context(trip), catalog)
            return self._result(trip, hotels, transports, activities, itinerary_references, output, "crewai")
        except TripManagementValidationError:
            raise
        except Exception as exc:
            raise TripManagementExecutionError("Trip-management recommendations could not be validated") from exc

    @staticmethod
    def _filter_candidates(trip: Trip) -> tuple[list[Hotel], list[TransportOption], list[Activity]]:
        hotels = [item for item in trip.destination.hotels if item.is_active and item.currency == trip.currency.upper()]
        transports = [item for item in trip.destination.transport_options if item.is_active
                      and item.currency == trip.currency.upper() and item.capacity >= trip.traveler_count]
        activities = [item for item in trip.destination.activities if item.is_active and item.currency == trip.currency.upper()]
        hotels.sort(key=lambda item: (-item.rating, item.price_per_night))
        transports.sort(key=lambda item: (item.duration_hours, item.price))
        activities.sort(key=lambda item: (-item.rating, item.price_per_person, item.duration_hours))
        return hotels, transports, activities

    @staticmethod
    def _trip_context(trip: Trip) -> Dict[str, Any]:
        return {
            "trip_id": trip.id, "destination": trip.destination.name, "duration_days": trip.duration_days,
            "total_budget": trip.total_budget, "currency": trip.currency, "traveler_count": trip.traveler_count,
            "pace": trip.pace, "preferences": {
                "budget_tier": trip.preferences.budget_tier if trip.preferences else None,
                "interests": (trip.preferences.interests if trip.preferences else None) or [],
                "accommodation_types": (trip.preferences.accommodation_types if trip.preferences else None) or [],
                "transport_preferences": (trip.preferences.transport_preferences if trip.preferences else None) or [],
            },
            "existing_booking_count": len(trip.bookings),
            "itinerary_catalog_ids": [{"hotel_id": item.hotel_id, "transport_id": item.transport_id,
                                         "activity_id": item.activity_id} for item in trip.itinerary],
        }

    @staticmethod
    def _catalog_payload(
        hotels: Iterable[Hotel], transports: Iterable[TransportOption], activities: Iterable[Activity],
    ) -> Dict[str, list[Dict[str, Any]]]:
        return {
            "hotels": [{"hotel_id": item.id, "name": item.name, "category": item.category,
                        "price_per_night": item.price_per_night, "currency": item.currency,
                        "rating": item.rating, "address": item.address, "amenities": item.amenities or []}
                       for item in hotels],
            "transports": [{"transport_id": item.id, "type": item.type, "name": item.name,
                            "route_from": item.route_from, "route_to": item.route_to,
                            "duration_hours": item.duration_hours, "price": item.price,
                            "currency": item.currency, "capacity": item.capacity,
                            "features": item.features or []} for item in transports],
            "activities": [{"activity_id": item.id, "title": item.title, "category": item.category,
                            "duration_hours": item.duration_hours, "price_per_person": item.price_per_person,
                            "currency": item.currency, "difficulty_level": item.difficulty_level,
                            "rating": item.rating, "description": item.description,
                            "meeting_point": item.meeting_point} for item in activities],
        }

    @staticmethod
    def _fallback(
        hotels: list[Hotel], transports: list[TransportOption], activities: list[Activity], trip: Trip,
    ) -> TripManagementCrewOutput:
        for hotel in hotels:
            for transport in transports:
                selected = activities[:min(5, max(1, trip.duration_days - 1))]
                total = TripManagementService._catalog_cost(hotel, transport, selected, trip)
                if total <= trip.total_budget:
                    return TripManagementCrewOutput(
                        hotel_id=hotel.id, transport_id=transport.id,
                        activity_ids=[item.id for item in selected],
                        management_notes=["Catalog-backed selections are ready for an explicit booking action."],
                    )
        raise TripManagementValidationError("No catalog-backed trip-management selection fits the trip budget")

    def _validated_itinerary_references(
        self, trip: Trip, hotels: list[Hotel], transports: list[TransportOption], activities: list[Activity],
    ) -> list[TripManagementItineraryReference]:
        hotel_ids, transport_ids, activity_ids = ({item.id for item in hotels}, {item.id for item in transports}, {item.id for item in activities})
        references = []
        for item in trip.itinerary:
            if item.hotel_id and item.hotel_id not in hotel_ids:
                raise TripManagementValidationError("Trip itinerary references an inactive or unknown hotel")
            if item.transport_id and item.transport_id not in transport_ids:
                raise TripManagementValidationError("Trip itinerary references an inactive or unknown transport option")
            if item.activity_id and item.activity_id not in activity_ids:
                raise TripManagementValidationError("Trip itinerary references an inactive or unknown activity")
            if item.hotel_id or item.transport_id or item.activity_id:
                references.append(TripManagementItineraryReference(
                    itinerary_item_id=item.id, day_number=item.day_number, order_index=item.order_index,
                    item_type=item.item_type, hotel_id=item.hotel_id, transport_id=item.transport_id,
                    activity_id=item.activity_id, status=item.status,
                ))
        return references

    def _result(
        self, trip: Trip, hotels: list[Hotel], transports: list[TransportOption], activities: list[Activity],
        itinerary_references: list[TripManagementItineraryReference], output: TripManagementCrewOutput, source: str,
    ) -> TripManagementResult:
        hotel = {item.id: item for item in hotels}.get(output.hotel_id)
        transport = {item.id: item for item in transports}.get(output.transport_id)
        activity_map = {item.id: item for item in activities}
        selected_activities = [activity_map.get(item_id) for item_id in output.activity_ids]
        if not hotel or not transport or any(item is None for item in selected_activities):
            raise TripManagementValidationError("AI selected inventory outside validated catalog candidates")
        if len(set(output.activity_ids)) != len(output.activity_ids):
            raise TripManagementValidationError("AI selected duplicate catalog activities")
        selected = [item for item in selected_activities if item]
        total = self._catalog_cost(hotel, transport, selected, trip)
        if total > trip.total_budget:
            raise TripManagementValidationError("Selected catalog plan exceeds the trip budget")
        readiness = "has_existing_bookings" if trip.bookings else "ready_for_explicit_booking"
        return TripManagementResult(
            trip_id=trip.id, destination=trip.destination.name, accommodation=self._hotel_fact(hotel),
            transportation=self._transport_fact(transport), activities=[self._activity_fact(item) for item in selected],
            itinerary_references=itinerary_references, total_catalog_cost=total, currency=trip.currency.upper(),
            booking_readiness=readiness, existing_booking_count=len(trip.bookings),
            management_notes=output.management_notes, source=source, catalog_validated=True,
        )

    @staticmethod
    def _catalog_cost(hotel: Hotel, transport: TransportOption, activities: Iterable[Activity], trip: Trip) -> float:
        return round(hotel.price_per_night * max(1, trip.duration_days - 1) + transport.price + sum(
            item.price_per_person * trip.traveler_count for item in activities
        ), 2)

    @staticmethod
    def _hotel_fact(item: Hotel) -> ItineraryCatalogHotel:
        return ItineraryCatalogHotel(hotel_id=item.id, name=item.name, category=item.category,
            price_per_night=item.price_per_night, currency=item.currency, rating=item.rating,
            address=item.address, amenities=item.amenities or [], description=item.description)

    @staticmethod
    def _transport_fact(item: TransportOption) -> ItineraryCatalogTransport:
        return ItineraryCatalogTransport(transport_id=item.id, type=item.type, name=item.name,
            route_from=item.route_from, route_to=item.route_to, duration_hours=item.duration_hours,
            price=item.price, currency=item.currency, capacity=item.capacity, features=item.features or [])

    @staticmethod
    def _activity_fact(item: Activity) -> TripManagementActivity:
        return TripManagementActivity(activity_id=item.id, title=item.title, category=item.category,
            duration_hours=item.duration_hours, price_per_person=item.price_per_person, currency=item.currency,
            difficulty_level=item.difficulty_level, rating=item.rating, description=item.description,
            meeting_point=item.meeting_point)
