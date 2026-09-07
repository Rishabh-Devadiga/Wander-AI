"""Catalog-grounded, non-mutating transportation recommendation service."""

from typing import Any, Dict, Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.models import Destination, TransportOption
from backend.schemas.schemas import (
    TransportationContext, TransportationOption as TransportationResultOption,
    TransportationResult, TransportationSelection,
)
from backend.transportation.crew import TransportationCrew


class TransportationExecutionError(Exception):
    """Raised when AI transportation output cannot be safely validated."""


class TransportationRecommendationService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: TransportationContext) -> TransportationResult:
        destination = self.db.query(Destination).filter(
            (Destination.name.ilike(context.destination.strip())) | (Destination.slug.ilike(context.destination.strip()))
        ).first()
        if not destination:
            raise LookupError("Destination is not present in the TourFlow catalog")
        candidates = self._filter_candidates(destination, context)
        if not candidates:
            raise LookupError("No active catalog transportation options match the requested constraints")
        if not self.gemini_service.is_available():
            return self._result(destination.name, context.origin, candidates, self._fallback(candidates, context), "catalog_fallback")
        try:
            output = TransportationCrew(self.gemini_service).run(
                context.model_dump(mode="json", exclude_none=True), [self._candidate_payload(item) for item in candidates]
            )
            return self._result(destination.name, context.origin, candidates, output.selections, "crewai")
        except Exception as exc:
            raise TransportationExecutionError("Transportation recommendations could not be validated") from exc

    def _filter_candidates(self, destination: Destination, context: TransportationContext) -> list[TransportOption]:
        query = self.db.query(TransportOption).filter(
            TransportOption.destination_id == destination.id, TransportOption.is_active == True,
            TransportOption.currency == context.currency.upper(), TransportOption.capacity >= context.traveler_count,
            func.lower(TransportOption.route_from).contains(context.origin.strip().lower()),
        )
        if context.transport_type:
            query = query.filter(TransportOption.type == context.transport_type.strip().lower())
        if context.max_price is not None:
            query = query.filter(TransportOption.price <= context.max_price)
        if context.max_duration_hours is not None:
            query = query.filter(TransportOption.duration_hours <= context.max_duration_hours)
        return query.order_by(TransportOption.duration_hours.asc(), TransportOption.price.asc()).all()

    @staticmethod
    def _candidate_payload(item: TransportOption) -> Dict[str, Any]:
        return {"transport_id": item.id, "type": item.type, "name": item.name, "route_from": item.route_from,
                "route_to": item.route_to, "duration_hours": item.duration_hours, "price": item.price,
                "currency": item.currency, "capacity": item.capacity, "features": item.features or []}

    @staticmethod
    def _fallback(candidates: Iterable[TransportOption], context: TransportationContext) -> list[TransportationSelection]:
        matched = list((context.preferences.transport_preferences if context.preferences else None) or [])
        if context.transport_type:
            matched.append(context.transport_type)
        return [TransportationSelection(transport_id=item.id, recommendation_reason="Ranked from active catalog candidates by duration and price.", matched_preferences=matched)
                for item in list(candidates)[:5]]

    @staticmethod
    def _result(destination: str, origin: str, candidates: list[TransportOption], selections: Iterable[TransportationSelection], source: str) -> TransportationResult:
        by_id = {item.id: item for item in candidates}
        options, seen = [], set()
        for selection in selections:
            item = by_id.get(selection.transport_id)
            if item is None:
                raise ValueError("AI selected transport outside the validated catalog candidates")
            if item.id in seen:
                continue
            seen.add(item.id)
            options.append(TransportationResultOption(transport_id=item.id, type=item.type, name=item.name,
                route_from=item.route_from, route_to=item.route_to, duration_hours=item.duration_hours,
                price=item.price, currency=item.currency, capacity=item.capacity, features=item.features or [],
                recommendation_reason=selection.recommendation_reason, matched_preferences=selection.matched_preferences))
        if not options:
            raise ValueError("Transportation selection is empty")
        return TransportationResult(origin=origin, destination=destination, recommended_options=options,
                                    source=source, catalog_validated=True)
