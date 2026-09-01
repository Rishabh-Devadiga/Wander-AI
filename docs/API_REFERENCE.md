# TourFlow AI - API Reference

## Base URL
`/api`

## Core Endpoints

### System & Health
- `GET /api/health`
  - Returns backend health, database connection state, destination/trip record counts, and Gemini AI readiness.

### Destinations
- `GET /api/destinations`
  - Optional query: `featured_only=true`
  - Returns array of destinations (Manali, Goa, Kerala, Rajasthan, Kashmir).
- `GET /api/destinations/{id}`
  - Returns full destination entity by UUID or slug.

### Catalog Services
- `GET /api/hotels`
  - Optional query: `destination_id`, `category`
  - Returns verified hotels with nightly rates, ratings, and amenities.
- `GET /api/activities`
  - Optional query: `destination_id`, `category`
  - Returns curated experiences, durations, difficulties, and pricing.
- `GET /api/transport`
  - Optional query: `destination_id`, `type`
  - Returns private SUVs, Volvo buses, and self-drive rentals.

### Trips (Central Entity)
- `POST /api/trips`
  - Body: `{ title, destination_id, duration_days, total_budget, pace, preferences: {...} }`
  - Initializes Trip, attaches preferences, creates welcome notification, records change history, and generates itinerary.
- `GET /api/trips/{trip_id}`
  - Retrieves trip with nested traveler, preferences, itinerary items, bookings, alerts, notifications, and change history.
- `PUT /api/trips/{trip_id}`
  - Updates trip metadata and logs mutation in change_history.
- `GET /api/trips/{trip_id}/preferences`
  - Retrieves preference configuration for the trip.
- `PUT /api/trips/{trip_id}/preferences`
  - Updates preference constraints and logs mutation.

### AI Planning Services
- `POST /api/ai/chat`
  - Body: `{ message, session_context, destination_id }`
  - Conversational concierge interface powered by Gemini.
- `POST /api/ai/extract-preferences`
  - Body: `{ text_prompt }`
  - Structured travel parameter extractor.
- `POST /api/ai/recommend`
  - Body: `{ destination_id, preferences }`
  - Ranked recommendations matching traveler criteria.
- `POST /api/ai/generate-itinerary`
  - Body: `{ trip_id, duration_days, preferences }`
  - Dynamic itinerary synthesis.
- `POST /api/ai/replan`
  - Body: `{ trip_id, trigger_event: { type, severity, description } }`
  - Dynamic replanning engine execution with alert creation and history audit.
