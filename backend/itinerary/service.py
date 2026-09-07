"""Catalog-grounded, non-mutating itinerary recommendation service."""

from typing import Any, Dict, Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.itinerary.crew import ItineraryCrew
from backend.models.models import Activity, Destination, Hotel, TransportOption
from backend.schemas.schemas import (
    ItineraryCatalogHotel, ItineraryCatalogTransport,
    ItineraryContext, ItineraryCrewDay, ItineraryCrewOutput, ItineraryDay,
    ItineraryItemRecommendation, ItineraryResult,
)


class ItineraryExecutionError(Exception):
    """Raised when CrewAI itinerary output cannot be safely validated."""


class ItineraryValidationError(Exception):
    """Raised when valid catalog selections cannot satisfy trip constraints."""


class ItineraryRecommendationService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: ItineraryContext) -> ItineraryResult:
        destination = self.db.query(Destination).filter(
            (Destination.name.ilike(context.destination.strip())) | (Destination.slug.ilike(context.destination.strip()))
        ).first()
        if not destination:
            raise LookupError("Destination is not present in the TourFlow catalog")
        hotels, transports, activities = self._filter_candidates(destination, context)
        if not hotels or not transports or not activities:
            raise LookupError("Active catalog inventory cannot satisfy itinerary requirements")
        if context.duration_days > len(activities) + 1:
            raise ItineraryValidationError("Not enough distinct active catalog activities for the requested duration")

        catalog = self._catalog_payload(hotels, transports, activities)
        if not self.gemini_service.is_available():
            output = self._fallback(hotels, transports, activities, context)
            return self._result(destination.name, context, hotels, transports, activities, output, "catalog_fallback")
        try:
            output = ItineraryCrew(self.gemini_service).run(
                context.model_dump(mode="json", exclude_none=True), catalog,
            )
            return self._result(destination.name, context, hotels, transports, activities, output, "crewai")
        except ItineraryValidationError:
            raise
        except Exception as exc:
            raise ItineraryExecutionError("Itinerary recommendations could not be validated") from exc

    def _filter_candidates(
        self, destination: Destination, context: ItineraryContext,
    ) -> tuple[list[Hotel], list[TransportOption], list[Activity]]:
        hotels = self.db.query(Hotel).filter(
            Hotel.destination_id == destination.id, Hotel.is_active == True,
            Hotel.currency == context.currency.upper(),
        ).order_by(Hotel.rating.desc(), Hotel.price_per_night.asc()).all()
        transports_query = self.db.query(TransportOption).filter(
            TransportOption.destination_id == destination.id, TransportOption.is_active == True,
            TransportOption.currency == context.currency.upper(),
            TransportOption.capacity >= context.traveler_count,
        )
        if context.origin:
            transports_query = transports_query.filter(
                func.lower(TransportOption.route_from).contains(context.origin.strip().lower())
            )
        transports = transports_query.order_by(TransportOption.duration_hours.asc(), TransportOption.price.asc()).all()
        activities = self.db.query(Activity).filter(
            Activity.destination_id == destination.id, Activity.is_active == True,
            Activity.currency == context.currency.upper(),
        ).order_by(Activity.rating.desc(), Activity.price_per_person.asc(), Activity.duration_hours.asc()).all()
        return hotels, transports, activities

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

    def _fallback(
        self, hotels: list[Hotel], transports: list[TransportOption], activities: list[Activity], context: ItineraryContext,
    ) -> ItineraryCrewOutput:
        selected_activities = activities[:context.duration_days - 1]
        days = [ItineraryCrewDay(day_number=1, activity_ids=[])] + [
            ItineraryCrewDay(day_number=index, activity_ids=[activity.id])
            for index, activity in enumerate(selected_activities, start=2)
        ]
        for hotel in hotels:
            for transport in transports:
                output = ItineraryCrewOutput(hotel_id=hotel.id, transport_id=transport.id, days=days)
                if self._catalog_cost(hotel, transport, selected_activities, context) <= context.total_budget:
                    return output
        raise ItineraryValidationError("No catalog-backed itinerary fits the requested budget")

    def _result(
        self, destination: str, context: ItineraryContext, hotels: list[Hotel], transports: list[TransportOption],
        activities: list[Activity], output: ItineraryCrewOutput, source: str,
    ) -> ItineraryResult:
        hotel = {item.id: item for item in hotels}.get(output.hotel_id)
        transport = {item.id: item for item in transports}.get(output.transport_id)
        if not hotel or not transport:
            raise ItineraryValidationError("AI selected catalog inventory outside validated candidates")
        days = self._validate_and_rebuild_days(output.days, activities, context.duration_days)
        activity_records = {item.id: item for item in activities}
        selected_records = [
            activity_records[item.activity_id]
            for day in days for item in day.items if item.activity_id
        ]
        total_cost = self._catalog_cost(hotel, transport, selected_records, context)
        if total_cost > context.total_budget:
            raise ItineraryValidationError("Selected catalog itinerary exceeds the requested budget")
        days[0].items.insert(0, self._transport_item(transport))
        return ItineraryResult(
            destination=destination, duration_days=context.duration_days,
            accommodation=self._hotel_fact(hotel), transportation=self._transport_fact(transport),
            itinerary_days=days, total_catalog_cost=total_cost, currency=context.currency.upper(),
            source=source, catalog_validated=True,
        )

    @staticmethod
    def _validate_and_rebuild_days(
        crew_days: list[ItineraryCrewDay], activities: list[Activity], duration_days: int,
    ) -> list[ItineraryDay]:
        if [day.day_number for day in crew_days] != list(range(1, duration_days + 1)):
            raise ItineraryValidationError("AI itinerary days do not match requested duration")
        by_id, seen, result = {item.id: item for item in activities}, set(), []
        for day in crew_days:
            if day.day_number == 1 and day.activity_ids:
                raise ItineraryValidationError("Arrival day cannot contain catalog activities")
            if day.day_number > 1 and not day.activity_ids:
                raise ItineraryValidationError("Each non-arrival day requires a catalog activity")
            current = []
            current_time = 9.0
            for activity_id in day.activity_ids:
                activity = by_id.get(activity_id)
                if activity is None or activity_id in seen:
                    raise ItineraryValidationError("AI selected an invalid or repeated catalog activity")
                if current_time + activity.duration_hours > 23:
                    raise ItineraryValidationError("Catalog activities cannot be scheduled without overlap")
                seen.add(activity_id)
                end_time = current_time + activity.duration_hours
                current.append(ItineraryItemRecommendation(
                    item_type="activity", activity_id=activity.id, title=activity.title,
                    start_time=ItineraryRecommendationService._time(current_time),
                    end_time=ItineraryRecommendationService._time(end_time),
                    cost=activity.price_per_person, currency=activity.currency,
                    description=activity.description, location=activity.meeting_point,
                ))
                current_time = end_time + 1
            result.append(ItineraryDay(day_number=day.day_number, items=current))
        return result

    @staticmethod
    def _transport_item(transport: TransportOption) -> ItineraryItemRecommendation:
        end_time = min(23.5, 8 + transport.duration_hours)
        return ItineraryItemRecommendation(
            item_type="transport", transport_id=transport.id, title=transport.name,
            start_time="08:00", end_time=ItineraryRecommendationService._time(end_time),
            cost=transport.price, currency=transport.currency,
            description=f"{transport.route_from} to {transport.route_to}", location=transport.route_from,
        )

    @staticmethod
    def _catalog_cost(hotel: Hotel, transport: TransportOption, activities: Iterable[Activity], context: ItineraryContext) -> float:
        nights = max(1, context.duration_days - 1)
        return round(hotel.price_per_night * nights + transport.price + sum(
            item.price_per_person * context.traveler_count for item in activities
        ), 2)

    @staticmethod
    def _time(value: float) -> str:
        minutes = int(round(value * 60))
        return f"{minutes // 60:02d}:{minutes % 60:02d}"

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
