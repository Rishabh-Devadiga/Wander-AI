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
| `POST` | `/api/research` | Read-only destination Research Agent endpoint. Accepts `ResearchContext` and returns structured `ResearchResult`. |
| `POST` | `/api/accommodations/recommendations` | Read-only Accommodation Agent endpoint. Accepts `AccommodationContext` and returns catalog-validated accommodation recommendations. |
| `POST` | `/api/bookings/recommendations` | Read-only Booking & Reservation Agent endpoint. Accepts `BookingRecommendationContext` and returns catalog-derived booking readiness without creating reservations. |
| `POST` | `/api/assistant/chat` | Read-only Assistant Agent endpoint. Accepts `AssistantChatContext` and answers from validated trip, itinerary, preference, catalog, and booking context. |
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

## 15. Current Project Status

### Implemented System

- Frontend: React 19/Vite client under `src/`, using the unified API client in `src/services/api.ts`.
- Backend: FastAPI production API under `backend/main.py`, with all current production routes mounted under `/api` from `backend/api/routes.py`.
- Legacy server: `server.ts` remains in the repository for the integrated Node/Vite development path, but new production API functionality is implemented in FastAPI.
- Database: SQLAlchemy models in `backend/models/models.py`, SQLite/PostgreSQL connection handling in `backend/database/connection.py`, and seeded destination/catalog data from `database/seed_data/seed.py`.
- Gemini: Centralized backend Gemini integration in `backend/ai/gemini_service.py`; API keys remain server-side through `GEMINI_API_KEY`.
- AI endpoints: existing chat, preference extraction, recommendation, itinerary generation, and replanning endpoints remain present.

### Current AI / Agent Status

- Research Agent: `COMPLETE / LIVE VERIFIED`.
- Accommodation Agent: `COMPLETE / LIVE VERIFIED`. It provides read-only, catalog-validated hotel recommendations through one CrewAI agent and one task; it does not apply selections to a trip.
- Transportation Agent: `COMPLETE / LIVE VERIFIED`. It provides read-only, catalog-validated transportation recommendations through FastAPI, CrewAI, and Gemini; it does not apply selections to a trip.
- Experience Agent: `PARTIAL`. It provides read-only, catalog-validated activity recommendations through one CrewAI agent and one task. Its single live FastAPI request reached CrewAI and Gemini but returned HTTP 502 because outbound Gemini sockets are blocked in this environment.
- Itinerary Planning Agent: `PARTIAL`. It produces read-only, catalog-validated multi-day itinerary recommendations through one CrewAI agent and one task. Its single live FastAPI request reached CrewAI and Gemini but returned HTTP 502 because outbound Gemini sockets are blocked in this environment.
- Trip Management Agent: `PARTIAL`. It creates a read-only, catalog-validated trip-management view for an existing trip through one CrewAI agent and one task. Its required single live request returned HTTP 404 from the already-bound local port, so the request did not reach this route, CrewAI, or Gemini. Existing replanning remains in the established deterministic replanning engine and mutation routes.
- Booking & Reservation Agent: `PARTIAL`. It derives booking-ready items from existing itinerary selections through one CrewAI agent and one task, without creating bookings. Its one live request returned HTTP 502 before a structured result could be validated.
- Assistant Agent: `PARTIAL`. It answers read-only traveler questions from validated trip, itinerary, preference, catalog, and booking context through one CrewAI agent and one structured task. Automated tests and OpenAPI registration are verified; its single live FastAPI request reached CrewAI/Gemini but returned HTTP 502 because outbound Gemini sockets are blocked in this environment.
- Replanning Agent: not implemented as a standalone CrewAI agent. Existing replanning engine and disruption/replan routes exist.

### Research Agent

- Status: `COMPLETE / LIVE VERIFIED`.
- Purpose: provide destination research before downstream planning agents select inventory or build itineraries.
- Responsibilities: destination overview, destination research, recommended areas, key places, attractions, travel considerations, seasonal considerations, and preference-relevant destination insights.
- Explicitly out of scope: accommodation selection, transportation selection, booking, final itinerary generation, trip pricing, and dynamic replanning.
- Input: `ResearchContext` in `backend/schemas/schemas.py`, including destination, optional origin, dates, duration, traveler count, budget, currency, pace, travel style, and optional existing `TripPreferenceBase`.
- Output: `ResearchResult` in `backend/schemas/schemas.py`, including destination summary, recommended areas, key places, attractions, travel considerations, seasonal considerations, preference insights, and source.
- CrewAI integration: `backend/research/crew.py` defines one CrewAI `Agent`, one structured `Task`, and a sequential `Crew`; raw Crew output is validated as `ResearchResult`. CrewAI 1.15.20 is installed in the current virtual environment.
- Gemini integration: `GeminiService.generate_destination_research()` in `backend/ai/gemini_service.py` requests JSON-only bounded destination research from Gemini and rejects unavailable Gemini by raising an error.
- Database/data-source integration: `DestinationResearchService` resolves the requested destination from the SQLAlchemy `Destination` catalog and passes catalog fields to the research workflow. It does not query hotels, transport, activities, bookings, or itinerary inventory for selection.
- API/service integration: `POST /api/research` in `backend/api/routes.py` accepts `ResearchContext`, returns `ResearchResult`, returns 404 for unknown catalog destinations, 422 for invalid request shape, and 502 when configured AI output cannot be validated.
- Non-mutation behavior: the service reads destination catalog records and does not create or update `Trip`, `TripPreference`, itinerary, booking, vendor, hotel, activity, transport, alert, notification, or change-history records.
- Tests performed on 2026-09-06: `pytest tests -v` with `DATABASE_URL=sqlite:///./tourflow.db` and `GEMINI_API_KEY` cleared returned 14 passed / 21 warnings; `npm.cmd run lint` passed; Python AST parsing of backend/tests passed for 21 files.
- Controlled API test on 2026-09-06: `POST /api/research` for Manali from Mumbai, 5 days, 2 travelers, INR 80,000, adventure/nature preferences returned HTTP 200 with `source=catalog_fallback`, a non-empty destination summary, one recommended area, no forbidden itinerary/booking/pricing fields, and unchanged trip count.
- Build result on 2026-09-06: `npm.cmd run build` failed before bundling because Vite could not write `node_modules/.vite-temp/vite.config.ts.timestamp-*.mjs` due to Windows `EPERM`.
- Known limitation: CrewAI 1.15.20 is installed and a controlled live request reached CrewAI and Gemini, but outbound socket access is blocked in this Windows environment (`WinError 10013`), so the route returned HTTP 502 and no live `ResearchResult` was produced.

### Accommodation Agent

- Status: `COMPLETE`.
- Responsibility: recommend active catalog hotels for a validated destination and accommodation constraints only. It excludes destination research, activities, transport, itineraries, bookings, payments, trip pricing, and trip mutation.
- Input/output: `AccommodationContext` and `AccommodationResult` in `backend/schemas/schemas.py`. The result returns catalog-backed option IDs and facts, AI recommendation reasons, and a source marker.
- Catalog validation: `AccommodationRecommendationService` resolves the `Destination`, filters active `Hotel` records deterministically by currency, nightly-price cap, requested hotel categories, and required amenities, then validates every AI-selected ID against that filtered candidate set.
- CrewAI/Gemini integration: `backend/accommodation/crew.py` defines one `Accommodation Selection Specialist`, one structured `Task`, and a sequential `Crew` using the configured central `gemini_service` credentials. It receives only valid catalog candidates and can return only hotel IDs plus recommendation text.
- API: `POST /api/accommodations/recommendations` returns 404 for unknown destinations or no matching active catalog options, 422 for invalid request input, and 502 when configured CrewAI output cannot be validated.
- Non-mutation behavior: recommendations never create or update `Trip`, itinerary items, bookings, inventory, vendors, or other persisted trip state. Existing trip accommodation change routes remain the explicit mutation path.
- Verification on 2026-09-06: mocked backend tests passed (19 passed, 21 warnings); the route is included in OpenAPI; `npm.cmd run lint` passed. One controlled live request for Manali with an INR 13,000 nightly cap and boutique preference returned HTTP 200 with `source=crewai` and the catalog-backed `htl-manali-002` option.
- Build result on 2026-09-06: `npm.cmd run build` remains blocked before bundling by Windows `EPERM` writing a Vite temporary config under `node_modules/.vite-temp`.

### Transportation Agent

- Status: `COMPLETE / LIVE VERIFIED`.
- Responsibility: select and rank transportation only from active `TransportOption` catalog records. It excludes research, accommodation, activities, itinerary generation, booking, payments, replanning, and trip mutation.
- Input/output: `TransportationContext`, `TransportationCrewOutput`, and `TransportationResult` in `backend/schemas/schemas.py`. Returned transport facts are rebuilt from catalog records after validation.
- Catalog validation: `TransportationRecommendationService` resolves the requested `Destination` and deterministically filters active catalog records by origin, currency, traveler capacity, optional transport type, maximum price, and maximum duration. Every CrewAI-selected ID must belong to that filtered candidate set.
- CrewAI/Gemini integration: `backend/transportation/crew.py` defines one Transportation Selection Specialist, one structured task, and one sequential Crew using the configured central `gemini_service` credentials. It receives only verified candidate data and returns only transport IDs with recommendation metadata.
- API: `POST /api/transportation/recommendations` returns structured recommendations; it returns 404 for an unknown destination or no matching catalog candidates, 422 for invalid request input, and 502 when CrewAI output cannot be validated. Existing `POST /api/trips/{trip_id}/change-transport` remains the explicit mutation mechanism.
- Non-mutation behavior: recommendation handling reads the catalog and does not create or update `Trip`, itinerary, booking, or transport records.
- Verification on 2026-09-06: `venv\\Scripts\\python.exe -m compileall -q backend tests` passed; the complete backend test suite passed (23 passed, 21 warnings); OpenAPI includes `/api/transportation/recommendations`; the local catalog has three active Manali transport options; and `npm.cmd run lint` passed.
- Live verification: `POST /api/transportation/recommendations` successfully reached the Transportation Agent; CrewAI and Gemini executed successfully; and the result returned `source: crewai` and `catalog_validated: true`. Active catalog transportation was successfully validated. Agent 3 live verification is complete.

### Experience Agent

- Status: `PARTIAL`.
- Responsibility: select and rank activities only from active `Activity` catalog records. It excludes research, accommodation, transportation, itinerary generation, booking, payments, replanning, and trip mutation.
- Input/output: `ExperienceContext`, `ExperienceCrewOutput`, and `ExperienceResult` in `backend/schemas/schemas.py`. Returned activity facts are rebuilt from catalog records after selection validation.
- Catalog validation: `ExperienceRecommendationService` resolves the requested `Destination`, deterministically filters active activity records by currency, optional category, difficulty, maximum per-person price, and maximum duration, and rejects every AI-selected ID outside that filtered candidate set.
- CrewAI/Gemini integration: `backend/experience/crew.py` defines one Experience Selection Specialist, one structured task, and one sequential Crew using the configured central `gemini_service` credentials. It receives only validated candidate data and returns only activity IDs with recommendation metadata.
- API: `POST /api/experiences/recommendations` returns structured recommendations; it returns 404 for an unknown destination or no matching catalog candidates, 422 for invalid request input, and 502 when CrewAI output cannot be validated. Existing trip activity routes remain the explicit mutation path.
- Non-mutation behavior: recommendations do not create or update `Trip`, itinerary, booking, activity, or other persisted state.
- Verification on 2026-09-06: `venv\\Scripts\\python.exe -m compileall -q backend tests` passed; `venv\\Scripts\\python.exe -m pytest -q` passed (27 passed, 21 warnings); OpenAPI includes `/api/experiences/recommendations`; and `npm.cmd run lint` passed.
- Controlled live verification on 2026-09-06: the single `POST /api/experiences/recommendations` request reached FastAPI, the Experience Agent, CrewAI, and Gemini but returned HTTP 502. Gemini socket requests failed with Windows `WinError 10013`, so no structured result was returned and Agent 4 is not live verified.

### Itinerary Planning Agent

- Status: `PARTIAL`.
- Responsibility: build a multi-day plan from active catalog hotels, transport, and activities only. It excludes booking, payment, dynamic replanning, and any mutation of an existing trip or itinerary.
- Input/output: strict `ItineraryContext`, `ItineraryCrewOutput`, and `ItineraryResult` schemas in `backend/schemas/schemas.py` reject unexpected fields. Returned hotel, transport, activity, and cost facts are rebuilt from catalog records.
- Catalog validation: `ItineraryRecommendationService` resolves the destination, filters active inventory by destination, currency, transport capacity, and optional origin, validates every selected hotel, transport, and activity ID, rejects repeated activities, schedules catalog activities without overlap, and calculates total cost from catalog prices.
- CrewAI/Gemini integration: `backend/itinerary/crew.py` defines one Itinerary Planning Specialist, one structured task, and one sequential Crew using the configured central `gemini_service` credentials. It receives only validated candidate records.
- API: `POST /api/itinerary/recommendations` returns a structured, non-mutating itinerary. It returns 404 for missing catalog inventory, 422 for invalid constraints, duration, or budget, and 502 when CrewAI output cannot be validated. Existing trip and itinerary mutation routes are unchanged.
- Verification on 2026-09-06: `venv\\Scripts\\python.exe -m compileall -q backend tests` passed; `venv\\Scripts\\python.exe -m pytest -q` passed (30 passed, 21 warnings); OpenAPI includes `/api/itinerary/recommendations` with `ItineraryResult`; and `npm.cmd run lint` passed.
- Controlled live verification on 2026-09-06: the one `POST /api/itinerary/recommendations` request reached FastAPI, the Itinerary Planning Agent, CrewAI, and Gemini but returned HTTP 502. Gemini socket requests failed with Windows `WinError 10013`, so no validated `source=crewai`, `catalog_validated=true` response was returned.

### Trip Management Agent

- Status: `PARTIAL`.
- Responsibility: assemble a booking-ready management view from an existing `Trip`, its validated catalog destination, existing itinerary references, and active accommodation, transport, and activity inventory. It does not replace Research, Accommodation, Transportation, Experience, or Itinerary Planning agents.
- Architecture: `backend/trip/crew.py` defines exactly one Trip Management and Booking Specialist, one Pydantic-structured task, and one sequential Crew. `backend/trip/service.py` runs the read-only workflow and `backend/trip/__init__.py` exposes the package.
- Input/output: strict `TripManagementContext`, `TripManagementCrewOutput`, `TripManagementActivity`, `TripManagementItineraryReference`, and `TripManagementResult` schemas are defined in `backend/schemas/schemas.py`. The result includes trip/destination identifiers, rebuilt accommodation, transportation, activities, itinerary references, total catalog cost, currency, booking readiness, notes, source, and catalog-validation state.
- Catalog validation and pricing: the service accepts only the supplied trip ID, filters active same-destination inventory by the trip currency and transport capacity, validates every Crew-selected ID and itinerary reference, rebuilds returned facts from SQLAlchemy records, rejects duplicate or inactive/unknown IDs, and calculates the total from catalog prices, trip duration, and traveler count. Existing bookings are read only.
- API: `POST /api/trips/management/recommendations` returns `TripManagementResult`; it returns 404 for a missing trip or required active inventory, 422 for invalid trip/catalog selections or budgets, and 502 when configured CrewAI output cannot be validated. Existing trip change and booking routes remain the only mutation mechanisms.
- Non-mutation behavior: this endpoint does not change trips, itinerary items, catalog records, bookings, payments, or reservations.
- Verification on 2026-09-06: `venv\\Scripts\\python.exe -m compileall -q backend tests` passed; `venv\\Scripts\\python.exe -m pytest -q` passed (33 passed, 21 warnings); OpenAPI includes `/api/trips/management/recommendations` with `TripManagementResult`; and `npm.cmd run lint` passed. Focused tests cover valid requests, strict schemas, route registration, invalid or inactive catalog IDs, catalog-derived totals, non-mutation, and Crew-output validation.
- Build result on 2026-09-06: `npm.cmd run build` failed before bundling because Vite could not write a temporary config under `node_modules/.vite-temp` due to Windows `EPERM`.
- Live verification on 2026-09-06: the required single `POST /api/trips/management/recommendations` request to the already-bound local FastAPI port returned HTTP 404. It did not invoke Agent 6, CrewAI, or Gemini, and it did not return `source=crewai` or `catalog_validated=true`.

### Booking & Reservation Agent

- Status: `PARTIAL`.
- Purpose: convert existing validated itinerary selections into a booking-ready, catalog-derived checklist. It does not replace Research, Accommodation, Transportation, Experience, Itinerary, Trip Management, or the existing replanning engine.
- Backend location: `backend/booking/crew.py` and `backend/booking/service.py`; the package is exposed by `backend/booking/__init__.py`.
- API/input/output: `POST /api/bookings/recommendations` accepts strict `BookingRecommendationContext` and returns `BookingRecommendationResult`. `BookingCrewOutput` controls the structured Crew output; `BookingRecommendationItem` represents rebuilt booking facts. All schemas are in `backend/schemas/schemas.py`.
- CrewAI/Gemini: `BookingRecommendationCrew` defines exactly one Booking and Reservation Specialist, one Pydantic structured task, and one sequential Crew using centralized `gemini_service` credentials. The Crew is given only catalog-validated selection keys and may only preserve those keys plus explanatory notes.
- Catalog and booking data: the service loads the canonical `Trip`, destination, traveler count, currency, budget, itinerary, and `Booking` records. It validates hotel, transport, and activity IDs against the trip destination; requires active inventory, matching currency, positive activity duration, and sufficient transport capacity; then rebuilds names, descriptions, costs, and existing booking references from SQLAlchemy models. Totals use hotel nights, transport quantities, activity occurrences, and traveler count.
- Mutation behavior: repeat calls do not create `Booking` rows or change trips, itinerary items, payments, reservations, or catalog records. The response identifies the existing explicit action endpoint, `POST /api/trips/{trip_id}/lock-booking`, which remains the sole reservation-creation path.
- Booking readiness: incomplete itinerary selections return `missing_selection`; catalog totals over the trip budget return `over_budget`; valid selections return `ready`. Stale, inactive, invalid, or insufficient-capacity catalog references are rejected with 422 and are never returned as booking items.
- Automated verification on 2026-09-06: Python compile checks passed; `venv\\Scripts\\python.exe -m pytest tests -q` passed (37 passed, 30 warnings); OpenAPI contains the Agent 7 route and `BookingRecommendationResult`; and `npm.cmd run lint` passed. Focused tests cover canonical selections, existing booking references, no mutation/duplicates, unknown trips, strict input schema, missing selections, budget checks, invalid/inactive catalog records, capacity validation, Crew output validation, and malformed Crew handling.
- Build result on 2026-09-06: `npm.cmd run build` failed before bundling because Vite could not write a temporary config under `node_modules/.vite-temp` due to Windows `EPERM`.
- Live verification on 2026-09-06: FastAPI was started on port 8001 because the existing port-8000 listener could not be inspected. Its OpenAPI document included `/api/bookings/recommendations`. The single request against an existing canonical trip returned HTTP 502 (`Booking recommendations could not be validated`) before a structured result was returned. The response contained neither `source=crewai` nor `catalog_validated=true`; CrewAI/Gemini successful execution was not demonstrated.

### Assistant Agent

- Status: `PARTIAL`.
- Purpose: provide a conversational traveler interface over an existing canonical trip without generating itineraries, optimizing bookings, or replanning disruptions.
- Backend location: `backend/assistant/crew.py` and `backend/assistant/service.py`; the package is exposed by `backend/assistant/__init__.py`.
- Architecture: `AssistantCrew` defines exactly one CrewAI Assistant Specialist, one Pydantic-structured task, and one sequential Crew using centralized `gemini_service` credentials.
- API/input/output: `POST /api/assistant/chat` accepts strict `AssistantChatContext` with `trip_id` and `message`, and returns `AssistantChatResult` with `trip_id`, original message, response, validated references, suggested actions, `source`, and `context_validated`.
- Grounding behavior: `AssistantService` validates the trip and catalog destination, loads existing itinerary, preferences, bookings, active hotels, active activities, and active transport options, rejects stale or inactive catalog references, and rebuilds catalog IDs, titles, costs, booking totals, and itinerary totals before invoking CrewAI.
- Mutation behavior: the endpoint is read-only. It does not create bookings, cancel bookings, modify trips, change preferences, edit itineraries, change hotels, change transport, add/delete activities, trigger disruptions, or apply replans. Mutation requests are answered as requiring explicit existing trip or booking operations.
- Frontend integration: `src/services/api.ts` exposes `TourFlowApi.chatWithAssistant(tripId, message)` for the FastAPI route. No new UI surface was added.
- Automated verification on 2026-09-07: `venv\\Scripts\\python.exe -m compileall -q backend tests` passed; `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q` passed (41 passed, 30 warnings); OpenAPI includes `/api/assistant/chat` with `AssistantChatContext` and `AssistantChatResult`; and `npm.cmd run lint` passed. Assistant tests cover valid Crew-backed response, missing trip, empty message, itinerary references, existing booking counts, preference questions, catalog-grounded cost/day fallback responses, invalid catalog context, malformed Crew output, OpenAPI registration, and non-mutation.
- Build result on 2026-09-07: `npm.cmd run build` failed before bundling because Vite could not write a temporary config under `node_modules/.vite-temp` due to Windows `EPERM`.
- Live verification on 2026-09-07: local FastAPI was started on port 8002 and one `POST /api/assistant/chat` request was sent for `trp-manali-alpine-demo-001`. The request reached the Assistant Agent, CrewAI, and Gemini but returned HTTP 502 (`Assistant response could not be validated`) because Gemini socket access failed with Windows `WinError 10013`. The response did not return `source=crewai` or `context_validated=true`.
- Mutation verification on 2026-09-07: before and after the live request, the demo trip remained `confirmed` with 5 itinerary items and 1 booking.

### Current Agent Roadmap

| Agent | Purpose | Status |
|:---|:---|:---|
| 1. Research Agent | Destination research and contextual travel intelligence | Complete / Live Verified |
| 2. Accommodation Agent | Catalog-grounded accommodation selection | Complete / Live Verified |
| 3. Transportation Agent | Catalog-grounded transportation selection | Complete / Live Verified |
| 4. Experience Agent | Catalog-grounded activity and experience recommendations | Partial |
| 5. Itinerary & Optimization Agent | Multi-day itinerary planning and optimization | Partial |
| 6. Trip Management / Replanning | Read-only trip management; existing replanning engine handles disruption routes | Partial |
| 7. Booking & Reservation Agent | Booking readiness and validated reservation recommendations | Partial |
| 8. Assistant Agent | Read-only conversational answers over validated trip context | Partial |
| 9. Replanning Agent | Standalone CrewAI disruption replanning agent | Not implemented |

---

## AI Development Context / Change Log

### 2026-09-07 Replanning Engine Strengthening

Inspected:

- `AGENTS.md`, `README.md`, the existing replanning engine, FastAPI replan routes, request schema, Gemini replan helper, SQLAlchemy trip, itinerary, activity, alert, and change-history models, seeded catalog, and backend tests.

Changed:

- Reworked `backend/replanning/engine.py` in place. `POST /api/ai/replan` now loads the trip's active itinerary, identifies event-matched items (or weather/road-affected active activity and transport items), and returns catalog-backed activity replacement proposals for affected activities.
- Alternatives are restricted to active activities for the trip destination with matching trip currency and positive duration. Existing selected activities are excluded from automatic selection. An optional requested `alternative_id` is only used when it satisfies those same checks; invalid IDs are reported as rejected and never enter a proposal.
- Replan proposals remain non-mutating: the existing `/api/trips/{trip_id}/apply-replan` route remains the explicit itinerary-application path. Each proposal now records JSON snapshots of the actual existing itinerary item and selected catalog alternative in `ChangeHistory`; alerts continue to be created for every valid trip disruption.

Files modified:

- `backend/replanning/engine.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m py_compile backend\\replanning\\engine.py tests\\test_backend.py`: passed.
- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (47 passed, 43 warnings).

Known remaining issues:

- Replanning currently proposes activity replacements only; affected transport items are reported but no transport substitution is proposed by this engine.

### 2026-09-07 Python Environment and Pylance Import Repair

Inspected:

- `AGENTS.md`, `README.md`, the Assistant Agent implementation, `backend/api/routes.py`, `backend/assistant/service.py`, `backend/assistant/crew.py`, `requirements.txt`, virtual-environment contents, and installed-package metadata.
- The checked-in `venv` directory, which contained only a partial `Lib` directory and no Windows interpreter executable after the virtual environment had been removed.

Changed:

- Recreated the ignored project virtual environment with Python 3.12.0 at `venv\\Scripts\\python.exe`.
- Corrected `.gitignore` so this local virtual environment is not tracked.
- Installed the versions selected by the existing requirement ranges, including FastAPI 0.141.1, SQLAlchemy 2.0.52, CrewAI 1.15.20, and crewai-core 1.15.20. No application source or dependency declaration was changed.
- Confirmed that CrewAI 1.15.20 provides the valid `crewai_core.paths` module and its `db_storage_path` function, so the Windows storage-path override in the Agent implementations remains unchanged.

Tests/checks performed:

- Direct imports of FastAPI, `sqlalchemy.orm.Session`, CrewAI's public API, and `crewai_core.paths`: passed.
- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (43 passed, 32 warnings).

Known remaining issues:

- The virtual environment is intentionally local and ignored; VS Code must select `C:\\Repo\\Wander-AI\\venv\\Scripts\\python.exe` for Pylance to use these packages.

### 2026-09-07 Assistant Agent

Inspected:

- `AGENTS.md`, `README.md`, the Agent 8 pasted brief, existing Agent 1--7 service/route/schema/test patterns, `backend/assistant/`, FastAPI routes, Pydantic schemas, SQLAlchemy trip/catalog/booking models, deterministic seed trip data, frontend API client, and backend tests.

Changed:

- Completed the read-only Agent 8 Assistant implementation already present under `backend/assistant/`.
- Enriched validated Assistant context with catalog IDs, catalog-derived itinerary item costs, itinerary totals, booking totals, dietary requirements, and special requests before CrewAI receives the payload.
- Expanded deterministic catalog fallback handling for cost/budget, booking/reservation, preference, activity, Day N, and tomorrow-style questions.
- Added focused tests for grounded fallback answers about trip cost, existing bookings, and Day 3 activity context.
- Documented Agent 8 endpoint, architecture, schemas, grounding behavior, read-only policy, frontend API method, verification, and roadmap status.

Files modified:

- `backend/assistant/service.py`
- `tests/test_backend.py`
- `README.md`

API added:

- `POST /api/assistant/chat` accepts `AssistantChatContext` and returns `AssistantChatResult`.

Architecture changes:

- Agent 8 follows the existing FastAPI service-layer and CrewAI pattern with one Assistant Specialist, one Pydantic-structured task, and one sequential Crew.

Tests/checks performed:

- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (41 passed, 30 warnings).
- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- OpenAPI assertion for `/api/assistant/chat`, `AssistantChatContext`, and `AssistantChatResult`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: failed before bundling because Vite could not write `node_modules/.vite-temp/vite.config.ts.timestamp-1788719506094-39d34fec96109.mjs` due to Windows `EPERM`.
- One live `POST /api/assistant/chat` request to local FastAPI on port 8002 returned HTTP 502 after CrewAI/Gemini socket attempts failed with Windows `WinError 10013`. The response did not return `source=crewai` or `context_validated=true`.
- Live mutation snapshot remained unchanged: `status=confirmed`, 5 itinerary items, and 1 booking before and after the request.

Known remaining issues:

- Agent 8 is `PARTIAL`: successful live CrewAI/Gemini execution was not demonstrated in this environment because outbound Gemini sockets are blocked by Windows `WinError 10013`.

### 2026-09-06 Booking & Reservation Agent

Inspected:

- `AGENTS.md`, `README.md`, `backend/main.py`, FastAPI routes, Pydantic schemas, SQLAlchemy catalog/trip/itinerary/booking models, database configuration, centralized Gemini service, Agents 1--6, seed data, backend tests, frontend API client, and traveler/operator booking UI.
- The canonical booking mutation route, `POST /api/trips/{trip_id}/lock-booking`, and operator booking routes.

Changed:

- Added the read-only Agent 7 workflow under `backend/booking/` with exactly one CrewAI Booking and Reservation Specialist, one Pydantic-structured task, and one sequential Crew.
- Added `BookingRecommendationContext`, `BookingCrewOutput`, `BookingRecommendationItem`, and `BookingRecommendationResult` schemas.
- Added `POST /api/bookings/recommendations`. It derives selections only from the existing trip itinerary and booking state; it neither creates bookings nor changes the trip.
- Added deterministic hotel, transport, and activity catalog validation; catalog-derived quantity/cost calculation; existing booking-reference handling; missing-selection and over-budget readiness responses; and Crew output key validation.
- Added `TourFlowApi.getBookingRecommendations(tripId)` so both existing traveler and operator UI flows can consume the canonical FastAPI response without a frontend-only booking state.
- Added focused backend tests and updated the API reference, agent status, Agent 1--7 roadmap, and verification record.

Files created:

- `backend/booking/__init__.py`
- `backend/booking/crew.py`
- `backend/booking/service.py`

Files modified:

- `backend/schemas/schemas.py`
- `backend/api/routes.py`
- `src/services/api.ts`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m py_compile backend\\booking\\__init__.py backend\\booking\\crew.py backend\\booking\\service.py backend\\schemas\\schemas.py backend\\api\\routes.py tests\\test_backend.py`: passed.
- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- `venv\\Scripts\\python.exe -m pytest tests -q`: passed (37 passed, 30 warnings).
- OpenAPI verification confirmed all existing Agent 1--6 routes and `/api/bookings/recommendations`; Agent 7's 200 schema is `BookingRecommendationResult`.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: failed before bundling because Vite could not write `node_modules/.vite-temp/vite.config.ts.timestamp-*.mjs` due to Windows `EPERM`.
- One live Agent 7 request to the locally started FastAPI app on port 8001 returned HTTP 502. It did not return a structured response, `source=crewai`, or `catalog_validated=true`.

Known remaining issues:

- Agent 7 is `PARTIAL`: its one permitted live request returned `Booking recommendations could not be validated`, so successful CrewAI/Gemini execution and a live catalog-validated result were not demonstrated.

### 2026-09-06 Trip Management & Booking Agent Verification

Inspected:

- `AGENTS.md`, `README.md`, the existing Agent 1--5 implementations, FastAPI routes, Pydantic schemas, SQLAlchemy trip/catalog/booking models, seed data, CrewAI/Gemini configuration, and backend tests.
- The existing `backend/trip/` implementation, which contains the single-agent, single-task sequential Crew workflow and non-mutating catalog-validation service.

Changed:

- Updated `README.md` to document the existing Agent 6 implementation, its endpoint, schemas, catalog validation, non-mutation boundary, verification results, and `PARTIAL` status.
- Corrected the agent roadmap so Agent 6 is Trip Management & Booking and Replanning follows as Agent 7.

Files modified:

- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- `venv\\Scripts\\python.exe -m pytest -q`: passed (33 passed, 21 warnings).
- OpenAPI assertion for `/api/trips/management/recommendations` and its `TripManagementResult` response: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: failed before bundling because Vite could not write `node_modules/.vite-temp/vite.config.ts.timestamp-*.mjs` due to Windows `EPERM`.
- The exactly one live `POST /api/trips/management/recommendations` request to the already-bound localhost port returned HTTP 404. It did not reach Agent 6, CrewAI, or Gemini, and returned neither `source=crewai` nor `catalog_validated=true`.

Known remaining issues:

- Agent 6 is not live verified because the already-bound local server did not expose the route; its one permitted live verification request returned HTTP 404.

### 2026-09-06 Itinerary Planning Agent

Inspected:

- `AGENTS.md`, `README.md`, Agent 1–4 implementations, the existing itinerary generator, Pydantic schemas, FastAPI routes, SQLAlchemy catalog and itinerary models, Gemini/CrewAI configuration, trip mutation routes, seed data, and backend tests.

Changed:

- Added `backend/itinerary/crew.py` and `backend/itinerary/service.py` without replacing the existing itinerary generator.
- Added strict itinerary request, Crew output, catalog-fact, item, day, and result schemas.
- Added deterministic filtering of active hotels, transport, and activities before CrewAI execution; every selected ID is checked against its candidate set before catalog facts and costs are rebuilt.
- Added non-overlapping activity scheduling, distinct-activity validation, duration validation, and catalog-price budget validation.
- Added `POST /api/itinerary/recommendations`; it is read-only and preserves existing explicit trip/itinerary mutation routes.
- Added focused tests for request validation, mocked CrewAI success, catalog fact rebuilding, unknown ID rejection, inactive activity filtering, budget validation, non-mutation, and OpenAPI endpoint registration.

Files created:

- `backend/itinerary/crew.py`
- `backend/itinerary/service.py`

Files modified:

- `backend/schemas/schemas.py`
- `backend/api/routes.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- `venv\\Scripts\\python.exe -m pytest -q`: 30 passed, 21 warnings.
- OpenAPI contains `POST /api/itinerary/recommendations` with `ItineraryResult`.
- `npm.cmd run lint`: passed.
- One controlled live `POST /api/itinerary/recommendations` request through FastAPI, Agent 5, CrewAI, Gemini, and catalog validation: HTTP 502. Gemini outbound sockets were blocked by Windows `WinError 10013`; no validated result was returned and no further live request was made.

### 2026-09-06 Experience Agent

Inspected:

- `AGENTS.md`, `README.md`, the Agent 1–3 CrewAI services, schemas, routes, tests, centralized Gemini service, `Activity` model, activity catalog endpoint, trip activity mutation routes, and seeded activity catalog.

Changed:

- Added the read-only Experience Agent under `backend/experience/` with one CrewAI agent, one structured task, and one sequential Crew.
- Added `ExperienceContext`, selection, crew-output, catalog-backed option, and result schemas without creating parallel activity or trip models.
- Added deterministic active-activity filtering and validation of every AI-selected activity ID against the filtered catalog candidates.
- Added `POST /api/experiences/recommendations`; it does not mutate trip state and leaves existing trip activity routes as the explicit mutation mechanism.
- Added focused mocked tests for request success, input and destination validation, empty catalog handling, deterministic fallback, invalid AI IDs, malformed AI output, and no trip mutation.

Files created:

- `backend/experience/__init__.py`
- `backend/experience/crew.py`
- `backend/experience/service.py`

Files modified:

- `backend/schemas/schemas.py`
- `backend/api/routes.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m compileall -q backend tests`: passed.
- `venv\\Scripts\\python.exe -m pytest -q`: 27 passed, 21 warnings.
- OpenAPI includes `POST /api/experiences/recommendations` with the `ExperienceResult` response schema.
- `npm.cmd run lint`: passed.
- One controlled live `POST /api/experiences/recommendations` request through FastAPI, CrewAI, Gemini, and catalog validation: HTTP 502. Gemini outbound sockets were blocked by Windows `WinError 10013`; no validated result was returned and no further live request was made.

### 2026-09-06 Transportation Agent Live Verification

Inspected:

- `AGENTS.md`, `README.md`, models, schemas, database connection, centralized Gemini service, existing Research and Accommodation Agent implementations, API routes, seed transport catalog, requirements, and backend tests.
- The existing `backend/transportation/` implementation, including its CrewAI workflow and catalog-grounded recommendation service.

Verified:

- The read-only Transportation Agent uses one CrewAI agent, one structured task, and one sequential Crew.
- The service filters active `TransportOption` records deterministically and rejects CrewAI-selected IDs outside its validated candidates before rebuilding response facts from the catalog.
- `POST /api/transportation/recommendations` is mounted under `/api`; it does not mutate trip state, while the existing trip transport-change route remains available for explicit mutation.
- Python compile checks passed; `venv\\Scripts\\python.exe -m pytest -q` passed (23 passed, 21 warnings); OpenAPI contains the transportation endpoint; `npm.cmd run lint` passed.
- `POST /api/transportation/recommendations` successfully reached the Transportation Agent.
- CrewAI executed successfully and Gemini execution succeeded.
- The structured result returned `source: crewai` and `catalog_validated: true`.
- Active catalog transportation was successfully validated; Agent 3 is `COMPLETE / LIVE VERIFIED`.

### 2026-09-06 Accommodation Agent

Inspected:

- Existing SQLAlchemy `Destination`, `Hotel`, `Trip`, and `TripPreference` models; Pydantic schemas; database connection; centralized Gemini service; Research Agent implementation; FastAPI routes; hotel endpoints; trip accommodation update routes; seed catalog; requirements; and backend tests.

Changed:

- Added the read-only Accommodation Agent under `backend/accommodation/` with one CrewAI agent and one structured task.
- Added `AccommodationContext`, Crew selection, catalog-backed option, and result schemas without creating parallel hotel or trip models.
- Added deterministic active-hotel filtering and validation of every AI-selected hotel ID against the filtered catalog candidates.
- Added `POST /api/accommodations/recommendations`; it does not modify trip state or replace existing hotel or trip-accommodation APIs.
- Added focused mocked tests for request success, input and destination validation, no catalog candidates, catalog fallback, invalid AI IDs, Crew failure, structured selection validation, and no trip mutation.
- Updated the API reference, Accommodation Agent status, roadmap, and verification documentation.

Files created:

- `backend/accommodation/__init__.py`
- `backend/accommodation/crew.py`
- `backend/accommodation/service.py`

Files modified:

- `backend/schemas/schemas.py`
- `backend/api/routes.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- Python compile checks for the new accommodation modules, routes, schemas, and tests: passed.
- `DATABASE_URL=sqlite:///./tourflow.db` and `GEMINI_API_KEY` cleared: `venv\\Scripts\\python.exe -m pytest tests -q` passed (19 passed, 21 warnings).
- OpenAPI includes `/api/accommodations/recommendations`.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: failed before bundling because Vite could not write a temporary configuration file in `node_modules/.vite-temp` due to Windows `EPERM`.
- One controlled live `POST /api/accommodations/recommendations` request through FastAPI, CrewAI, Gemini, and catalog validation: HTTP 200 with `source=crewai` and catalog hotel `htl-manali-002`.

### 2026-09-06 CrewAI Live Validation

Inspected:

- The existing Research Agent workflow in `backend/research/crew.py` and `backend/research/service.py`.
- The `POST /api/research` FastAPI route, research schemas, current virtual environment, and local SQLite catalog database.
- Installed CrewAI storage-path behavior on Windows after its task-output database could not be initialized in the configured Windows app-data location.

Changed:

- Confirmed the existing `crewai>=1.0.0,<2.0.0` dependency is installed in `venv`; installed version is 1.15.20 and no dependency versions changed.
- Added a Windows-only CrewAI internal storage-path override in the existing Research Agent before CrewAI imports. It directs CrewAI's ephemeral task-output database to the writable system temporary directory. The agent role, task, Gemini model selection, route, and `ResearchResult` contract are unchanged.
- Updated the Research Agent status and known limitation to reflect the live validation result.

Files modified:

- `backend/research/crew.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m pip install --disable-pip-version-check --no-input 'crewai>=1.0.0,<2.0.0'`: requirement already satisfied at 1.15.20.
- `venv\\Scripts\\python.exe -m py_compile backend\\research\\crew.py`: passed.
- One controlled `POST /api/research` execution using the existing FastAPI route, CrewAI implementation, Gemini configuration, and local SQLite catalog: HTTP 502. CrewAI reached Gemini, but each internal attempt failed with Windows socket error `WinError 10013`; no validated `ResearchResult` was returned. No further live requests were made.
- `DATABASE_URL=sqlite:///./tourflow.db` and `GEMINI_API_KEY` cleared: `venv\\Scripts\\python.exe -m pytest tests -v` passed (14 passed, 21 warnings).

Known remaining issues:

- This environment blocks outbound sockets required by Gemini, preventing a successful live `ResearchResult` and FastAPI 200 response. The single CrewAI request made three internal failed Gemini attempts before returning HTTP 502.

### 2026-09-06 Verification Pass

Inspected:

- `AGENTS.md`, `README.md`, and the existing `AI Development Context / Change Log`.
- Repository file list excluding virtualenv and generated cache paths.
- Research implementation files under `backend/research/`.
- FastAPI route integration in `backend/main.py` and `backend/api/routes.py`.
- Research schemas in `backend/schemas/schemas.py`.
- Gemini integration in `backend/ai/gemini_service.py`.
- SQLAlchemy catalog and trip models in `backend/models/models.py`.
- Database connection/config files, requirements, package scripts, and backend tests.
- Current Python environment package availability for `crewai` and `google.genai`.

Changed:

- Updated `README.md` only.
- Added `POST /api/research` to the README API reference.
- Added `Current Project Status`, `Research Agent`, and `Agent Roadmap` documentation.
- Documented verification evidence, test results, known limitations, and current agent implementation status.

Files modified:

- `README.md`

Tests/checks performed:

- `pytest tests -v` with `DATABASE_URL=sqlite:///./tourflow.db` and `GEMINI_API_KEY` cleared: 14 passed, 21 warnings.
- Controlled no-credit `POST /api/research` request through FastAPI `TestClient`: HTTP 200, valid catalog fallback `ResearchResult`, no forbidden response fields, trip count unchanged.
- Python AST parse check for backend and tests: 21 files parsed successfully.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: failed because Vite could not write a temporary config file under `node_modules/.vite-temp` due to Windows `EPERM`.

Known remaining issues:

- `crewai` is declared in `requirements.txt` but was not installed in the current `venv`, so live CrewAI execution was not verified.
- Live Gemini-backed research output was not tested during this verification pass to avoid unnecessary API-credit usage.
- The local build remains blocked by the same Vite `node_modules/.vite-temp` Windows permission error observed during verification.

### 2026-09-06

Inspected:

- `Agents.md`, `README.md`, and its prior change-log entries.
- FastAPI application and routes in `backend/main.py` and `backend/api/routes.py`.
- Existing Gemini service, SQLAlchemy destination catalog models, Pydantic schemas, seed data, requirements, and backend tests.
- The installed Python environment, which did not contain CrewAI before this change.

Changed:

- Added the read-only destination Research Agent workflow under `backend/research/`.
- Added `POST /api/research`, accepting `ResearchContext` and returning validated `ResearchResult`.
- Added focused research schemas, reusing the existing `TripPreferenceBase` rather than creating a parallel preference or trip-state model.
- Added centralized `GeminiService.generate_destination_research`, which requests JSON only and explicitly excludes itinerary, inventory selection, transport, accommodation, price, and booking work.
- Added catalog-grounded behavior when Gemini is not configured; it only uses destination catalog fields and does not mutate database records.
- Added the `crewai` deployment dependency. When installed, the workflow runs one CrewAI `Agent` and one structured `Task` using the existing Gemini key; when absent locally, the same route uses the centralized Gemini service to preserve the response contract.
- Added focused tests for complete and partial context, validation failures, unknown destinations, crew execution seam, Gemini failure, and malformed output.

Files created:

- `backend/research/__init__.py`
- `backend/research/crew.py`
- `backend/research/service.py`

Files modified:

- `backend/schemas/schemas.py`
- `backend/ai/gemini_service.py`
- `backend/api/routes.py`
- `requirements.txt`
- `tests/test_backend.py`
- `README.md`

API added:

- `POST /api/research` — resolves a catalog destination and returns non-mutating structured destination research. It returns 404 for unknown catalog destinations, 422 for invalid request context, and 502 when configured Gemini/Crew research output cannot be validated.

Implementation details:

- Research never creates or edits `Trip`, `TripPreference`, itinerary items, bookings, vendors, hotels, transport, or activity inventory.
- The response `source` is `catalog_fallback` when Gemini is unavailable, otherwise `gemini` (or `crewai` when a CrewAI executor returns that source).

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

### 2026-09-07 Recommendation Engine Strengthening

Inspected:

- `AGENTS.md`, `README.md`, the existing recommendation engine, FastAPI route usage, Gemini recommendation helper, SQLAlchemy catalog models, seeded catalog, and backend tests.

Changed:

- Reworked `backend/recommendation/engine.py` in place. `RecommendationEngine.get_recommendations(destination_id, preferences)` continues to query only active catalog records and scopes all three catalog queries to `destination_id` when it is supplied.
- Added deterministic hotel, activity, and transport scoring based on direct matches between the supplied preferences and catalog fields, catalog-relative budget suitability and price efficiency, rating where present, and catalog-relative duration efficiency where present. Scores have stable catalog-field tie breakers and each returned recommendation includes a numeric `match_score`.
- Expanded recommendation serialization to retain the catalog fields for each returned hotel, activity, and transport option. Gemini remains an optional summary only; Gemini failures return an unavailable insight while the deterministic catalog ranking is still returned.

Files modified:

- `backend/recommendation/engine.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m py_compile backend\\recommendation\\engine.py`: passed.
- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (48 passed, 43 warnings).

### 2026-09-07 Ranked Itinerary Generation

Inspected:

- `AGENTS.md`, `README.md`, the persisted itinerary generator, trip creation route, SQLAlchemy trip and itinerary models, recommendation engine, seeded catalog, and backend tests.

Changed:

- Reworked `backend/itinerary/generator.py` in place. `ItineraryGenerator.generate_for_trip(trip_id)` now loads the trip preferences and consumes the ranked hotel, activity, and transport candidates supplied by `RecommendationEngine` for the trip destination.
- The generator re-fetches ranked IDs from the active, destination-scoped, currency-compatible catalog before persisting proposed itinerary items. It uses catalog titles, descriptions, locations, IDs, and model prices only; itinerary costs use hotel nightly price across trip nights, transport price, and activity price per person multiplied by the trip traveler count.
- Repeated generation returns the trip's existing itinerary items without adding duplicates. New generation deduplicates activity IDs, stops when ranked activities are exhausted, and uses a ranked greedy budget guard without itinerary optimization or synthetic filler content.
- Added a focused backend test covering ranked candidate consumption, catalog cost calculation, activity deduplication, and repeat-generation safety.

Files modified:

- `backend/itinerary/generator.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m py_compile backend\\itinerary\\generator.py`: passed.
- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (49 passed, 47 warnings).

### 2026-09-07 Trip Optimization Layer

Inspected:

- `AGENTS.md`, `README.md`, FastAPI routes, request and response schemas, SQLAlchemy trip and catalog models, the itinerary generator, recommendation engine, and backend tests.

Changed:

- Added `POST /api/trips/{trip_id}/optimize` in `backend/api/routes.py`. It derives all optimization inputs from the persisted trip, so no optimization request schema or database table was added.
- Extended `backend/itinerary/generator.py` with `optimize_for_trip(trip_id)`, sharing its existing ranked-catalog construction path with `generate_for_trip`. The optimizer replaces only proposed catalog-backed itinerary items, preserving non-proposed items and reserving their cost and catalog IDs.
- Optimization uses active, destination-scoped, currency-compatible candidates returned by `RecommendationEngine`; it excludes transport options below the trip traveler capacity, avoids duplicate activity IDs, bounds new selections by the remaining trip budget, limits activity slots by duration and pace, and leaves unfilled slots empty. It does not use Gemini for selection and does not perform route-distance or advanced mathematical optimization.
- Added a focused endpoint test for ranked replacement, budget compliance, activity deduplication, repeat behavior, and OpenAPI registration.

Files modified:

- `backend/api/routes.py`
- `backend/itinerary/generator.py`
- `tests/test_backend.py`
- `README.md`

Tests/checks performed:

- `venv\\Scripts\\python.exe -m py_compile backend\\itinerary\\generator.py backend\\api\\routes.py`: passed.
- `venv\\Scripts\\python.exe -m pytest tests\\test_backend.py -q`: passed (50 passed, 51 warnings).
