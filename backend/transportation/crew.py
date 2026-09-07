"""Single-purpose CrewAI workflow for catalog-bounded transportation selection."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import TransportationCrewOutput


class TransportationCrew:
    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, traveler_context: Dict[str, Any], candidates: list[Dict[str, Any]]) -> TransportationCrewOutput:
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
            role="Transportation Selection Specialist",
            goal="Select transportation only from the supplied verified catalog candidates.",
            backstory="You rank valid transport options precisely and never invent routes, prices, capacity, availability, or bookings.",
            llm=LLM(model=model_name, api_key=self.gemini_service.api_key),
            allow_delegation=False, max_iter=1, max_execution_time=30,
        )
        task = Task(
            description=(
                "Select up to five transport IDs from this verified candidate JSON only: {candidates}. "
                "Use these traveler requirements: {traveler_context}. Return valid JSON with `selections`; "
                "each selection requires `transport_id`, `recommendation_reason`, and `matched_preferences`. "
                "Never return an ID absent from candidates and never invent transport inventory, routes, prices, "
                "capacity, availability, booking, accommodation, activities, or itinerary content."
            ),
            expected_output="Only JSON matching the required selections object; no markdown or prose.",
            agent=agent, output_pydantic=TransportationCrewOutput,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "traveler_context": json.dumps(traveler_context), "candidates": json.dumps(candidates),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(raw)
        return TransportationCrewOutput.model_validate(result)
