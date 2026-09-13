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


# Hosts that never yield displayable photos: watermarked stock comps and
# crawler links that do not hotlink reliably. Entries from these hosts are
# skipped (not merely deprioritized) so every returned URL is showable.
_BLOCKED_IMAGE_HOSTS = (
    "alamy",
    "dreamstime",
    "shutterstock",
    "gettyimages",
    "istockphoto",
    "123rf",
    "depositphotos",
    "fbsbx",
    "lookaside",
    "ytimg.com",
)


def _host_blocked(url: str) -> bool:
    host = url.casefold()
    return any(blocked in host for blocked in _BLOCKED_IMAGE_HOSTS)


# URL path fragments that indicate schematics rather than photographs
# (route maps, diagrams, timetables, logos).
_BLOCKED_URL_PATTERNS = (
    "route_map",
    "routemap",
    "locator_map",
    "locator-map",
    "diagram",
    "flowchart",
    "timetable",
    "/logo",
    "logo.",
)


def _url_blocked(url: str) -> bool:
    lowered = url.casefold()
    return _host_blocked(url) or any(pattern in lowered for pattern in _BLOCKED_URL_PATTERNS)


# Result titles that indicate non-photographs (maps, diagrams, timetables,
# logos). These are skipped so cards show real photos, not schematics.
_NON_PHOTO_TITLE_PATTERNS = (
    "route map",
    "timetable",
    "time table",
    "diagram",
    "flowchart",
    "logo",
    "icon pack",
)


def _title_blocked(title: str) -> bool:
    lowered = (title or "").casefold()
    return any(pattern in lowered for pattern in _NON_PHOTO_TITLE_PATTERNS)


_images_cache: Dict[str, List[str]] = {}


def clear_image_cache() -> None:
    """Clear the in-memory image cache (used by tests)."""
    _images_cache.clear()


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
    """Normalize one ``images_results`` entry to {title, image_url}; None skips.

    Skips records without a usable URL and URLs on blocked (watermarked or
    non-hotlinkable) hosts.
    """
    if not isinstance(item, dict):
        return None
    image_url = _usable_url(item.get("original")) or _usable_url(item.get("thumbnail"))
    if image_url is None or _url_blocked(image_url):
        return None
    title = item.get("title")
    title = str(title).strip() if title else ""
    if _title_blocked(title):
        return None
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
    images = get_real_images_for_location(
        location, destination, api_key, base_url, timeout_s, count=1,
    )
    return images[0] if images else None


def get_real_images_for_location(
    location: str,
    destination: Optional[str] = None,
    api_key: str = "",
    base_url: str = "https://serpapi.com",
    timeout_s: float = 20.0,
    count: int = 1,
) -> List[str]:
    """Return up to ``count`` distinct real photo URLs (relevance order).

    One provider call regardless of count; cached per normalized query+count;
    never raises (failures yield [] so callers fall back to catalog images).
    """
    query = (location or "").strip()
    if not query:
        return []
    limit = max(1, min(int(count or 1), 6))
    key = f"{query.casefold()}|{(destination or '').strip().casefold()}|{limit}"
    if key in _images_cache:
        return list(_images_cache[key])
    try:
        results = search_serpapi_images(
            api_key, base_url, location=query, destination=destination,
            timeout_s=timeout_s, max_results=max(limit, 5),
        )
    except Exception as exc:
        # Never cache failures: a transient provider error (e.g. rate limit)
        # must not poison the key -- the next trip retries live.
        logger.warning("Real image lookup failed for %r: %s", query, exc)
        return []
    seen: List[str] = []
    for result in results:
        url = result["image_url"]
        if url not in seen:
            seen.append(url)
        if len(seen) >= limit:
            break
    _images_cache[key] = seen
    return list(seen)
