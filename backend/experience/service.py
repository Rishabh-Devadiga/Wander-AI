"""Catalog-grounded, non-mutating experience recommendation service."""

from typing import Any, Dict, Iterable

from sqlalchemy.orm import Session

from backend.experience.crew import ExperienceCrew
from backend.models.models import Activity, Destination
from backend.schemas.schemas import (
    ExperienceContext, ExperienceOption, ExperienceResult, ExperienceSelection,
)


class ExperienceExecutionError(Exception):
    """Raised when AI experience output cannot be safely validated."""


class ExperienceRecommendationService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: ExperienceContext) -> ExperienceResult:
        destination = self.db.query(Destination).filter(
            (Destination.name.ilike(context.destination.strip())) | (Destination.slug.ilike(context.destination.strip()))
        ).first()
        if not destination:
            raise LookupError("Destination is not present in the TourFlow catalog")
        candidates = self._filter_candidates(destination, context)
        if not candidates:
            raise LookupError("No active catalog experiences match the requested constraints")
        if not self.gemini_service.is_available():
            return self._result(destination.name, candidates, self._fallback(candidates, context), "catalog_fallback")
        try:
            output = ExperienceCrew(self.gemini_service).run(
                context.model_dump(mode="json", exclude_none=True),
                [self._candidate_payload(item) for item in candidates],
            )
            return self._result(destination.name, candidates, output.selections, "crewai")
        except Exception as exc:
            raise ExperienceExecutionError("Experience recommendations could not be validated") from exc

    def _filter_candidates(self, destination: Destination, context: ExperienceContext) -> list[Activity]:
        query = self.db.query(Activity).filter(
            Activity.destination_id == destination.id,
            Activity.is_active == True,
            Activity.currency == context.currency.upper(),
        )
        if context.category:
            query = query.filter(Activity.category == context.category.strip().lower())
        if context.difficulty_level:
            query = query.filter(Activity.difficulty_level == context.difficulty_level.strip().lower())
        if context.max_price_per_person is not None:
            query = query.filter(Activity.price_per_person <= context.max_price_per_person)
        if context.max_duration_hours is not None:
            query = query.filter(Activity.duration_hours <= context.max_duration_hours)
        return query.order_by(Activity.rating.desc(), Activity.price_per_person.asc(), Activity.duration_hours.asc()).all()

    @staticmethod
    def _candidate_payload(item: Activity) -> Dict[str, Any]:
        return {
            "activity_id": item.id, "title": item.title, "category": item.category,
            "duration_hours": item.duration_hours, "price_per_person": item.price_per_person,
            "currency": item.currency, "difficulty_level": item.difficulty_level, "rating": item.rating,
            "description": item.description, "meeting_point": item.meeting_point,
        }

    @staticmethod
    def _fallback(candidates: Iterable[Activity], context: ExperienceContext) -> list[ExperienceSelection]:
        matched = list((context.preferences.interests if context.preferences else None) or [])
        if context.category:
            matched.append(context.category)
        if context.difficulty_level:
            matched.append(context.difficulty_level)
        return [
            ExperienceSelection(
                activity_id=item.id,
                recommendation_reason="Ranked from active catalog experiences by rating, price, and duration.",
                matched_preferences=matched,
            )
            for item in list(candidates)[:5]
        ]

    @staticmethod
    def _result(
        destination: str,
        candidates: list[Activity],
        selections: Iterable[ExperienceSelection],
        source: str,
    ) -> ExperienceResult:
        by_id = {item.id: item for item in candidates}
        options, seen = [], set()
        for selection in selections:
            item = by_id.get(selection.activity_id)
            if item is None:
                raise ValueError("AI selected activity outside the validated catalog candidates")
            if item.id in seen:
                continue
            seen.add(item.id)
            options.append(ExperienceOption(
                activity_id=item.id, title=item.title, category=item.category,
                duration_hours=item.duration_hours, price_per_person=item.price_per_person,
                currency=item.currency, difficulty_level=item.difficulty_level, rating=item.rating,
                description=item.description, meeting_point=item.meeting_point,
                recommendation_reason=selection.recommendation_reason,
                matched_preferences=selection.matched_preferences,
            ))
        if not options:
            raise ValueError("Experience selection is empty")
        return ExperienceResult(
            destination=destination, recommended_options=options, source=source, catalog_validated=True,
        )
