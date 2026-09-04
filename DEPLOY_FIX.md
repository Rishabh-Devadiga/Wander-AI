# Wander-AI deployment fix

## What was fixed

The deployed Vercel frontend was calling `POST /api/operator/ai-assistant`, but the FastAPI backend on Render only exposed `POST /api/ai/chat`. This caused the operator chatbot to fall into its error message even though Gemini was healthy.

This version adds:

- `POST /api/operator/ai-assistant` to the FastAPI backend.
- A response adapter from the FastAPI Gemini response (`response`, `suggestions`) to the UI format (`reply`, `suggested_actions`).
- Correct forwarding of the selected trip as `trip_id`.
- `GET /api/sync/version` to remove the frontend 404 shown in the browser Network panel.
- Updated the operator UI badge to Gemini 3.7 Flash.

## Deploy

1. Replace/push these files to the GitHub repository connected to Render and Vercel.
2. Make sure Render still has `GEMINI_API_KEY` set.
3. Redeploy the Render service first and wait until `/api/health` reports `gemini_available: true`.
4. Redeploy Vercel (or let its GitHub integration deploy automatically).
5. Open the operator chatbot and send `Hello`.

The Gemini key remains server-side; do not add it to the React/Vercel frontend.
