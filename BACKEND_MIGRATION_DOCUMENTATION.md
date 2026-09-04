# Wander-AI Backend Migration Documentation

## Purpose

This file is the single migration documentation record for making Python/FastAPI the production backend for Wander-AI.

Target production architecture:

```text
Vercel React frontend
-> Render FastAPI
-> PostgreSQL
-> Google Gemini
```

The old Node/TypeScript/Express backend should remain only as a legacy reference until it is explicitly removed. Production frontend traffic should not depend on Express.

## Current Production Routing

`vercel.json` rewrites frontend `/api/*` calls to the Render FastAPI backend.

That means every `/api/*` endpoint used by the React frontend must exist in FastAPI with compatible methods, request bodies, response bodies, and error behavior.

## Phase One Scope

Phase one focused on API compatibility. The goal was to make FastAPI provide the endpoints the frontend already calls, without deleting the Express backend or performing unrelated refactors.

Requirements applied:

- Implement only endpoints actually discovered in the codebase.
- Do not create fake endpoints.
- Do not return hardcoded success responses.
- Port existing Express behavior where possible.
- Use PostgreSQL-backed models for real data.
- Use existing Gemini services for AI behavior.
- Preserve frontend request and response expectations where possible.
- Do not rewrite working FastAPI endpoints unnecessarily.

## Phase One Files Changed

- `backend/api/routes.py`
- `backend/schemas/schemas.py`
- `src/services/api.ts`
- `src/components/operator/OperatorAiAssistant.tsx`
- `src/components/operator/OperatorVendors.tsx`

## Phase One FastAPI Routes

Existing or retained routes:

| Method | Route |
| --- | --- |
| GET | `/health` |
| GET | `/sync/version` |
| GET | `/destinations` |
| GET | `/destinations/{id}` |
| GET | `/hotels` |
| GET | `/activities` |
| GET | `/transport` |
| POST | `/trips` |
| GET | `/trips/{trip_id}` |
| PUT | `/trips/{trip_id}` |
| GET | `/trips/{trip_id}/preferences` |
| PUT | `/trips/{trip_id}/preferences` |
| POST | `/operator/ai-assistant` |
| POST | `/ai/chat` |
| POST | `/ai/extract-preferences` |
| POST | `/ai/recommend` |
| POST | `/ai/generate-itinerary` |
| POST | `/ai/replan` |

Routes added or made frontend-compatible in phase one:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/trips` | List trips from PostgreSQL |
| DELETE | `/trips/{trip_id}` | Delete a trip and related records |
| POST | `/trips/{trip_id}/trigger-disruption` | Create disruption alert/notification state |
| POST | `/trips/{trip_id}/impact-analysis` | Analyze real trip impact data |
| POST | `/trips/{trip_id}/ai-replan-options` | Generate replanning options using trip context |
| POST | `/trips/{trip_id}/apply-replan` | Apply selected replanning option |
| POST | `/trips/{trip_id}/accept-request` | Record accepted operator request |
| POST | `/trips/{trip_id}/decline-request` | Record declined operator request |
| GET | `/operator/dashboard` | Return dashboard metrics from PostgreSQL |
| GET | `/operator/vendors` | Return vendors from PostgreSQL |
| POST | `/operator/vendors/{vendor_id}/toggle` | Toggle vendor active status |
| GET | `/operator/bookings` | Return bookings from PostgreSQL |
| POST | `/operator/bookings/{booking_id}/action` | Update booking status |
| GET | `/operator/alerts` | Return alerts from PostgreSQL |
| POST | `/operator/alerts/{alert_id}/resolve` | Resolve alert |
| GET | `/operator/analytics` | Return aggregate analytics from PostgreSQL |
| POST | `/auth/operator-login` | Authenticate configured operator/admin user |
| POST | `/trips/{trip_id}/change-transport` | Update trip transport selection |
| POST | `/trips/{trip_id}/change-accommodation` | Update accommodation-related trip data |
| POST | `/trips/{trip_id}/change-daily-accommodation` | Compatibility alias for accommodation updates |
| POST | `/trips/{trip_id}/change-day-accommodation` | Compatibility alias for accommodation updates |
| POST | `/trips/{trip_id}/add-activity` | Add itinerary item |
| POST | `/trips/{trip_id}/delete-activity` | Delete itinerary item |
| POST | `/trips/{trip_id}/swap-activity` | Swap itinerary item activity |
| POST | `/trips/{trip_id}/edit-activity` | Edit itinerary item details |
| POST | `/trips/{trip_id}/toggle-activity` | Toggle itinerary item active/completed state |
| POST | `/trips/{trip_id}/add-day-leg` | Add itinerary day placeholder |
| POST | `/trips/{trip_id}/remove-day-leg` | Remove itinerary day records |
| GET | `/possible-options` | Return catalog-backed options |
| POST | `/trips/{trip_id}/lock-booking` | Lock booking state for a trip |

## Frontend Compatibility Notes

Frontend endpoint compatibility was prioritized for:

- `/api/sync/version`
- `/api/ai/chat`
- `/api/ai/extract-preferences`
- `/api/ai/replan`
- `/api/operator/ai-assistant`
- `/api/operator/dashboard`
- `/api/operator/vendors`
- `/api/operator/bookings`
- `/api/operator/alerts`
- `/api/operator/analytics`
- `/api/auth/operator-login`
- trip creation, listing, update, deletion, itinerary, replanning, and booking flows

Frontend cleanup completed in phase one:

- Resolved merge conflict markers in `src/services/api.ts`.
- Resolved merge conflict markers in `src/components/operator/OperatorAiAssistant.tsx`.
- Changed `OperatorVendors` server-only import to a type-only import.

## Backend Compatibility Notes

FastAPI route work completed in phase one:

- Resolved merge conflict markers in `backend/api/routes.py`.
- Kept existing working destination, catalog, trip, preference, AI, and health routes.
- Extended trip serialization to include related itinerary, booking, alert, notification, and change-history data used by frontend flows.
- Added database-backed operator endpoints.
- Added database-backed itinerary and replanning endpoints.
- Added configured operator login endpoint.
- Extended AI chat request schema to accept frontend-provided current trip and history context.
- Extended trip creation schema to accept frontend-style destination fields.

## Validation Performed

Static validation:

- `git diff --check` passed.
- Route registration scan found FastAPI route decorators in `backend/api/routes.py`.
- Merge conflict marker scan found no remaining conflict markers in the edited files.

Validation blocked by local environment:

- Python syntax checks could not run because the local `python` command resolves to the Windows Store alias and no Python interpreter is installed or available in PATH.
- FastAPI could not be started locally for the same reason.
- Existing Python tests could not run for the same reason.
- Frontend lint/build could not complete because project dependencies are not installed locally; `npm.cmd run lint` and `npm.cmd run build` could not find `tsc`/`vite`.

## Required Environment Variables

Known environment variables involved in the migration:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `OPERATOR_LOGIN_PASSWORD`
- CORS/frontend origin configuration used by the FastAPI application

`OPERATOR_LOGIN_PASSWORD` is required for the FastAPI operator login endpoint. The endpoint intentionally does not fall back to an insecure hardcoded demo password.

## Remaining Phase One Risks

- Some compatibility endpoints still accept flexible request bodies because the frontend contracts were broader than the existing FastAPI schemas.
- Operator authentication returns a generated token, but a durable signed JWT/session architecture still needs to be implemented.
- Operator analytics are backed by real aggregate data, but the exact shape may need tightening once frontend expectations are locked.
- Some Express behavior used in-memory data; FastAPI equivalents now use PostgreSQL models, but complete parity may require database migrations for fields that Express previously invented in memory.
- Local runtime validation still needs a working Python environment and installed Node dependencies.

## Phase Two Scope

Phase two should make the compatibility work clean, typed, secure, tested, and deployment-ready.

Recommended order:

1. Install/restore local validation dependencies.
2. Run Python syntax checks, FastAPI startup, route registration checks, and backend tests.
3. Run frontend type checking and production build.
4. Replace flexible request bodies with explicit Pydantic request/response models.
5. Align FastAPI response schemas with frontend TypeScript types.
6. Add missing database migrations for durable trip/operator/itinerary parity.
7. Replace temporary operator token generation with signed JWT or session handling.
8. Add role checks to operator endpoints.
9. Add API contract tests for every frontend-used `/api/*` endpoint.
10. Update deployment docs with Render env vars, Vercel rewrites, CORS origins, and health-check expectations.
11. Once FastAPI is fully validated in production, plan removal of the Express backend.

## Phase Two Documentation Tasks

Keep this file updated with:

- route compatibility changes
- schema changes
- database migrations
- authentication changes
- validation results
- deployment changes
- remaining migration risks

Do not split migration notes across multiple files unless the project later needs generated API reference docs.

