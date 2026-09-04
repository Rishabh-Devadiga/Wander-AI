# TourFlow AI - Technical Handoff & Local Development Manual

> **Enterprise AI-Powered Personalized & Dynamic Travel Planning Platform**  
> Complete Technical Documentation, Architecture Guide, and Local Setup Manual.

---

## 1. Project Overview

### What TourFlow AI Does
TourFlow AI is a dual-sided travel orchestration platform bridging individual travelers with commercial tour operators. It combines generative AI models (Google Gemini) with strict algorithmic validation to deliver hyper-tailored multi-day travel itineraries, verified real-world transport routes, live dynamic destination visuals, and automated disruption replanning.

### Problem It Solves
1. **Hallucinated Travel Logistics**: Generic LLMs often hallucinate non-existent flight routes, impossible transit durations, phantom train numbers, and invalid season-destination pairings. TourFlow AI enforces strict ground-truth validation over transport hubs, geocoordinates, and real Indian transit routes.
2. **Fragile Static Itineraries**: Conventional itineraries are static PDFs that break when landslides, weather delays, or road closures occur. TourFlow AI provides real-time impact analysis, autonomous AI candidate generation, and single-click operator replanning.
3. **Disjointed Traveler-Operator State**: Traditional travel businesses rely on fragmented spreadsheets, WhatsApp chats, and disconnected booking tools. TourFlow AI uses a unified canonical data model where Traveler and Operator interfaces operate on the exact same database records in real time.

### Current Prototype Scope & Key Differentiators
- **Featured Destinations**: Manali (Himachal Pradesh), Goa, Kerala (Munnar/Alleppey), Rajasthan (Jaipur/Udaipur), Kashmir (Srinagar/Gulmarg).
- **Dual-Portal Synchronization**: Instant bi-directional state sync between Traveler Workspace (`/`) and Operator Enterprise Suite (`/operator/dashboard`).
- **Interactive Multi-Day Mapping**: Leaflet-powered maps featuring day-by-day route paths, pinpoint markers for hotels and activities, and transit hub links.
- **Dynamic Backdrop Engine**: Responsive ambient video/image backdrops matching the destination and time of day.
- **Client-Side PDF Generation**: Vector-grade, multi-page branded travel voucher and itinerary export with jsPDF.

---

## 2. User Journeys

### A. Traveler Journey
```
[ Discover ] ──▶ [ Personalize ] ──▶ [ Plan ] ──▶ [ Explore / Compare ] ──▶ [ Price ]
      │
      ▼
   [ Book ] ──▶ [ Prepare ] ──▶ [ Operate ] ──▶ [ Assist (Concierge) ] ──▶ [ Adapt (Replan) ] ──▶ [ Complete & Review ]
```
1. **Discover**: Browse interactive destination showcases with dynamic backgrounds, seasonal highlights, weather advice, and curated tags.
2. **Personalize**: Input natural-language trip requirements (e.g. *"4-day luxury couple trip to Manali with snow adventure and boutique stay in December"*).
3. **Plan**: AI parses constraints into verified dates, budget tiers, companion types, and pace, building an exact $N$-day structured itinerary.
4. **Explore & Compare**: Review day-by-day morning, afternoon, and evening slots; swap hotels or switch transport modes (Private SUV vs. Volvo vs. Flights).
5. **Price**: Real-time cost recalculation dynamically updates per-person totals, accommodation nights, transport fares, and target budget variances.
6. **Book**: Review booking references (`TF-XXXXXX`) across hotels, transport operators, and activity providers.
7. **Prepare**: Export comprehensive PDF travel vouchers, review packing checklists, and check emergency contact lists.
8. **Operate**: Follow day-by-day schedule with live route maps and location coordinates.
9. **Assist**: Use the in-app Gemini AI Travel Concierge for immediate local advice, food recommendations, and packing tips.
10. **Adapt**: Receive immediate alert banners if a disruption occurs, reviewing proposed alternative activities or accommodations.
11. **Complete & Review**: Submit ratings and feedback to refine future recommendation scoring.

### B. Operator Journey
```
[ Login ] ──▶ [ Dashboard Overview ] ──▶ [ Trip Requests Queue ] ──▶ [ Trip Workspace ]
      │
      ▼
 [ Bookings ] ──▶ [ Hotels / Resorts ] ──▶ [ Transport Fleet ] ──▶ [ Vendors ] ──▶ [ Alerts & AI Replan ] ──▶ [ AI Operations Assistant ] ──▶ [ Analytics ]
```
1. **Login**: Authenticate at `/operator/login` with role-gated operator credentials (`operator@tourflow.ai` / `demo123`).
2. **Dashboard Overview**: Monitor active trips, pipeline revenue, critical disruption alerts, vendor load, and traveler satisfaction.
3. **Trip Requests Queue**: Triage traveler requests with filters for status, destination, budget, and alert severity.
4. **Trip Workspace**: Deep-dive into any traveler's canonical itinerary to edit items, modify accommodations, or adjust pricing.
5. **Bookings & Vouchers**: Confirm or cancel vendor bookings and track payment statuses (`paid`, `pending`, `refunded`).
6. **Hotels / Resorts**: Manage verified inventory, price per night, room tiers, and active allotments.
7. **Transport Fleet**: Coordinate fleet logistics, drivers, vehicle capacities, and route origins/destinations.
8. **Vendors & Compliance**: Audit verified activity and transport suppliers, compliance statuses, and ratings.
9. **Alerts & Dynamic AI Replanning**: Receive disruption triggers, compute multi-variable impact analyses, generate AI-ranked alternatives, and apply one-click replanning.
10. **AI Operations Assistant**: Query operational intelligence (e.g. *"Summarize high-risk trips this weekend"* or *"Draft an apology & rebooking notification"*).
11. **Analytics**: Inspect margin trends, popular destinations, traveler ratings, and operational throughput.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (React 19)                                │
│  ┌─────────────────────────────┐                    ┌────────────────────────────────┐  │
│  │     Traveler Workspace      │                    │    Operator Enterprise Suite   │  │
│  │ (Hero, Planner, Itinerary,  │                    │ (Dashboard, Fleet, Replan,     │  │
│  │  Map, PDF, Concierge Chat)  │                    │  Vendors, Analytics, AI Ops)   │  │
│  └──────────────┬──────────────┘                    └───────────────┬────────────────┘  │
│                 │                                                   │                   │
│                 └─────────────────────┬─────────────────────────────┘                   │
│                                       ▼                                                 │
│                     Zustand Store / Unified API Client (`/src/services/api.ts`)         │
└───────────────────────────────────────┬─────────────────────────────────────────────────┘
                                        │ HTTP / JSON (Port 3000 / 8000)
┌───────────────────────────────────────▼─────────────────────────────────────────────────┐
│                                  BACKEND & API LAYER                                    │
│  ┌────────────────────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │         Node/Express Gateway           │  │         Python FastAPI Core           │  │
│  │             (server.ts)                │  │          (backend/main.py)            │  │
│  ├────────────────────────────────────────┤  ├───────────────────────────────────────┤  │
│  │ • API Routes (/api/*)                  │  │ • REST API Endpoints (/api/*)         │  │
│  │ • Vite SSR/SPA Middleware              │  │ • SQLAlchemy 2.0 ORM Engine           │  │
│  │ • AI Service Bridges                   │  │ • Pydantic v2 Validation Schemas      │  │
│  │ • Dynamic Transport Route Synthesizer  │  │ • Recommendation & Replanning Engines │  │
│  └───────────────────┬────────────────────┘  └───────────────────┬───────────────────┘  │
│                      │                                           │                      │
│                      └─────────────────────┬─────────────────────┘                      │
└────────────────────────────────────────────┼────────────────────────────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
┌───────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│           AI INTELLIGENCE LAYER           │ │           PERSISTENCE LAYER               │
│  ┌─────────────────────────────────────┐  │ │  ┌─────────────────────────────────────┐  │
│  │   Google Gemini 2.5/3.7 Models      │  │ │  │   PostgreSQL / SQLite Database      │  │
│  │      (`@google/genai` SDK)          │  │ │  │         (tourflow.db)               │  │
│  ├─────────────────────────────────────┤  │ │  ├─────────────────────────────────────┤  │
│  │ • Structured JSON Schema Extraction │  │ │  │ • Single Source of Truth            │  │
│  │ • Knowledge Base Grounding          │  │ │  │ • Canonical `trips` & `itinerary`   │  │
│  │ • Multi-Candidate Replan Generation │  │ │  │ • Alembic Database Migrations       │  │
│  │ • Conversational Chat Concierge     │  │ │  │ • Deterministic Seed Data           │  │
│  └─────────────────────────────────────┘  │ │  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

### Core Architecture Subsystems
1. **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion animations, Leaflet map renderer, jsPDF client exporter.
2. **Backend Services**: Express TypeScript server (`server.ts`) and Python FastAPI engine (`backend/main.py`) exposing unified `/api` REST contracts.
3. **Database**: PostgreSQL (with SQLite zero-config fallback for testing/local agility) accessed via SQLAlchemy ORM models and Alembic versioned migrations.
4. **AI Integration**: Centralized `GeminiService` using `@google/genai` with automatic fallback cascade (`gemini-2.5-flash` $\rightarrow$ `gemini-3.7-flash` $\rightarrow$ `gemini-flash-latest` $\rightarrow$ `gemini-3.1-flash-lite`).
5. **Interactive Mapping**: Leaflet with OpenStreetMap tiles, custom marker overlays (`divIcon`), and coordinates computed via `geoCoordinates.ts`.
6. **Images**: Curated Unsplash photo catalog with robust keyword-based image resolution fallback (`SmartImage.tsx` & `imageCatalog.ts`).
7. **PDF Generation**: Native client-side PDF document compiler in `src/utils/pdfExport.ts` producing A4 structured printouts with financial breakdowns and daily time slots.
8. **Real-Time Synchronization**: Traveler and Operator access the **exact same canonical records**. Changes made by either side persist immediately to the shared database and reflect across both portals.

---

## 4. Directory Structure

```
/
├── backend/                        # Python FastAPI Backend
│   ├── ai/                         # Gemini Python Service integration
│   │   └── gemini_service.py       # LLM interface & structured prompts
│   ├── api/                        # REST endpoint controllers
│   │   └── routes.py               # All /api routes (trips, destinations, ai, etc.)
│   ├── database/                   # Database engine & configuration
│   │   ├── config.py               # Pydantic Settings & environment loader
│   │   └── connection.py           # SQLAlchemy session factory & engine
│   ├── itinerary/                  # Algorithmic itinerary synthesizer
│   │   └── generator.py            # Slot assignment & budget calculation
│   ├── models/                     # SQLAlchemy ORM Database Models
│   │   └── models.py               # Trip, User, Hotel, Activity, Booking, etc.
│   ├── recommendation/             # Rule & preference matching engine
│   │   └── engine.py               # Multi-factor score calculator
│   ├── replanning/                 # Automated disruption engine
│   │   └── engine.py               # Impact analyzer & contingency resolver
│   ├── schemas/                    # Pydantic validation schemas
│   │   └── schemas.py              # Request/Response data models
│   └── main.py                     # FastAPI application entrypoint & lifecycle
├── database/                       # Database migrations and seed fixtures
│   ├── migrations/                 # Alembic migration scripts
│   │   ├── env.py                  # Alembic environment runner
│   │   └── versions/               # Versioned migration files (0001_initial_schema.py)
│   └── seed_data/                  # Seed scripts
│       └── seed.py                 # Deterministic seed data for destinations/hotels
├── docs/                           # Technical Specifications
│   ├── API_REFERENCE.md            # API endpoint documentation
│   ├── ARCHITECTURE.md             # System architecture notes
│   └── DATABASE_SCHEMA.md          # Entity-relationship documentation
├── src/                            # React 19 Frontend
│   ├── components/                 # Shared UI & Traveler Components
│   │   ├── operator/               # Operator Enterprise Suite Components
│   │   │   ├── OperatorPortal.tsx          # Operator root router & state manager
│   │   │   ├── OperatorDashboard.tsx       # KPI metrics & quick action cards
│   │   │   ├── OperatorTripRequests.tsx    # Traveler queue & booking approvals
│   │   │   ├── OperatorTripWorkspace.tsx   # Detailed trip inspector & editor
│   │   │   ├── OperatorHotels.tsx          # Accommodation inventory management
│   │   │   ├── OperatorTransport.tsx       # Fleet & route logistics
│   │   │   ├── OperatorVendors.tsx         # Supplier compliance & directory
│   │   │   ├── OperatorAlerts.tsx          # Real-time incident replanning
│   │   │   ├── OperatorAiAssistant.tsx     # Natural-language operations console
│   │   │   └── OperatorAnalytics.tsx       # Business intelligence & margins
│   │   ├── AIChatConsole.tsx       # Conversational AI Concierge interface
│   │   ├── CreateTripModal.tsx     # Wizard for custom trip creation
│   │   ├── DestinationExplorer.tsx # Destination catalog and deep dives
│   │   ├── DynamicBackground.tsx   # Ambient video/backdrop controller
│   │   ├── HeroLanding.tsx         # Traveler discovery hero section
│   │   ├── TravelerWorkspace.tsx   # Active trip planner & manager
│   │   ├── TripDetailView.tsx      # Comprehensive multi-day itinerary view
│   │   └── TripInteractiveMap.tsx  # Leaflet interactive route mapping
│   ├── server/                     # Full-stack Node.js Backend Services
│   │   ├── config/geminiConfig.ts  # Gemini model parameters & retry config
│   │   ├── services/               # Modular enterprise AI service layer
│   │   │   ├── geminiService.ts    # @google/genai TypeScript client with retries
│   │   │   ├── itineraryService.ts # Structured itinerary generator
│   │   │   ├── replanService.ts    # Disruption replanning service
│   │   │   ├── operatorAiService.ts# Operations natural language assistant
│   │   │   └── conciergeService.ts # Chat concierge with contextual memory
│   │   ├── chatEngine.ts           # Concierge prompt parser & response builder
│   │   ├── itineraryEngine.ts      # Ground-truth destination knowledge base
│   │   ├── liveTransportEngine.ts  # Route synthesis & aggregator links
│   │   ├── operatorEngine.ts       # Vendor directory & impact calculation
│   │   └── seedTrips.ts            # Canonical seed trips for instant testing
│   ├── services/                   # Frontend API Client
│   │   └── api.ts                  # Typed fetch client for all backend endpoints
│   ├── store/                      # Global Frontend State
│   │   └── useTripStore.ts         # Zustand store for trip & UI state
│   ├── types/                      # TypeScript Definitions
│   │   └── tourflow.ts             # Shared interfaces (Trip, Itinerary, etc.)
│   ├── utils/                      # Utilities & Helpers
│   │   ├── geoCoordinates.ts       # Geo-spatial coordinates & bounding boxes
│   │   ├── imageCatalog.ts         # Unsplash image mapper
│   │   ├── pdfExport.ts            # jsPDF voucher and itinerary generator
│   │   └── validation.ts           # Destination & date input validators
│   ├── App.tsx                     # Main React application & route switcher
│   ├── index.css                   # Tailwind CSS global styles
│   └── main.tsx                    # React DOM root mounting
├── .env.example                    # Environment variable template
├── alembic.ini                     # Alembic migration configuration
├── index.html                      # HTML5 entrypoint & Google Fonts
├── metadata.json                   # AI Studio applet metadata & permissions
├── package.json                    # Node dependencies & execution scripts
├── requirements.txt                # Python backend dependencies
├── server.ts                       # Unified Express server & Vite middleware
├── tourflow.db                     # SQLite database file (auto-created if used)
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite + Tailwind + React bundler config
```

---

## 5. Database & Entity Models

The persistence layer uses SQLAlchemy 2.0 with the **Trip** model as the single source of truth.

```
                  ┌──────────────┐
                  │    Users     │
                  └──────┬───────┘
                         │ 1:1
                         ├──────────────▶ TravelerProfile
                         │ 1:N
                         ▼
                  ┌──────────────┐       1:N       ┌──────────────────┐
   Destination ──▶│    Trips     │────────────────▶│ ItineraryItem    │
                  └──────┬───────┘                 └────────┬─────────┘
                         │                                  │
      ┌──────────────────┼──────────────────┐               │ N:1 (Hotel / Activity / Transport)
      │ 1:1              │ 1:N              │ 1:N           ▼
┌─────▼──────────┐ ┌─────▼───────┐ ┌────────▼──────┐ ┌──────────────────┐
│ TripPreference │ │   Booking   │ │     Alert     │ │ Catalog Entities │
└────────────────┘ └─────┬───────┘ └───────────────┘ │ (Hotel/Activity/ │
                         │                           │  TransportOption)│
                         │ N:1                       └────────▲─────────┘
                         ▼                                    │
                  ┌──────────────┐                            │ N:1
                  │   Vendors    │────────────────────────────┘
                  └──────────────┘
```

### Table Specifications
| Table Name | Primary Key | Key Foreign Keys | Purpose & Key Fields |
|:---|:---|:---|:---|
| `users` | `id` (UUID) | None | Traveler, Operator, and Admin user accounts (`email`, `full_name`, `role`, `is_active`). |
| `traveler_profiles` | `id` (UUID) | `user_id` $\rightarrow$ `users.id` | Traveler travel habits (`travel_style`, `dietary_preferences`, `fitness_level`, `preferred_currency`). |
| `destinations` | `id` (UUID) | None | Verified destination catalog (`name`, `slug`, `state_region`, `hero_image_url`, `best_time_to_visit`, `latitude`, `longitude`). |
| `vendors` | `id` (UUID) | None | Verified suppliers (`name`, `vendor_type`, `rating`, `is_verified`, `compliance_status`). |
| `hotels` | `id` (UUID) | `destination_id`, `vendor_id` | Lodging inventory (`name`, `category`, `price_per_night`, `amenities`, `images`, `rating`). |
| `activities` | `id` (UUID) | `destination_id`, `vendor_id` | Curated experiences (`title`, `category`, `duration_hours`, `price_per_person`, `difficulty_level`). |
| `transport_options` | `id` (UUID) | `destination_id`, `vendor_id` | Transit choices (`type`, `name`, `route_from`, `route_to`, `duration_hours`, `price`, `capacity`). |
| **`trips`** | `id` (UUID) | `user_id`, `destination_id` | **Canonical central state entity** (`title`, `status`, `start_date`, `end_date`, `duration_days`, `total_budget`, `pace`). |
| `trip_preferences` | `id` (UUID) | `trip_id` $\rightarrow$ `trips.id` | Exact trip constraints (`budget_tier`, `interests`, `travel_companions`, `accommodation_types`). |
| `itinerary_items` | `id` (UUID) | `trip_id`, `hotel_id`, `activity_id`, `transport_id` | Chronological items per day (`day_number`, `order_index`, `item_type`, `title`, `start_time`, `end_time`, `cost`). |
| `bookings` | `id` (UUID) | `trip_id`, `vendor_id` | Commercial vouchers (`booking_reference`, `item_type`, `amount`, `status`, `payment_status`). |
| `alerts` | `id` (UUID) | `trip_id` $\rightarrow$ `trips.id` | Real-time incident logs (`alert_type`, `severity`, `title`, `description`, `is_resolved`). |
| `notifications` | `id` (UUID) | `trip_id`, `user_id` | User messaging inbox (`title`, `message`, `type`, `is_read`). |
| `change_history` | `id` (UUID) | `trip_id` $\rightarrow$ `trips.id` | Audit trail of edits (`changed_by`, `action`, `field_changed`, `old_value`, `new_value`, `reason`). |
| `reviews` | `id` (UUID) | `trip_id`, `user_id` | Traveler post-trip feedback (`rating`, `comment`, `destination_rating`, `ai_planning_rating`). |

---

## 6. AI Rules & Guardrails

To ensure reliable travel planning, all AI services must adhere to these strict engineering guardrails:

1. **User Input as Ground Truth**: Traveler-specified constraints (duration, companion count, dates, budget ceiling) must not be overridden by the model.
2. **Deterministic Extraction & Clarification**:
   - The Gemini extraction prompt transforms free-form queries into validated JSON structures.
   - Months, seasons, or calendar dates (e.g. "December", "next weekend", "monsoon") must **never** be extracted as destination names.
   - Missing required date ranges must trigger a clarification prompt or fall back to default planning windows.
3. **No Fabricated Travel Logistics**:
   - The model is **strictly forbidden** from inventing non-existent airports, fictional train schedules, synthetic flight numbers, or fabricated booking URLs.
   - Transport routing must derive from the verified knowledge base (`liveTransportEngine.ts` and `DESTINATION_KNOWLEDGE_BASE`).
4. **Backend Validation Before Persistence**:
   - Raw AI outputs are parsed through Pydantic / TypeScript schemas and validated against available destination inventory before being saved to the database.
   - If an AI-suggested activity is unavailable, the fallback heuristic picks the closest matching verified catalog item.

---

## 7. Travel Logic & Business Rules

1. **Exact-Duration Generation**: An $N$-day trip must generate exactly $N$ day schedules, each containing logically sequenced morning, afternoon, and evening slots without gaps.
2. **Activity De-duplication**: The same sightseeing activity must not repeat on multiple days of the same itinerary unless explicitly requested (e.g. multi-day trekking).
3. **Day-Specific Lodging**: Accommodation must be allocated for every night of the trip ($N-1$ nights or $N$ nights based on checkout policy), and travelers can switch hotels mid-trip.
4. **Real-Time Budget Recalculation**:
   $$\text{Total Cost} = \text{Transport Fare} + (\text{Nightly Hotel Rate} \times \text{Nights}) + \sum \text{Activity Costs} + \text{Daily Food/Incidental Estimate}$$
   The UI immediately updates remaining budget balance and displays over-budget warnings if the total exceeds `total_budget`.
5. **Geographic Feasibility**: Morning and afternoon activities scheduled on the same day must reside within reasonable transit distance (e.g., Rohtang Pass and Old Manali cafes are partitioned into different time blocks).
6. **Transport Aggregator Grounding**: Verified deep-links to IRCTC, Google Flights, Skyscanner, RedBus, and MakeMyTrip are generated based on actual origin-destination pairs.

---

## 8. Operator Portal & AI Operations

The Operator Suite (`/operator/*`) provides commercial management tools:

- **Role Gate & Authentication**: Authenticates operator accounts (`operator@tourflow.ai`) and stores active session tokens.
- **Trip Management Console**: Real-time overview of all trips in the database with status transitions (`planning` $\rightarrow$ `confirmed` $\rightarrow$ `ongoing` $\rightarrow$ `completed`).
- **One-Click Disruption Replanning**:
  1. Trigger an incident (e.g. *"Heavy snowfall blocks Solang Pass"*).
  2. The system executes `computeImpactAnalysis()`, isolating affected itinerary slots and traveler bookings.
  3. `rankAlternativesWithGemini()` evaluates verified alternatives based on safety ratings, weather resilience, and budget variance.
  4. The operator reviews the impact scorecard and applies the chosen replacement with a single click, automatically updating the traveler's itinerary and creating an alert record.
- **AI Operations Assistant**: Natural-language conversational interface powered by `OperatorAiService` for draft communications, fleet summaries, and risk analyses.

---

## 9. Real-Time Data Flow & Synchronization

```
┌─────────────────────────┐                   ┌─────────────────────────┐
│    Traveler Frontend    │                   │    Operator Frontend    │
│  (Port 3000 / Client)   │                   │  (Port 3000 / Client)   │
└────────────┬────────────┘                   └────────────┬────────────┘
             │ Mutations & Queries                         │ Mutations & Queries
             │ (e.g. change hotel, add activity)          │ (e.g. apply replan, update booking)
             ▼                                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        FastAPI / Express API                          │
│               • Validates constraints & permissions                   │
│               • Executes AI / Recommendation engines                  │
│               • Writes mutations & logs ChangeHistory                 │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    SHARED POSTGRESQL DATABASE                         │
│                    (Canonical Trips Table)                            │
│  • Single Source of Truth for TripState                               │
│  • Consistent across Traveler & Operator sessions                     │
└───────────────────────────────────────────────────────────────────────┘
```

### Synchronization Details
- **Unified API Client**: Both Traveler and Operator use `TourFlowApi` (`src/services/api.ts`) pointing to `/api/*`.
- **Immediate Persistence**: When a traveler modifies an activity or an operator applies an AI replan, the backend immediately writes to the shared database record and appends a row to `change_history`.
- **Optimistic UI with Background Refetch**: The client updates local Zustand store state immediately and validates against the server response, ensuring instantaneous UI updates without desynchronization.

---

## 10. API Reference

| Method | Endpoint | Description & Payload |
|:---|:---|:---|
| `GET` | `/api/health` | System health check, DB connection state, item counts, and Gemini AI status. |
| `GET` | `/api/destinations` | List all available destinations (optional: `?featured_only=true`). |
| `GET` | `/api/destinations/:id` | Get destination details by UUID or slug (`manali`, `goa`, etc.). |
| `GET` | `/api/hotels` | Query hotels with optional `?destination_id=` and `?category=`. |
| `GET` | `/api/activities` | Query activities with optional `?destination_id=` and `?category=`. |
| `GET` | `/api/transport` | Query transport options with optional `?destination_id=` and `?type=`. |
| `GET` | `/api/trips` | Query trips with optional filters (`?status=`, `?search=`, `?operator_id=`). |
| `POST` | `/api/trips` | Create a new trip with preferences and auto-generated itinerary. |
| `GET` | `/api/trips/:id` | Retrieve full trip entity with nested itinerary, bookings, alerts, and history. |
| `PUT` | `/api/trips/:id` | Update trip metadata, pace, dates, or traveler counts. |
| `GET` | `/api/trips/:id/preferences` | Retrieve structured preferences for a trip. |
| `PUT` | `/api/trips/:id/preferences` | Update budget tier, interests, and dietary requirements. |
| `POST` | `/api/trips/:id/change-transport` | Update active transport mode and recalculate trip budget. |
| `POST` | `/api/trips/:id/change-accommodation` | Update trip-wide hotel accommodation and recompute costs. |
| `POST` | `/api/trips/:id/change-daily-accommodation` | Update accommodation for a specific day slot. |
| `POST` | `/api/trips/:id/add-activity` | Add an activity item to a specific day in the itinerary. |
| `POST` | `/api/trips/:id/remove-activity` | Remove an activity item and update schedule order indices. |
| `POST` | `/api/trips/:id/trigger-disruption` | Simulate an environmental or transit disruption on the trip. |
| `POST` | `/api/trips/:id/impact-analysis` | Compute multi-variable impact analysis for an incident. |
| `POST` | `/api/trips/:id/ai-replan-options` | Generate ranked AI replacement alternatives for affected slots. |
| `POST` | `/api/trips/:id/apply-replan` | Apply chosen replanning option to the live itinerary. |
| `POST` | `/api/ai/chat` | Conversational travel concierge interface with Gemini. |
| `POST` | `/api/ai/extract-preferences` | Parse free-form prompt into structured travel parameters. |
| `POST` | `/api/ai/recommend` | Compute ranked catalog recommendations based on preferences. |
| `POST` | `/api/ai/generate-itinerary` | Synthesize a full multi-day day-by-day itinerary. |
| `POST` | `/api/ai/replan` | Execute autonomous contingency resolution for disruptions. |
| `POST` | `/api/operator/login` | Authenticate operator user credentials. |
| `GET` | `/api/operator/dashboard-stats` | Retrieve aggregated operator KPIs, revenue, and alerts. |
| `GET` | `/api/operator/vendors` | List verified operator vendors with compliance ratings. |
| `POST` | `/api/operator/ai-assistant` | Query the Operator AI natural-language assistant. |

---

## 11. Environment Variables

Create `.env` in the root directory by copying `.env.example`:

```bash
# Windows (PowerShell / CMD)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

| Variable | Required | Default / Example | Purpose |
|:---|:---:|:---|:---|
| `GEMINI_API_KEY` | **Yes** | *None (obtain from Google AI Studio)* | Google Gemini API key (kept server-side only). |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Primary Gemini model for generation and chat. |
| `GEMINI_FALLBACK_MODELS` | No | `gemini-2.5-flash,gemini-3.7-flash,gemini-flash-latest,gemini-3.1-flash-lite` | Cascading list of fallback models for resilience. |
| `GEMINI_TEMPERATURE` | No | `1.0` | Default sampling temperature. |
| `GEMINI_CONVERSATIONAL_TEMPERATURE` | No | `1.0` | Sampling temperature for conversational chat. |
| `GEMINI_STRUCTURED_TEMPERATURE` | No | `1.0` | Sampling temperature for JSON structured outputs. |
| `GEMINI_MAX_OUTPUT_TOKENS` | No | `4096` | Maximum token limit per Gemini response. |
| `GEMINI_TOP_P` | No | `0.95` | Nucleus sampling probability threshold. |
| `GEMINI_TOP_K` | No | `40` | Top-K vocabulary truncation. |
| `GEMINI_MAX_RETRIES` | No | `3` | Maximum retry attempts for transient API errors. |
| `GEMINI_INITIAL_BACKOFF_MS`| No | `1000` | Initial exponential backoff delay in milliseconds. |
| `GEMINI_MAX_BACKOFF_MS` | No | `10000` | Maximum backoff delay cap in milliseconds. |
| `GEMINI_TIMEOUT_MS` | No | `30000` | API request timeout in milliseconds. |
| `DATABASE_URL` | No | `sqlite:///./tourflow.db` | PostgreSQL or SQLite connection string. |
| `APP_URL` | No | `http://localhost:3000` | Base URL for client application. |
| `BACKEND_PORT` | No | `3000` (or `8000`) | Network port for the backend server. |
| `ENVIRONMENT` | No | `development` | Deployment environment (`development` / `production`). |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`). |

> **Security Note**: Never commit API keys or database credentials to version control.

### Vercel Frontend Deployment

The React frontend intentionally keeps its API client pointed at the same-origin path `/api` (`src/services/api.ts`). Do not add `VITE_API_URL` or expose backend secrets to the browser.

For Vercel production deployments, `vercel.json` rewrites frontend API calls to the deployed Render backend:

```text
/api/* -> https://wander-ai-sx2d.onrender.com/api/*
```

No frontend Vercel environment variables are required for API routing.

---

## 12. Local Development & Setup Manual

Follow these step-by-step instructions to run TourFlow AI locally on any operating system (Windows, macOS, Linux).

### Prerequisites
1. **Node.js**: v18.0.0+ or v20.0.0+ (check with `node -v`)
2. **Python**: v3.10+ (check with `python --version` or `python3 --version`)
3. **PostgreSQL** *(Optional)*: PostgreSQL 14+ if using a local PostgreSQL database, OR use the zero-config SQLite default (`tourflow.db`).

---

### Step-by-Step Setup

#### Step 1: Open Terminal in Project Root
```bash
# Navigate to the repository root directory
cd tourflow-ai
```

#### Step 2: Set Up Python Virtual Environment
```bash
# On Windows (PowerShell / Command Prompt):
python -m venv venv
venv\Scripts\activate

# On macOS / Linux:
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Install Node.js Frontend Dependencies
```bash
npm install
```

#### Step 5: Configure Environment Variables
```bash
# Create your local .env file from .env.example:
# On Windows:
copy .env.example .env

# On macOS / Linux:
cp .env.example .env
```
Open `.env` in your text editor and add your **`GEMINI_API_KEY`** (get a free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).

*(Optional)* If using a PostgreSQL database, update `DATABASE_URL`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tourflow
```

#### Step 6: Run Database Migrations
Run Alembic migrations to construct all database tables:
```bash
# Ensure venv is activated
python -m alembic upgrade head
```

#### Step 7: Seed Database with Initial Catalog & Demo Trips
Populate destinations (Manali, Goa, Kerala, Rajasthan, Kashmir), verified hotels, activities, transport options, and demo trips:
```bash
python -m database.seed_data.seed
```

---

### Starting the Application

You have two execution modes:

#### Option A: Full-Stack Integrated Mode (Recommended)
This runs the full-stack Express server with integrated Vite middleware and all API endpoints on a single port:
```bash
npm run dev
```
- Open in browser: **[http://localhost:3000](http://localhost:3000)**

#### Option B: Standalone Dual-Server Mode
Run the Python FastAPI backend and Vite frontend separately:

1. **Terminal 1 - Start Python FastAPI Backend**:
```bash
# Windows / macOS / Linux (with venv activated)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive Swagger API Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**
- Health Check: **[http://localhost:8000/api/health](http://localhost:8000/api/health)**

2. **Terminal 2 - Start Frontend**:
```bash
npm run dev
```
- Traveler Experience: **[http://localhost:3000](http://localhost:3000)**
- Operator Suite: **[http://localhost:3000/operator/dashboard](http://localhost:3000/operator/dashboard)**

---

### Demo Credentials & Access Points

| Portal | URL Path | Demo Email | Demo Password / Note |
|:---|:---|:---|:---|
| **Traveler Workspace** | `http://localhost:3000/` | `alex.morgan@tourflow.ai` | Direct Access (No password required) |
| **Operator Enterprise Suite** | `http://localhost:3000/operator/login` | `operator@tourflow.ai` | `demo123` |
| **FastAPI Interactive Docs** | `http://localhost:8000/docs` | *N/A* | OpenAPI / Swagger UI |
| **API Health Status** | `http://localhost:3000/api/health` | *N/A* | JSON System Diagnostic |

---

## 13. Testing & Verification

### Automated Test Suites
```bash
# 1. Run Python Backend Test Suite (FastAPI + SQLAlchemy + Seed verification)
pytest tests/ -v

# 2. Run TypeScript Static Analysis & Type Checking
npm run lint

# 3. Test Production Bundling (Vite + esbuild CJS server bundle)
npm run build
```

### Critical End-to-End Test Flows
1. **AI Extraction & Itinerary Synthesis**: Submit a natural language prompt in the Hero search $\rightarrow$ verify structured parameter extraction $\rightarrow$ check that the generated itinerary matches the requested duration without slot overlap.
2. **Hotel & Transport Swapping**: In the Trip Detail view, switch from *Standard Volvo* to *Private Luxury SUV* $\rightarrow$ verify instant budget recalculation and live route update.
3. **Interactive Map Verification**: Open the map tab $\rightarrow$ confirm custom Leaflet markers render with correct coordinates for each day's activities.
4. **PDF Export**: Click "Export PDF" $\rightarrow$ verify that `jsPDF` compiles and downloads a structured multi-page itinerary voucher.
5. **Traveler $\leftrightarrow$ Operator Synchronization**: Open a trip in the Traveler view $\rightarrow$ switch to Operator Portal in another tab $\rightarrow$ apply a replanning alternative $\rightarrow$ confirm the Traveler itinerary updates immediately.

---

## 14. Rules & Best Practices for Future AI Developers

1. **Read Before Modifying**: Always inspect existing files using dedicated tools before proposing edits. Never assume file structures or component interfaces.
2. **Preserve Single Source of Truth**: Do not create parallel, disconnected state engines or duplicate `TripState` schemas. All changes must flow through the canonical models and `/api` endpoints.
3. **No Hardcoded Production Logic**: Do not hardcode demo dates, budgets, or fixed itineraries into core algorithms. Keep destination parameters extensible via catalog data.
4. **Enforce Ground-Truth Validation**: Gemini interprets and suggests; the backend engine validates against catalog inventory and real geographical constraints before committing.
5. **Preserve Dual-Portal Parity**: Ensure any new feature added to the Traveler experience is observable and manageable from the Operator Enterprise Suite.
6. **No API Key Exposure**: Always keep `GEMINI_API_KEY` and secret credentials in server-side processes. Never prefix backend secrets with `VITE_`.
7. **Verify Builds**: Run `npm run lint` and `npm run build` after making structural changes to maintain clean, production-ready deployments.

---

## AI Development Context / Change Log

### 2026-09-04

Inspected:

- `Agents.md`
- `README.md`
- `backend/api/routes.py`
- Repository file list via `rg --files`
- FastAPI route decorators in `backend/api/routes.py`
- Current git worktree status

Changed:

- Populated `Agents.md` with project development rules, persistent context documentation rules, verification rules, architecture rules, security rules, and scope rules.
- Added `BACKEND_MIGRATION_DOCUMENTATION.md` at the repository root as the standalone backend migration documentation file.
- Resolved FastAPI/backend compatibility work in `backend/api/routes.py`.
- Updated request schemas in `backend/schemas/schemas.py`.
- Resolved frontend API/client conflict state in `src/services/api.ts`.
- Resolved operator assistant component conflict state in `src/components/operator/OperatorAiAssistant.tsx`.
- Changed the server-only import in `src/components/operator/OperatorVendors.tsx` to a type-only import.

Files modified:

- `Agents.md`
- `BACKEND_MIGRATION_DOCUMENTATION.md`
- `README.md`
- `backend/api/routes.py`
- `backend/schemas/schemas.py`
- `src/components/operator/OperatorAiAssistant.tsx`
- `src/components/operator/OperatorVendors.tsx`
- `src/services/api.ts`

APIs/routes added or made FastAPI-compatible:

- `GET /api/sync/version`
- `GET /api/trips`
- `DELETE /api/trips/{trip_id}`
- `POST /api/trips/{trip_id}/trigger-disruption`
- `POST /api/trips/{trip_id}/impact-analysis`
- `POST /api/trips/{trip_id}/ai-replan-options`
- `POST /api/trips/{trip_id}/apply-replan`
- `POST /api/trips/{trip_id}/accept-request`
- `POST /api/trips/{trip_id}/decline-request`
- `GET /api/operator/dashboard`
- `GET /api/operator/vendors`
- `POST /api/operator/vendors/{vendor_id}/toggle`
- `GET /api/operator/bookings`
- `POST /api/operator/bookings/{booking_id}/action`
- `GET /api/operator/alerts`
- `POST /api/operator/alerts/{alert_id}/resolve`
- `GET /api/operator/analytics`
- `POST /api/auth/operator-login`
- `POST /api/trips/{trip_id}/change-transport`
- `POST /api/trips/{trip_id}/change-accommodation`
- `POST /api/trips/{trip_id}/change-daily-accommodation`
- `POST /api/trips/{trip_id}/change-day-accommodation`
- `POST /api/trips/{trip_id}/add-activity`
- `POST /api/trips/{trip_id}/delete-activity`
- `POST /api/trips/{trip_id}/swap-activity`
- `POST /api/trips/{trip_id}/edit-activity`
- `POST /api/trips/{trip_id}/toggle-activity`
- `POST /api/trips/{trip_id}/add-day-leg`
- `POST /api/trips/{trip_id}/remove-day-leg`
- `GET /api/possible-options`
- `POST /api/trips/{trip_id}/lock-booking`

Architecture changes:

- FastAPI is documented as the intended production backend for `/api/*` traffic.
- The old Node/Express backend remains in the repository and was not deleted.
- `vercel.json` continues to rewrite `/api/*` traffic to the deployed Render FastAPI backend.

Tests/checks performed:

- `Get-Content -LiteralPath .\Agents.md`
- `Get-Content -LiteralPath .\README.md`
- `rg -n "AI Development Context|Change Log|Development Context" README.md`
- `rg -n "@router\.(get|post|put|delete|patch)" backend/api/routes.py`
- `rg --files`
- `git status --short`
- `git diff --check`
- Merge conflict marker scan on edited files

Known remaining issues:

- Local Python validation could not run because the `python` command resolves to the Windows Store alias and no Python interpreter is available in PATH.
- FastAPI local startup and Python tests could not run for the same reason.
- Frontend lint/build could not complete because local Node dependencies are not installed and `tsc`/`vite` are unavailable.
- `OPERATOR_LOGIN_PASSWORD` must be configured in the backend environment for `POST /api/auth/operator-login`.
