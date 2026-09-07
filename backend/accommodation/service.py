"""Catalog-grounded, non-mutating accommodation recommendation service."""

from typing import Any, Dict, Iterable

from sqlalchemy.orm import Session

from backend.accommodation.crew import AccommodationCrew
from backend.models.models import Destination, Hotel
from backend.schemas.schemas import (
    AccommodationContext, AccommodationCrewOutput, AccommodationOption,
    AccommodationResult, AccommodationSelection,
)


class AccommodationExecutionError(Exception):
    """Raised when AI accommodation output cannot be safely validated."""


class AccommodationRecommendationService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: AccommodationContext) -> AccommodationResult:
        destination = self.db.query(Destination).filter(
            (Destination.name.ilike(context.destination.strip())) | (Destination.slug.ilike(context.destination.strip()))
        ).first()
        if not destination:
            raise LookupError("Destination is not present in the TourFlow catalog")
        candidates = self._filter_candidates(destination, context)
        if not candidates:
            raise LookupError("No active catalog accommodations match the requested constraints")
        traveler_context = context.model_dump(mode="json", exclude_none=True)
        if not self.gemini_service.is_available():
            selections = self._fallback_selections(candidates, context)
            return self._result(destination.name, candidates, selections, "catalog_fallback")
        try:
            candidate_payload = [self._candidate_payload(hotel) for hotel in candidates]
            output = AccommodationCrew(self.gemini_service).run(traveler_context, candidate_payload)
            return self._result(destination.name, candidates, output.selections, "crewai")
        except Exception as exc:
            raise AccommodationExecutionError("Accommodation recommendations could not be validated") from exc

    def _filter_candidates(self, destination: Destination, context: AccommodationContext) -> list[Hotel]:
        query = self.db.query(Hotel).filter(Hotel.destination_id == destination.id, Hotel.is_active == True)
        if context.currency:
            query = query.filter(Hotel.currency == context.currency.upper())
        if context.max_price_per_night is not None:
            query = query.filter(Hotel.price_per_night <= context.max_price_per_night)
        hotels = query.order_by(Hotel.rating.desc(), Hotel.price_per_night.asc()).all()
        requested_categories = {value.strip().lower() for value in ((context.preferences.accommodation_types if context.preferences else None) or []) if value.strip()}
        if requested_categories:
            hotels = [hotel for hotel in hotels if hotel.category.lower() in requested_categories]
        required_amenities = [value.strip().lower() for value in context.required_amenities if value.strip()]
        if required_amenities:
            hotels = [hotel for hotel in hotels if all(any(requirement in amenity.lower() for amenity in (hotel.amenities or [])) for requirement in required_amenities)]
        return hotels

    @staticmethod
    def _candidate_payload(hotel: Hotel) -> Dict[str, Any]:
        return {"hotel_id": hotel.id, "name": hotel.name, "category": hotel.category,
                "price_per_night": hotel.price_per_night, "currency": hotel.currency,
                "rating": hotel.rating, "address": hotel.address, "amenities": hotel.amenities or [],
                "description": hotel.description}

    @staticmethod
    def _fallback_selections(candidates: Iterable[Hotel], context: AccommodationContext) -> list[AccommodationSelection]:
        matched = list((context.preferences.accommodation_types if context.preferences else None) or []) + list(context.required_amenities)
        return [AccommodationSelection(hotel_id=hotel.id, recommendation_reason="Ranked from active catalog candidates by rating and nightly price.", matched_preferences=matched)
                for hotel in list(candidates)[:5]]

    @staticmethod
    def _result(destination: str, candidates: list[Hotel], selections: Iterable[AccommodationSelection], source: str) -> AccommodationResult:
        by_id = {hotel.id: hotel for hotel in candidates}
        options = []
        seen = set()
        for selection in selections:
            hotel = by_id.get(selection.hotel_id)
            if hotel is None:
                raise ValueError("AI selected a hotel outside the validated catalog candidates")
            if hotel.id in seen:
                continue
            seen.add(hotel.id)
            options.append(AccommodationOption(hotel_id=hotel.id, name=hotel.name, category=hotel.category,
                price_per_night=hotel.price_per_night, currency=hotel.currency, rating=hotel.rating,
                address=hotel.address, amenities=hotel.amenities or [], description=hotel.description,
                recommendation_reason=selection.recommendation_reason,
                matched_preferences=selection.matched_preferences))
        if not options:
            raise ValueError("Accommodation selection is empty")
        return AccommodationResult(destination=destination, recommended_options=options, source=source, catalog_validated=True)
