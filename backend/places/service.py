"""Live places/attractions with provider-backed images (keyless providers).

Pipeline: catalog coordinates (or Nominatim geocode for unknown places)
-> Overpass tourist POIs (real names + coordinates)
-> Wikimedia Commons geotagged thumbnails (real image URLs).
Every helper never raises: failures yield None/[] so callers fall back to
existing static content instead of fabricated places or images.
"""

from typing import Any, Dict, List, Optional, Tuple

import httpx

_USER_AGENT = "TourFlowAI/1.0 (travel planning prototype)"

# OSM tags treated as visitable places.
_PLACE_QUERIES = (
    'node["tourism"~"^(attraction|museum|artwork|viewpoint|gallery|theme_park|zoo)$"]',
    'way["tourism"~"^(attraction|museum|artwork|viewpoint|gallery|theme_park|zoo)$"]',
    'node["historic"~"^(monument|memorial|castle|fort|ruins|archaeological_site)$"]',
    'node["leisure"~"^(park|garden|nature_reserve)$"]',
    'node["amenity"~"^(place_of_worship)$"]',
)

_COMMONS_FILE_DOMAIN = "https://upload.wikimedia.org/"


def _http_get(url: str, params: Dict[str, Any], timeout_s: float,
              headers: Optional[Dict[str, str]] = None) -> httpx.Response:
    merged = {"User-Agent": _USER_AGENT}
    if headers:
        merged.update(headers)
    return httpx.get(url, params=params, headers=merged, timeout=float(timeout_s))


def geocode_place(name: str, base_url: str, timeout_s: float) -> Optional[Tuple[float, float, str]]:
    """Nominatim geocode to (lat, lng, display_name); None when unresolved."""
    query = (name or "").strip()
    if not query:
        return None
    try:
        response = _http_get(base_url.rstrip("/") + "/search",
                             {"q": query, "format": "json", "limit": 1}, timeout_s)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return None
    if not isinstance(payload, list) or not payload:
        return None
    first = payload[0] if isinstance(payload[0], dict) else {}
    try:
        return float(first["lat"]), float(first["lon"]), str(first.get("display_name") or query)
    except (TypeError, ValueError, KeyError):
        return None


def fetch_attractions(latitude: float, longitude: float, base_url: str,
                      timeout_s: float, radius_m: int, limit: int) -> List[Dict[str, Any]]:
    """Overpass tourist POIs around a coordinate. Never raises."""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return []
    selectors = "".join(f"{sel}(around:{int(radius_m)},{lat},{lon});" for sel in _PLACE_QUERIES)
    query = f"[out:json][timeout:25];({selectors});out center {max(1, min(int(limit) * 4, 60))};"
    try:
        response = httpx.post(base_url, data={"data": query}, timeout=float(timeout_s),
                              headers={"User-Agent": _USER_AGENT})
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []
    elements = payload.get("elements") if isinstance(payload, dict) else None
    if not isinstance(elements, list):
        return []
    places = []
    for element in elements:
        if not isinstance(element, dict):
            continue
        tags = element.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if not name:
            continue
        center = element.get("center") or {}
        plat = element.get("lat", center.get("lat"))
        plon = element.get("lon", center.get("lon"))
        try:
            plat, plon = float(plat), float(plon)
        except (TypeError, ValueError):
            continue
        kind = (tags.get("tourism") or tags.get("historic")
                or tags.get("leisure") or tags.get("amenity") or "attraction")
        places.append({"name": name, "latitude": plat, "longitude": plon, "kind": str(kind)})
    places.sort(key=lambda p: p["name"].lower())
    return places[: max(0, int(limit))]


def fetch_place_images(latitude: float, longitude: float, base_url: str,
                       timeout_s: float, radius_m: int, limit: int) -> List[str]:
    """Commons geotagged thumbnails near a coordinate. Never raises."""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return []
    try:
        response = _http_get(base_url, {
            "action": "query", "generator": "geosearch", "ggscoord": f"{lat}|{lon}",
            "ggsradius": int(radius_m), "ggsnamespace": 6,
            "ggslimit": max(1, min(int(limit), 50)),
            "prop": "imageinfo", "iiprop": "url|size", "iiurlwidth": 800, "format": "json",
        }, timeout_s)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []
    pages = ((payload.get("query") or {}).get("pages") or {}).values() if isinstance(payload, dict) else []
    urls = []
    for page in pages:
        if not isinstance(page, dict):
            continue
        for entry in page.get("imageinfo") or []:
            url = (entry or {}).get("thumburl") or (entry or {}).get("url")
            if isinstance(url, str) and url.startswith(_COMMONS_FILE_DOMAIN):
                urls.append(url)
    urls.sort()
    return urls[: max(0, int(limit))]


def get_live_places(destination: str, latitude: Any, longitude: Any, limit: int,
                    nominatim_url: str, overpass_url: str, commons_url: str,
                    timeout_s: float, radius_m: int) -> Dict[str, Any]:
    """Full pipeline for one destination. Never raises; empty places on failure."""
    lat, lng = None, None
    try:
        if latitude is not None and longitude is not None:
            lat, lng = float(latitude), float(longitude)
    except (TypeError, ValueError):
        lat, lng = None, None
    display = (destination or "").strip()
    if (lat is None or lng is None) and display:
        geocoded = geocode_place(display, nominatim_url, timeout_s)
        if geocoded:
            lat, lng, display = geocoded
    if lat is None or lng is None:
        return {"destination": display, "latitude": None, "longitude": None,
                "places": [], "source": "none"}
    attractions = fetch_attractions(lat, lng, overpass_url, timeout_s, radius_m, limit)
    images = fetch_place_images(lat, lng, commons_url, timeout_s, radius_m, max(10, limit)) if attractions else []
    places = []
    for index, place in enumerate(attractions):
        image = images[index % len(images)] if images else None
        places.append({**place, "image_url": image})
    return {"destination": display, "latitude": lat, "longitude": lng,
            "places": places, "source": "overpass+commons"}
