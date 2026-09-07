"""Catalog-grounded, non-mutating destination research service."""

from typing import Any, Dict

from sqlalchemy.orm import Session

from backend.models.models import Destination
from backend.research.crew import ResearchCrew
from backend.schemas.schemas import ResearchContext, ResearchPlace, ResearchResult


class ResearchExecutionError(Exception):
    """Raised when AI research cannot be safely validated."""


class DestinationResearchService:
    def __init__(self, db: Session, gemini_service: Any):
        self.db = db
        self.gemini_service = gemini_service

    def execute(self, context: ResearchContext) -> ResearchResult:
        destination = self.db.query(Destination).filter(
            (Destination.name.ilike(context.destination.strip()))
            | (Destination.slug.ilike(context.destination.strip()))
        ).first()
        if not destination:
            raise LookupError("Destination is not present in the TourFlow catalog")

        catalog_context = {
            "name": destination.name,
            "state_region": destination.state_region,
            "country": destination.country,
            "description": destination.description,
            "best_time_to_visit": destination.best_time_to_visit,
            "tags": destination.tags or [],
        }
        traveler_context = context.model_dump(mode="json", exclude_none=True)

        if not self.gemini_service.is_available():
            return self._catalog_fallback(catalog_context, traveler_context)

        try:
            result = ResearchCrew(self.gemini_service).run(catalog_context, traveler_context)
            # Do not permit an AI response to replace the catalog identity.
            result.destination = destination.name
            result.source = "crewai" if result.source == "crewai" else "gemini"
            self._ensure_substantive(result)
            return result
        except Exception as exc:
            raise ResearchExecutionError("Destination research could not be validated") from exc

    @staticmethod
    def _ensure_substantive(result: ResearchResult) -> None:
        if not result.destination_summary.strip():
            raise ValueError("Research result is empty")

    @staticmethod
    def _catalog_fallback(catalog: Dict[str, Any], traveler: Dict[str, Any]) -> ResearchResult:
        interests = (traveler.get("preferences") or {}).get("interests") or []
        tags = catalog.get("tags") or []
        relevance = ", ".join(interests) if interests else "the stated travel preferences"
        area = ResearchPlace(
            name=catalog["name"], category="destination region",
            area_location=catalog["state_region"], description=catalog["description"],
            relevance_to_traveler=f"Use this destination context to evaluate {relevance}.",
            practical_notes="Specific stays, transport, activities, availability, and prices are intentionally outside research scope.",
        )
        seasonal = []
        if catalog.get("best_time_to_visit"):
            seasonal.append(f"Catalog guidance: best time to visit is {catalog['best_time_to_visit']}.")
        if not seasonal:
            seasonal.append("Confirm seasonal conditions nearer to travel before operational planning.")
        insights = [f"Catalog themes relevant to this destination: {', '.join(tags)}."] if tags else []
        if interests:
            insights.append(f"Research should emphasize the traveler interests: {', '.join(interests)}.")
        return ResearchResult(
            destination=catalog["name"], destination_summary=catalog["description"],
            recommended_areas=[area], key_places=[], attractions=[],
            travel_considerations=["This catalog-grounded result does not select inventory, make bookings, or create an itinerary."],
            seasonal_considerations=seasonal, preference_relevant_insights=insights,
            source="catalog_fallback",
        )
