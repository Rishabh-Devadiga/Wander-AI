"""Live hotel search client for SerpApi Google Hotels.

Backend-only: the API key is supplied by the caller (read from backend
environment) and never leaves the server. All helpers are defensive --
missing fields yield None, malformed records are skipped, and any transport
or payload failure raises SerpApiError so routes can respond safely.
"""

import re
from datetime import date
from typing import Any, Dict, List, Optional

import httpx


class SerpApiError(Exception):
    """Raised when the SerpApi request fails or returns unusable data."""


def _http_get(url: str, params: Dict[str, Any], timeout_s: float) -> httpx.Response:
    return httpx.get(url, params=params, timeout=float(timeout_s))


def _parse_money(value: Any) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip().replace("$", "").replace(",", "").strip()
    if not text:
        return None
    try:
        amount = float(text)
    except (TypeError, ValueError):
        return None
    return amount if amount > 0 else None


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


def validate_search_dates(check_in: str, check_out: str) -> None:
    """Validate YYYY-MM-DD dates with checkout after checkin. Raises ValueError."""
    try:
        start = date.fromisoformat((check_in or "").strip())
        end = date.fromisoformat((check_out or "").strip())
    except ValueError as exc:
        raise ValueError("check_in_date and check_out_date must use YYYY-MM-DD format") from exc
    if end <= start:
        raise ValueError("check_out_date must be after check_in_date")


def rating_filter(min_rating: Optional[float]) -> Optional[str]:
    """Map a minimum rating to the SerpApi rating filter (7/8/9)."""
    if min_rating is None:
        return None
    if min_rating >= 4.5:
        return "9"
    if min_rating >= 4.0:
        return "8"
    if min_rating >= 3.5:
        return "7"
    return None


def search_serpapi_hotels(
    api_key: str,
    base_url: str,
    *,
    destination: str,
    check_in_date: str,
    check_out_date: str,
    adults: int = 2,
    children: int = 0,
    currency: str = "INR",
    gl: str = "in",
    hl: str = "en",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    timeout_s: float = 20.0,
    max_results: int = 10,
) -> List[Dict[str, Any]]:
    """Query SerpApi Google Hotels and return normalized hotel dicts."""
    query = (destination or "").strip()
    if not query:
        raise ValueError("destination is required")
    validate_search_dates(check_in_date, check_out_date)
    params: Dict[str, Any] = {
        "engine": "google_hotels",
        "api_key": api_key,
        "q": query,
        "check_in_date": check_in_date.strip(),
        "check_out_date": check_out_date.strip(),
        "adults": max(1, int(adults or 2)),
        "children": max(0, int(children or 0)),
        "currency": (currency or "INR").upper(),
        "gl": (gl or "in").lower(),
        "hl": (hl or "en").lower(),
    }
    rating = rating_filter(min_rating)
    if rating:
        params["rating"] = rating
    if min_price is not None:
        params["min_price"] = min_price
    if max_price is not None:
        params["max_price"] = max_price
    try:
        response = _http_get(base_url.rstrip("/") + "/search", params, timeout_s)
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise SerpApiError("Hotel search timed out") from exc
    except httpx.HTTPError as exc:
        raise SerpApiError(f"Hotel search failed: {exc}") from exc
    try:
        payload = response.json()
    except ValueError as exc:
        raise SerpApiError("Hotel search returned an invalid response") from exc
    if isinstance(payload, dict) and payload.get("error"):
        raise SerpApiError(f"Hotel search failed: {payload.get('error')}")
    properties = (payload.get("properties") if isinstance(payload, dict) else None) or []
    if not isinstance(properties, list):
        raise SerpApiError("Hotel search returned an unexpected response")
    normalized = []
    for prop in properties:
        item = normalize_property(prop, params["currency"])
        if item is not None:
            normalized.append(item)
    return normalized[: max(0, int(max_results))]


def normalize_property(prop: Any, currency: str) -> Optional[Dict[str, Any]]:
    """Normalize one SerpApi property; None skips records without a name."""
    if not isinstance(prop, dict):
        return None
    name = prop.get("name")
    name = str(name).strip() if name else ""
    if not name:
        return None
    token = prop.get("property_token")
    token = str(token).strip() if token else ""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "hotel"
    gps = prop.get("gps_coordinates") or {}
    rate = prop.get("rate_per_night") or {}
    total = prop.get("total_rate") or {}
    price_per_night = _parse_money(rate.get("extracted_lowest", rate.get("lowest")))
    if price_per_night is None:
        vendor_prices = [
            _parse_money((offer or {}).get("rate_per_night", {}).get("extracted_lowest"))
            if isinstance(offer, dict) else None
            for offer in (prop.get("prices") or [])
        ]
        vendor_prices = [p for p in vendor_prices if p is not None]
        price_per_night = min(vendor_prices) if vendor_prices else None
    total_price = _parse_money(total.get("extracted_lowest", total.get("lowest")))
    images = prop.get("images") or []
    image_url = None
    if images and isinstance(images[0], dict):
        image_url = images[0].get("original_image") or images[0].get("thumbnail")
    amenities = [a for a in (prop.get("amenities") or []) if isinstance(a, str) and a.strip()]
    essential = [e for e in (prop.get("essential_info") or []) if isinstance(e, str) and e.strip()]
    description = "; ".join(essential[:3]) if essential else None
    return {"id": f"serpapi-{token}" if token else f"serpapi-{slug}",
            "property_token": token or None, "name": name,
            "rating": _to_float(prop.get("overall_rating")),
            "reviews_count": _to_int(prop.get("reviews")),
            "location": None,
            "latitude": _to_float(gps.get("latitude")) if isinstance(gps, dict) else None,
            "longitude": _to_float(gps.get("longitude")) if isinstance(gps, dict) else None,
            "image_url": image_url if isinstance(image_url, str) and image_url.startswith("http") else None,
            "price_per_night": price_per_night, "total_price": total_price,
            "currency": currency,
            "amenities": amenities,
            "hotel_class": _to_int(prop.get("hotel_class")),
            "description": description, "source": "serpapi"}
