"""Single-purpose CrewAI workflow for catalog-bounded itinerary planning."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import ItineraryCrewOutput


class ItineraryCrew:
    """Selects catalog IDs and assigns already-validated activities to days."""

    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, trip_context: Dict[str, Any], catalog: Dict[str, list[Dict[str, Any]]]) -> ItineraryCrewOutput:
        try:
            if os.name == "nt":
                import crewai_core.paths as crewai_paths

                storage_path = Path(tempfile.gettempdir()) / "tourflow-crewai"
                storage_path.mkdir(parents=True, exist_ok=True)
                crewai_paths.db_storage_path = lambda: str(storage_path)
            from crewai import Agent, Crew, LLM, Process, Task
        except ImportError as exc:
            raise RuntimeError("CrewAI is not installed") from exc

        model_name = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        if model_name in {"gemini-2.5-flash", "gemini/gemini-2.5-flash"}:
            model_name = "gemini-3.1-flash-lite"
        if not model_name.startswith("gemini/"):
            model_name = f"gemini/{model_name}"
        agent = Agent(
            role="Itinerary Planning Specialist",
            goal="Build a logical multi-day itinerary using only supplied verified catalog candidates.",
            backstory=("You choose catalog-backed hotels, transport, and activities. You never invent IDs, "
                       "prices, ratings, descriptions, availability, bookings, or itinerary inventory."),
            llm=LLM(model=model_name, api_key=self.gemini_service.api_key),
            allow_delegation=False, max_iter=1, max_execution_time=30,
        )
        task = Task(
            description=(
                "Select exactly one `hotel_id`, exactly one `transport_id`, and a `days` list containing "
                "each requested day number from this verified catalog JSON only: {catalog}. Use this trip "
                "context: {trip_context}. Each day object requires `day_number` and `activity_ids`. Day 1 "
                "must have an empty activity_ids list; every later day must contain one or two distinct "
                "activity IDs. Never reuse an activity ID on another day. Do not invent IDs, catalog facts, "
                "prices, schedules, availability, booking, accommodation, transport, or activities."
            ),
            expected_output="Only JSON matching the required itinerary-selection object; no markdown or prose.",
            agent=agent, output_pydantic=ItineraryCrewOutput,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "trip_context": json.dumps(trip_context), "catalog": json.dumps(catalog),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(raw)
        return ItineraryCrewOutput.model_validate(result)
