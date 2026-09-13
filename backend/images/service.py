"""Live attraction/activity image search via SerpApi Google Images.

Backend-only: the API key is supplied by the caller (read from backend
environment) and never leaves the server. Results are real, relevance-ranked
photographs for the queried place -- never fabricated, never hardcoded.

Endpoint used:
  GET {SERPAPI_BASE_URL}/search
    ?engine=google_images
    &q=<activity title>, <destination>
    &hl=en &gl=in
    &api_key=<SERPAPI_API_KEY>

Normalization prefers the full-resolution ``original`` URL and falls back to
the ``thumbnail``; only http(s) URLs are kept. Records without a usable URL
are skipped. An in-memory per-query cache keeps one trip generation to (at
most) one provider call per unique location.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class SerpApiImageError(Exception):
    """Raised when the SerpApi image request fails or returns unusable data."""


_image_cache: Dict[str, Optional[str]] = {}


def clear_image_cache() -> None:
    """Clear the in-memory image cache (used by tests)."""
    _image_cache.clear()


def _http_get(url: str, params: Dict[str, Any], timeout_s: float) -> httpx.Response:
    return httpx.get(url, params=params, timeout=float(timeout_s))


def _usable_url(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    url = value.strip()
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return None


def normalize_image_result(item: Any) -> Optional[Dict[str, str]]:
    """Normalize one ``images_results`` entry to {title, image_url}; None skips."""
    if not isinstance(item, dict):
        return None
    image_url = _usable_url(item.get("original")) or _usable_url(item.get("thumbnail"))
    if image_url is None:
        return None
    title = item.get("title")
    title = str(title).strip() if title else ""
    return {"title": title, "image_url": image_url}


def build_image_query(location: str, destination: Optional[str] = None) -> str:
    """Build a relevance query from the activity title plus destination context."""
    query = (location or "").strip()
    dest = (destination or "").strip() if destination else ""
    if dest and dest.casefold() not in query.casefold():
        query = f"{query}, {dest}" if query else dest
    return query


def search_serpapi_images(
    api_key: str,
    base_url: str,
    *,
    location: str,
    destination: Optional[str] = None,
    timeout_s: float = 20.0,
    max_results: int = 3,
) -> List[Dict[str, str]]:
    """Query SerpApi Google Images and return normalized results (relevance order)."""
    query = build_image_query(location, destination)
    if not query:
        raise ValueError("location is required")
    if not (api_key or "").strip():
        raise SerpApiImageError("Image search provider is not configured")
    params: Dict[str, Any] = {
        "engine": "google_images",
        "api_key": api_key.strip(),
        "q": query,
        "hl": "en",
        "gl": "in",
    }
    try:
        response = _http_get(base_url.rstrip("/") + "/search", params, timeout_s)
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise SerpApiImageError("Image search timed out") from exc
    except httpx.HTTPError as exc:
        raise SerpApiImageError(f"Image search failed: {exc}") from exc
    try:
        payload = response.json()
    except ValueError as exc:
        raise SerpApiImageError("Image search returned an invalid response") from exc
    if isinstance(payload, dict) and payload.get("error"):
        raise SerpApiImageError(f"Image search failed: {payload.get('error')}")
    raw = (payload.get("images_results") if isinstance(payload, dict) else None) or []
    if not isinstance(raw, list):
        raise SerpApiImageError("Image search returned an unexpected response")
    normalized: List[Dict[str, str]] = []
    for entry in raw:
        item = normalize_image_result(entry)
        if item is not None:
            normalized.append(item)
    return normalized[: max(1, min(int(max_results or 3), 10))]


def get_real_image_for_location(
    location: str,
    destination: Optional[str] = None,
    api_key: str = "",
    base_url: str = "https://serpapi.com",
    timeout_s: float = 20.0,
) -> Optional[str]:
    """Return the top real photo URL for a location, or None when unavailable.

    Cached per normalized query; never raises (provider failures yield None so
    callers keep the existing catalog image instead of a fabricated one).
    """
    query = (location or "").strip()
    if not query:
        return None
    key = f"{query.casefold()}|{(destination or '').strip().casefold()}"
    if key in _image_cache:
        return _image_cache[key]
    try:
        results = search_serpapi_images(
            api_key, base_url, location=query, destination=destination,
            timeout_s=timeout_s,
        )
    except Exception as exc:
        logger.warning("Real image lookup failed for %r: %s", query, exc)
        _image_cache[key] = None
        return None
    image_url = results[0]["image_url"] if results else None
    _image_cache[key] = image_url
    return image_url
