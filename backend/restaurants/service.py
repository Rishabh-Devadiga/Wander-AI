"""Live restaurant search client for SerpApi Google Maps.

Backend-only: the API key is supplied by the caller (read from backend
environment) and never leaves the server. All helpers are defensive --
missing fields yield None, malformed records are skipped, and any transport
or payload failure raises SerpApiRestaurantError so routes can respond
safely without inventing restaurant data.

Endpoint used (SerpApi Google Maps search):
  GET {SERPAPI_BASE_URL}/search
    ?engine=google_maps
    &q=Restaurants in <destination> [<cuisine>] [<meal type>]
    &type=search
    &hl=en &gl=in
    [&ll=@<lat>,<lng>,14z]
    &api_key=<SERPAPI_API_KEY>

Normalized results come exclusively from the provider ``local_results``
array. Gemini (when used) may only rank/select from these candidates; any
selection outside the candidate list is rejected and replaced with the
deterministic best candidate.
"""

import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)


class SerpApiRestaurantError(Exception):
    """Raised when the SerpApi restaurant request fails or returns unusable data."""


# In-memory cache: one provider call per unique destination query per process.
# Prevents repeated serial searches when several meals share a destination.
_restaurant_cache: Dict[str, List[Dict[str, Any]]] = {}


def clear_restaurant_cache() -> None:
    """Clear the in-memory restaurant cache (used by tests)."""
    _restaurant_cache.clear()


def _http_get(url: str, params: Dict[str, Any], timeout_s: float) -> httpx.Response:
    return httpx.get(url, params=params, timeout=float(timeout_s))


def _to_float(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def _to_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _cache_key(
    destination: str,
    meal_type: Optional[str],
    cuisine: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    max_results: int,
) -> str:
    return "|".join(
        [
            (destination or "").strip().casefold(),
            (meal_type or "").strip().casefold(),
            (cuisine or "").strip().casefold(),
            str(latitude or ""),
            str(longitude or ""),
            str(max(0, int(max_results))),
        ]
    )


def build_restaurant_query(
    destination: str,
    meal_type: Optional[str] = None,
    cuisine: Optional[str] = None,
) -> str:
    """Build a Google Maps restaurant query. No hardcoded venue names."""
    dest = (destination or "").strip()
    parts = [f"Restaurants in {dest}"]
    if cuisine and cuisine.strip():
        parts.append(cuisine.strip())
    meal = (meal_type or "").strip().casefold()
    if meal in {"breakfast", "lunch", "dinner", "brunch"}:
        parts.append(meal)
    return " ".join(parts)


def normalize_local_result(item: Any) -> Optional[Dict[str, Any]]:
    """Normalize one SerpApi local_results entry; None skips records without a name.

    Only fields actually present in the provider payload are populated.
    Missing values stay None -- never fabricated.
    """
    if not isinstance(item, dict):
        return None
    name = item.get("title") or item.get("name")
    name = str(name).strip() if name else ""
    if not name:
        return None
    place_id = item.get("place_id") or item.get("data_id") or item.get("place_ids")
    if isinstance(place_id, dict):
        place_id = place_id.get("place_id")
    if isinstance(place_id, list):
        place_id = place_id[0] if place_id else None
    place_id = str(place_id).strip() if place_id else None
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "restaurant"
    gps = item.get("gps_coordinates") or {}
    address = item.get("address")
    address = str(address).strip() if address else None
    thumbnail = item.get("thumbnail")
    thumbnail = str(thumbnail).strip() if thumbnail else None
    website = item.get("website") or item.get("link")
    website = str(website).strip() if website else None
    phone = item.get("phone")
    phone = str(phone).strip() if phone else None
    hours = item.get("hours") or item.get("open_state_text") or item.get("operating_hours")
    if isinstance(hours, dict):
        hours = hours.get("weekday_text") or hours.get("text") or None
    if isinstance(hours, list):
        hours = "; ".join(str(h).strip() for h in hours if str(h).strip()) or None
    if hours is not None:
        hours = str(hours).strip() or None
    rating = _to_float(item.get("rating"))
    reviews = _to_int(item.get("reviews") or item.get("reviews_count"))
    latitude = _to_float(gps.get("latitude")) if isinstance(gps, dict) else None
    longitude = _to_float(gps.get("longitude")) if isinstance(gps, dict) else None
    types = [t for t in (item.get("types") or []) if isinstance(t, str) and t.strip()]
    return {
        "id": f"serpapi-restaurant-{place_id}" if place_id else f"serpapi-restaurant-{slug}",
        "place_id": place_id,
        "name": name,
        "address": address,
        "rating": rating,
        "reviews_count": reviews,
        "latitude": latitude,
        "longitude": longitude,
        "website": website if website and website.startswith("http") else None,
        "phone": phone,
        "hours": hours,
        "image_url": thumbnail if thumbnail and thumbnail.startswith("http") else None,
        "types": types,
        "source": "serpapi",
    }


def search_serpapi_restaurants(
    api_key: str,
    base_url: str,
    *,
    destination: str,
    meal_type: Optional[str] = None,
    cuisine: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    min_rating: Optional[float] = None,
    timeout_s: float = 20.0,
    max_results: int = 8,
) -> List[Dict[str, Any]]:
    """Query SerpApi Google Maps and return normalized restaurant dicts.

    Results are cached per unique query so multiple meals in one destination
    share a single provider call. Failures raise SerpApiRestaurantError;
    callers must fall back to ``restaurant: null`` rather than inventing data.
    """
    query = (destination or "").strip()
    if not query:
        raise ValueError("destination is required")
    if not (api_key or "").strip():
        raise SerpApiRestaurantError("Restaurant search provider is not configured")
    lat = _to_float(latitude)
    lng = _to_float(longitude)
    limit = max(1, min(int(max_results or 8), 20))
    key = _cache_key(query, meal_type, cuisine, lat, lng, limit)
    if key in _restaurant_cache:
        cached = _restaurant_cache[key]
        return _apply_min_rating(cached, min_rating)[:limit]

    params: Dict[str, Any] = {
        "engine": "google_maps",
        "api_key": api_key.strip(),
        "q": build_restaurant_query(query, meal_type, cuisine),
        "type": "search",
        "hl": "en",
        "gl": "in",
    }
    if lat is not None and lng is not None:
        params["ll"] = f"@{lat},{lng},14z"
    try:
        response = _http_get(base_url.rstrip("/") + "/search", params, timeout_s)
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise SerpApiRestaurantError("Restaurant search timed out") from exc
    except httpx.HTTPError as exc:
        raise SerpApiRestaurantError(f"Restaurant search failed: {exc}") from exc
    try:
        payload = response.json()
    except ValueError as exc:
        raise SerpApiRestaurantError("Restaurant search returned an invalid response") from exc
    if isinstance(payload, dict) and payload.get("error"):
        raise SerpApiRestaurantError(f"Restaurant search failed: {payload.get('error')}")
    local_results = (payload.get("local_results") if isinstance(payload, dict) else None) or []
    if not isinstance(local_results, list):
        raise SerpApiRestaurantError("Restaurant search returned an unexpected response")
    normalized: List[Dict[str, Any]] = []
    for entry in local_results:
        item = normalize_local_result(entry)
        if item is not None:
            normalized.append(item)
    # Highest-rated first so deterministic fallback is stable.
    normalized.sort(
        key=lambda r: (-(r.get("rating") or 0.0), -(r.get("reviews_count") or 0)),
    )
    _restaurant_cache[key] = normalized
    return _apply_min_rating(normalized, min_rating)[:limit]


def _apply_min_rating(
    candidates: List[Dict[str, Any]], min_rating: Optional[float]
) -> List[Dict[str, Any]]:
    if min_rating is None:
        return list(candidates)
    try:
        floor = float(min_rating)
    except (TypeError, ValueError):
        return list(candidates)
    return [c for c in candidates if (c.get("rating") or 0.0) >= floor]


def select_best_candidate(
    candidates: List[Dict[str, Any]],
    *,
    min_rating: Optional[float] = None,
    exclude_ids: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """Deterministically pick the best candidate. Returns None when empty."""
    excluded = set(exclude_ids or [])
    pool = [c for c in _apply_min_rating(candidates or [], min_rating) if c.get("id") not in excluded]
    if not pool:
        return None
    return pool[0]


# ---------------------------------------------------------------------------
# Location-aware ranking (per-meal anchor matching)
# ---------------------------------------------------------------------------

_EARTH_RADIUS_KM = 6371.0


def haversine_km(
    lat_a: Any, lng_a: Any, lat_b: Any, lng_b: Any
) -> Optional[float]:
    """Great-circle distance in km; None when any coordinate is missing/invalid."""
    try:
        phi_a, phi_b = math.radians(float(lat_a)), math.radians(float(lat_b))
        delta_phi = math.radians(float(lat_b) - float(lat_a))
        delta_lng = math.radians(float(lng_b) - float(lng_a))
    except (TypeError, ValueError):
        return None
    hav = math.sin(delta_phi / 2) ** 2 + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lng / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(hav))


def _looks_closed(hours: Any) -> bool:
    """True when provider hours text explicitly marks the venue closed."""
    if not isinstance(hours, str) or not hours.strip():
        return False
    return "closed" in hours.casefold()


def _cuisine_bonus(candidate: Dict[str, Any], cuisine: Optional[str]) -> float:
    """Small ranking bonus when the requested cuisine appears in provider text.

    Only matches against fields SerpApi actually returned (name/types/address).
    """
    if not cuisine or not str(cuisine).strip():
        return 0.0
    wanted = str(cuisine).strip().casefold()
    haystack = " ".join(
        [
            str(candidate.get("name") or ""),
            str(candidate.get("address") or ""),
            " ".join(candidate.get("types") or []),
        ]
    ).casefold()
    return 0.5 if wanted and wanted in haystack else 0.0


def rank_candidates_for_anchor(
    candidates: List[Dict[str, Any]],
    *,
    anchor_latitude: Optional[float] = None,
    anchor_longitude: Optional[float] = None,
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    exclude_ids: Optional[List[str]] = None,
    max_distance_km: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """Rank provider candidates for one meal anchor point (no fabrication).

    Scoring (deterministic, stable):
      - primary: distance to the anchor when both sides have coordinates
        (nearest first; candidates without coordinates sort after those with);
      - rating (higher first), then review count, break near-ties;
      - venues whose provider hours say "closed" sort last;
      - optional cuisine text bonus from provider-returned fields only.

    ``max_distance_km`` filters to nearby venues when anchor coordinates are
    known; when anchor coordinates are unknown no distance filtering applies.
    Each returned dict is a copy with an added ``distance_km`` key (None when
    unmeasurable). Inputs are never mutated.
    """
    excluded = set(exclude_ids or [])
    pool = [c for c in _apply_min_rating(candidates or [], min_rating) if c.get("id") not in excluded]
    anchor_lat = _to_float(anchor_latitude)
    anchor_lng = _to_float(anchor_longitude)
    anchor_known = anchor_lat is not None and anchor_lng is not None
    scored: List[Tuple[Tuple, Dict[str, Any]]] = []
    for candidate in pool:
        distance = (
            haversine_km(anchor_lat, anchor_lng, candidate.get("latitude"), candidate.get("longitude"))
            if anchor_known
            else None
        )
        if max_distance_km is not None and anchor_known and distance is not None:
            try:
                if distance > float(max_distance_km):
                    continue
            except (TypeError, ValueError):
                pass
        rating = candidate.get("rating") or 0.0
        reviews = candidate.get("reviews_count") or 0
        closed = _looks_closed(candidate.get("hours"))
        bonus = _cuisine_bonus(candidate, cuisine)
        # Lower sort key wins: unknown distance sorts after any measured one.
        key = (
            1 if closed else 0,
            distance if distance is not None else float("inf"),
            -(rating + bonus),
            -reviews,
            str(candidate.get("name") or ""),
        )
        copy = dict(candidate)
        copy["distance_km"] = distance
        scored.append((key, copy))
    scored.sort(key=lambda entry: entry[0])
    return [copy for _, copy in scored]


def validate_gemini_selection(
    candidates: List[Dict[str, Any]], selected_id: Any
) -> Optional[Dict[str, Any]]:
    """Accept a Gemini choice only when its ID exists in the candidate list.

    Any unknown/hallucinated ID is rejected (returns None) so the caller can
    fall back to a valid provider candidate.
    """
    if not selected_id or not isinstance(selected_id, str):
        return None
    wanted = selected_id.strip()
    for candidate in candidates or []:
        if candidate.get("id") == wanted or (candidate.get("place_id") and candidate.get("place_id") == wanted):
            return candidate
    logger.warning("Rejected Gemini restaurant selection outside SerpApi candidates: %s", wanted)
    return None


def rank_with_gemini(
    candidates: List[Dict[str, Any]],
    gemini_service: Any,
    context: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[Dict[str, Any]], str]:
    """Ask Gemini to choose ONLY from supplied candidates.

    Returns (selected_candidate_or_None, source). Any Gemini output that does
    not reference a candidate ID is rejected and replaced with the
    deterministic best candidate (source ``serpapi_ranked_fallback``).
    """
    if not candidates:
        return None, "none"
    if gemini_service is None or not getattr(gemini_service, "is_available", lambda: False)():
        return select_best_candidate(candidates), "serpapi"
    compact = [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "rating": c.get("rating"),
            "reviews_count": c.get("reviews_count"),
            "address": c.get("address"),
            "hours": c.get("hours"),
        }
        for c in candidates[:10]
    ]
    prompt = (
        "You are TourFlow AI's restaurant selector. Choose exactly ONE restaurant "
        "from this candidate list only. Return ONLY valid JSON like "
        '{"selected_id": "<candidate id>", "reason": "<short reason>"}. '
        "Never invent a restaurant, name, address, rating, or ID. "
        f"Candidates: {compact}. Context: {context or {}}."
    )
    try:
        client = getattr(gemini_service, "client", None)
        if client is None:
            return select_best_candidate(candidates), "serpapi"
        import json as _json

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json", "temperature": 0.2},
        )
        text = (getattr(response, "text", "") or "").strip()
        data = _json.loads(text) if text else {}
        validated = validate_gemini_selection(candidates, data.get("selected_id"))
        if validated is not None:
            return validated, "gemini_ranked"
        return select_best_candidate(candidates), "serpapi_ranked_fallback"
    except Exception as exc:
        logger.warning("Gemini restaurant ranking failed, using provider order: %s", exc)
        return select_best_candidate(candidates), "serpapi_ranked_fallback"
