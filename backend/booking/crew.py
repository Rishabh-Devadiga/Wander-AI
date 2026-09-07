"""Single-purpose CrewAI workflow for booking-readiness recommendations."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import BookingCrewOutput


class BookingRecommendationCrew:
    """Explains the booking order for already validated catalog selections."""

    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, trip_context: Dict[str, Any], booking_items: list[Dict[str, Any]]) -> BookingCrewOutput:
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
            role="Booking and Reservation Specialist",
            goal="Organize existing validated catalog selections into a safe booking-ready checklist.",
            backstory=("You only work with supplied, verified selection keys. You never invent inventory, "
                       "prices, availability, reservation references, payments, or confirmations."),
            llm=LLM(model=model_name, api_key=self.gemini_service.api_key),
            allow_delegation=False, max_iter=1, max_execution_time=30,
        )
        task = Task(
            description=(
                "Return every supplied `booking_key` exactly once from this verified booking-item JSON: "
                "{booking_items}. Use this existing trip context: {trip_context}. Add concise `booking_notes`. "
                "Do not return any ID/key not supplied. Do not create bookings or confirmations and do not "
                "state prices, availability, or payment facts."
            ),
            expected_output="Only JSON matching the required booking recommendation object; no markdown or prose.",
            agent=agent, output_pydantic=BookingCrewOutput,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "trip_context": json.dumps(trip_context), "booking_items": json.dumps(booking_items),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(raw)
        return BookingCrewOutput.model_validate(result)
