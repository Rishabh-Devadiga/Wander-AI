"""Single-purpose CrewAI workflow for the trip-aware Assistant Agent."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import AssistantCrewOutput


class AssistantCrew:
    """Produces a conversational answer from verified, read-only trip facts."""

    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, message: str, trip_context: Dict[str, Any]) -> AssistantCrewOutput:
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
            role="Assistant Specialist",
            goal="Answer traveler questions using only supplied verified trip context.",
            backstory=("You are a read-only travel assistant. Never invent or change trip, booking, catalog, "
                       "pricing, availability, dates, IDs, or preferences. Explain when a user requests an "
                       "operation that requires an explicit trip-management route."),
            llm=LLM(model=model_name, api_key=self.gemini_service.api_key),
            allow_delegation=False, max_iter=1, max_execution_time=30,
        )
        task = Task(
            description=(
                "Answer this traveler message: {message}. Use only this verified trip JSON: {trip_context}. "
                "Return concise `response`, optional `referenced_ids` drawn only from `allowed_reference_ids`, "
                "and optional non-mutating `suggested_actions`. Do not claim an operation occurred or invent facts."
            ),
            expected_output="Only JSON matching the required assistant output object; no markdown or prose.",
            agent=agent, output_pydantic=AssistantCrewOutput,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "message": message, "trip_context": json.dumps(trip_context),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(raw)
        return AssistantCrewOutput.model_validate(result)
