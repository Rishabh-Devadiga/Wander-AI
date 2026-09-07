"""Single-purpose CrewAI workflow for destination research."""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from backend.schemas.schemas import ResearchResult


class ResearchCrew:
    """Runs one bounded CrewAI task when CrewAI is available."""

    def __init__(self, gemini_service: Any):
        self.gemini_service = gemini_service

    def run(self, catalog_context: Dict[str, Any], traveler_context: Dict[str, Any]) -> ResearchResult:
        try:
            # CrewAI 1.x resolves its task-output database through Windows
            # local-app-data. In restricted Windows environments that location
            # can be unavailable even when the application itself is writable.
            # Keep CrewAI's ephemeral execution data in the process temp area.
            if os.name == "nt":
                import crewai_core.paths as crewai_paths

                storage_path = Path(tempfile.gettempdir()) / "tourflow-crewai"
                storage_path.mkdir(parents=True, exist_ok=True)
                crewai_paths.db_storage_path = lambda: str(storage_path)
            from crewai import Agent, Crew, LLM, Process, Task
        except ImportError:
            # Local environments that have not yet installed the deployment
            # dependency preserve the route contract through GeminiService.
            return ResearchResult.model_validate(
                self.gemini_service.generate_destination_research(catalog_context, traveler_context)
            )

        model_name = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        if model_name in {"gemini-2.5-flash", "gemini/gemini-2.5-flash"}:
            model_name = "gemini-3.1-flash-lite"
        if not model_name.startswith("gemini/"):
            model_name = f"gemini/{model_name}"
        llm = LLM(model=model_name, api_key=self.gemini_service.api_key)
        agent = Agent(
            role="TourFlow destination research specialist",
            goal="Return factual, preference-aware destination context without planning or booking work.",
            backstory=("You synthesize destination context for downstream travel agents. "
                       "You treat the supplied catalog and traveler constraints as authoritative."),
            llm=llm, allow_delegation=False, max_iter=3, max_execution_time=30,
        )
        task = Task(
            description=(
                "Research only the destination context represented by this catalog JSON: {catalog_context}. "
                "Tailor it only to this traveler context: {traveler_context}. "
                "Never choose or rank hotels, transport, vendors, bookable activities, inventory, prices, "
                "availability, bookings, or a day-by-day itinerary. Return only valid JSON matching "
                "this exact object shape: "
                '{"destination":"string","destination_summary":"string",'
                '"recommended_areas":[{"name":"string","category":"string","area_location":"string or null",'
                '"description":"string","relevance_to_traveler":"string or null","practical_notes":"string or null"}],'
                '"key_places":[{"name":"string","category":"string","area_location":"string or null",'
                '"description":"string","relevance_to_traveler":"string or null","practical_notes":"string or null"}],'
                '"attractions":[{"name":"string","category":"string","area_location":"string or null",'
                '"description":"string","relevance_to_traveler":"string or null","practical_notes":"string or null"}],'
                '"travel_considerations":["string"],"seasonal_considerations":["string"],'
                '"preference_relevant_insights":["string"],"source":"crewai"}'
            ),
            expected_output=("Only raw JSON. No markdown, no prose, no code fences. Include every ResearchResult field."),
            agent=agent,
        )
        output = Crew(agents=[agent], tasks=[task], process=Process.sequential).kickoff(inputs={
            "catalog_context": json.dumps(catalog_context),
            "traveler_context": json.dumps(traveler_context),
        })
        result = getattr(output, "pydantic", None)
        if result is None:
            raw = (getattr(output, "raw", None) or str(output)).strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            result = json.loads(raw.strip())
        validated = ResearchResult.model_validate(result)
        validated.source = "crewai"
        return validated
