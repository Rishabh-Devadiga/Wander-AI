# TourFlow AI - System Architecture

## Overview
TourFlow AI is an AI-powered personalized and dynamic travel planning platform designed to deliver hyper-tailored journeys, real-time disruption resilience, and seamless end-to-end trip execution.

## Monorepo Layout
```
tourflow-ai/
  backend/            # Python FastAPI Backend
    api/              # RESTful API route endpoints
    models/           # SQLAlchemy ORM models (Trip central entity)
    schemas/          # Pydantic validation schemas
    services/         # Core business services
    ai/               # Centralized Gemini AI service integration
    recommendation/   # AI-powered preference matching & ranking
    itinerary/        # Dynamic multi-day itinerary generator
    replanning/       # Disruption management & dynamic replanning
    database/         # Connection pooling & settings
  database/
    migrations/       # Alembic versioned migrations
    seed_data/        # Deterministic seed data (Manali, Goa, Kerala, etc.)
  frontend/ (src/)    # React + TypeScript + Vite + Tailwind CSS
  docs/               # Technical and architecture specs
  .env.example        # Environment variable declarations
  README.md           # Monorepo setup and execution guide
```

## Central Entity Paradigm
The **Trip** model serves as the core system orchestrator and links together:
- `traveler` (User & TravelerProfile)
- `preferences` (TripPreference budget, pace, interests)
- `itinerary` (ItineraryItems chronologically structured per day)
- `bookings` (Vendor confirmations and transactions)
- `alerts` (Real-time weather, delay, and route advisories)
- `notifications` (User alerts and status updates)
- `change_history` (Full audit trail of AI and traveler modifications)
- `reviews` (Feedback loops for recommendation reinforcement)

## AI Foundation
The `GeminiService` provides high-performance LLM interfaces:
- `extract_preferences()`: Parses natural language trip queries into structured constraints.
- `recommend()`: Computes multi-factor relevance ranking across verified catalogue items.
- `generate_itinerary()`: Generates optimized time blocks with activity sequencing.
- `chat()`: Interactive conversational planning agent.
- `replan()`: Autonomous contingency resolution when triggered by real-time disruptions.
