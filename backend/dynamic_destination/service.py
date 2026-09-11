"""Validate researched destinations before hydrating catalog records."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.models.models import Activity, Destination, Hotel, TransportOption


class DynamicDestinationDiscoveryError(Exception):
    """Raised when researched destination inventory cannot be verified."""


class DynamicDestinationDiscoveryService:
    """Convert sourced research candidates into verified catalog inventory."""

    def __init__(self, db: Session, research_client: Any):
        self.db = db
        self.research_client = research_client

    def discover_and_persist(self, trip_in: Any, destination_name: str, discovery_session_id: str) -> Destination:
        payload = self.research_client.discover_destination_inventory(
            {
                "destination": destination_name,
                "duration_days": int(trip_in.duration_days or 4),
                "budget": float(trip_in.total_budget or 50000.0),
                "currency": (trip_in.currency or "INR").upper(),
                "traveler_count": int(trip_in.traveler_count or 2),
                "pace": trip_in.pace or "balanced",
                "preferences": trip_in.preferences.model_dump() if trip_in.preferences else {},
                "discovery_session_id": discovery_session_id,
            }
        )
        destination_data = self._destination(payload, destination_name)
        activities = self._entities(payload, "activities")
        hotels = self._entities(payload, "hotels")
        transports = self._entities(payload, "transport_options")

        required_activity_count = max(1, int(trip_in.duration_days or 4) - 1)
        if len(activities) < required_activity_count:
            raise DynamicDestinationDiscoveryError(
                f"Research returned {len(activities)} verified activities; {required_activity_count} are required"
            )
        if not hotels:
            raise DynamicDestinationDiscoveryError("Research returned no verified hotels")
        if not transports:
            raise DynamicDestinationDiscoveryError("Research returned no verified transport options")
        for hotel in hotels:
            hotel["price_per_night"] = self._required_money(hotel, "price_per_night", hotel["name"])
        for activity in activities:
            activity["price_per_person"] = self._optional_money(activity, "price_per_person", activity["name"])
        for transport in transports:
            transport["price"] = self._optional_money(transport, "price", transport["name"])

        currency = (trip_in.currency or "INR").upper()
        dest_slug = f"{self._slug(destination_data['name'])}-{discovery_session_id[:8]}"
        destination = self.db.query(Destination).filter(
            Destination.slug == dest_slug,
            Destination.discovery_session_id == discovery_session_id,
        ).first()
        evidence = self._evidence(destination_data)
        if not destination:
            destination = Destination(
                id=self._stable_id("dyn-dest", discovery_session_id, destination_data["name"]),
                name=destination_data["name"],
                slug=dest_slug,
                country=destination_data.get("country") or "India",
                state_region=destination_data.get("state_region") or destination_data["name"],
                description=destination_data.get("description") or f"Verified travel catalog for {destination_data['name']}.",
                best_time_to_visit=destination_data.get("best_time_to_visit"),
                tags=["dynamic", "researched", *self._list(destination_data.get("regions"))],
                latitude=destination_data["latitude"],
                longitude=destination_data["longitude"],
                source_url=evidence[0]["url"],
                evidence=evidence,
                inventory_source="discovered",
                verification_status="verified_candidate",
                discovery_session_id=discovery_session_id,
                is_featured=False,
            )
            self.db.add(destination)
            self.db.flush()

        for hotel in hotels:
            self._upsert_hotel(destination, hotel, currency, discovery_session_id)
        for activity in activities:
            self._upsert_activity(destination, activity, currency, discovery_session_id)
        for transport in transports:
            self._upsert_transport(destination, transport, currency, discovery_session_id)

        self.db.commit()
        self.db.refresh(destination)
        return destination

    def _upsert_hotel(self, destination: Destination, data: Dict[str, Any], currency: str, discovery_session_id: str) -> None:
        stable_id = self._stable_id("dyn-hotel", discovery_session_id, data["name"])
        if self.db.query(Hotel).filter(Hotel.id == stable_id).first():
            return
        self.db.add(Hotel(
            id=stable_id,
            destination_id=destination.id,
            name=data["name"],
            category=data.get("category") or "mid-range",
            price_per_night=float(data["price_per_night"]),
            currency=data.get("currency") or currency,
            rating=float(data.get("rating") or 4.2),
            address=data.get("address") or data["name"],
            amenities=self._list(data.get("amenities")),
            images=[],
            description=data.get("description"),
            latitude=data["latitude"],
            longitude=data["longitude"],
            source_url=data["evidence"][0]["url"],
            evidence=data["evidence"],
            inventory_source="discovered",
            verification_status="verified_candidate",
            discovery_session_id=discovery_session_id,
            is_active=True,
        ))

    def _upsert_activity(self, destination: Destination, data: Dict[str, Any], currency: str, discovery_session_id: str) -> None:
        stable_id = self._stable_id("dyn-act", discovery_session_id, data["name"])
        if self.db.query(Activity).filter(Activity.id == stable_id).first():
            return
        self.db.add(Activity(
            id=stable_id,
            destination_id=destination.id,
            title=data["name"],
            category=data.get("category") or "culture",
            duration_hours=float(data.get("duration_hours") or 2.0),
            price_per_person=float(data.get("price_per_person") or 0.0),
            currency=data.get("currency") or currency,
            difficulty_level=data.get("difficulty_level") or "easy",
            rating=float(data.get("rating") or 4.4),
            images=[],
            description=data.get("description"),
            meeting_point=data.get("area") or data["name"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            source_url=data["evidence"][0]["url"],
            evidence=data["evidence"],
            inventory_source="discovered",
            verification_status="verified_candidate",
            discovery_session_id=discovery_session_id,
            is_active=True,
        ))

    def _upsert_transport(self, destination: Destination, data: Dict[str, Any], currency: str, discovery_session_id: str) -> None:
        stable_id = self._stable_id("dyn-trn", discovery_session_id, data["name"])
        if self.db.query(TransportOption).filter(TransportOption.id == stable_id).first():
            return
        self.db.add(TransportOption(
            id=stable_id,
            destination_id=destination.id,
            type=data.get("type") or "private_cab",
            name=data["name"],
            route_from=data.get("route_from") or "Traveler origin",
            route_to=data.get("route_to") or destination.name,
            duration_hours=float(data.get("duration_hours") or 4.0),
            price=float(data.get("price") or 0.0),
            currency=data.get("currency") or currency,
            capacity=max(1, int(data.get("capacity") or 4)),
            features=self._list(data.get("features")),
            latitude=data["latitude"],
            longitude=data["longitude"],
            source_url=data["evidence"][0]["url"],
            evidence=data["evidence"],
            inventory_source="discovered",
            verification_status="verified_candidate",
            discovery_session_id=discovery_session_id,
            is_active=True,
        ))

    def _destination(self, payload: Dict[str, Any], requested_name: str) -> Dict[str, Any]:
        raw = payload.get("destination") if isinstance(payload.get("destination"), dict) else payload
        data = dict(raw or {})
        data["name"] = (data.get("name") or requested_name).strip()
        data["latitude"] = self._coordinate(data, "latitude", "destination")
        data["longitude"] = self._coordinate(data, "longitude", "destination")
        data["evidence"] = self._evidence(data)
        return data

    def _entities(self, payload: Dict[str, Any], key: str) -> List[Dict[str, Any]]:
        verified = []
        for raw in self._list(payload.get(key)):
            data = dict(raw or {})
            data["name"] = str(data.get("name") or data.get("title") or "").strip()
            if not data["name"]:
                raise DynamicDestinationDiscoveryError(f"{key} contains an unnamed candidate")
            data["latitude"] = self._coordinate(data, "latitude", data["name"])
            data["longitude"] = self._coordinate(data, "longitude", data["name"])
            data["evidence"] = self._evidence(data)
            verified.append(data)
        return verified

    def _evidence(self, data: Dict[str, Any]) -> List[Dict[str, str]]:
        entries = self._list(data.get("evidence"))
        normalized = []
        for item in entries:
            if not isinstance(item, dict):
                continue
            url = item.get("url")
            supports = {str(s).casefold() for s in self._list(item.get("supports"))}
            if (
                isinstance(url, str)
                and re.match(r"^https?://", url.strip())
                and {"existence", "coordinates"}.issubset(supports)
            ):
                normalized.append({
                    "url": url.strip(),
                    "label": str(item.get("label") or item.get("title") or "source"),
                    "supports": sorted(supports),
                    "verified_at": datetime.utcnow().isoformat(),
                })
        if not normalized:
            raise DynamicDestinationDiscoveryError(
                "Research candidate evidence must cite existence and coordinates; a source URL alone is insufficient"
            )
        return normalized[:5]

    def _coordinate(self, data: Dict[str, Any], key: str, name: str) -> float:
        value = data.get(key)
        if value is None and isinstance(data.get("coordinates"), dict):
            value = data["coordinates"].get("lat" if key == "latitude" else "lng")
        try:
            coord = float(value)
        except (TypeError, ValueError) as exc:
            raise DynamicDestinationDiscoveryError(f"{name} is missing valid {key}") from exc
        if key == "latitude" and not -90 <= coord <= 90:
            raise DynamicDestinationDiscoveryError(f"{name} has invalid latitude")
        if key == "longitude" and not -180 <= coord <= 180:
            raise DynamicDestinationDiscoveryError(f"{name} has invalid longitude")
        return coord

    def _required_money(self, data: Dict[str, Any], key: str, name: str) -> float:
        amount = self._optional_money(data, key, name)
        if amount <= 0:
            raise DynamicDestinationDiscoveryError(f"{name} is missing verified {key}")
        return amount

    def _optional_money(self, data: Dict[str, Any], key: str, name: str) -> float:
        try:
            amount = float(data.get(key) or 0.0)
        except (TypeError, ValueError) as exc:
            raise DynamicDestinationDiscoveryError(f"{name} has invalid {key}") from exc
        if amount < 0:
            raise DynamicDestinationDiscoveryError(f"{name} has invalid {key}")
        return amount

    @staticmethod
    def _list(value: Any) -> List[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    @staticmethod
    def _slug(value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return slug or "destination"

    @staticmethod
    def _stable_id(prefix: str, *parts: str) -> str:
        digest = hashlib.sha1("|".join(parts).lower().encode("utf-8")).hexdigest()[:12]
        return f"{prefix}-{digest}"
