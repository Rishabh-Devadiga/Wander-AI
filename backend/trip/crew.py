"""Single-purpose CrewAI workflow for catalog-bounded trip management."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import TripManagementCrewOutput


class TripManagementCrew:
    """Organizes verified catalog selections for an existing trip without booking them."""

    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, trip_context: Dict[str, Any], catalog: Dict[str, list[Dict[str, Any]]]) -> TripManagementCrewOutput:
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
            role="Trip Management and Booking Specialist",
            goal="Organize booking-ready trip selections only from supplied verified catalog records.",
            backstory=("You prepare a trip-management view from existing trips and verified inventory. "
                       "You never invent hotels, transport, activities, prices, availability, bookings, or IDs."),
            llm=LLM(model=model_name, api_key=self.gemini_service.api_key),
            allow_delegation=False, max_iter=1, max_execution_time=30,
        )
        task = Task(
            description=(
                "Select exactly one `hotel_id`, exactly one `transport_id`, and one to five distinct "
                "`activity_ids` from this verified catalog JSON only: {catalog}. Use this existing trip "
                "context: {trip_context}. Return valid JSON with those IDs and `management_notes`. "
                "Never return an ID absent from the catalog. Never invent prices, availability, booking "
                "references, payment status, inventory, or changes to the existing trip."
            ),
            expected_output="Only JSON matching the required trip-management-selection object; no markdown or prose.",
            agent=agent, output_pydantic=TripManagementCrewOutput,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "trip_context": json.dumps(trip_context), "catalog": json.dumps(catalog),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(raw)
        return TripManagementCrewOutput.model_validate(result)
