"""Persist catalog-grounded generated and optimized trip itinerary items."""

from typing import Any, Dict, Iterable, List, Optional, Sequence, Type

from sqlalchemy.orm import Session

from backend.models.models import Activity, Hotel, ItineraryItem, TransportOption, Trip
from backend.recommendation.engine import RecommendationEngine


class ItineraryGenerator:
    """Build proposed itinerary items from deterministic catalog recommendations."""

    def __init__(self, db: Session):
        self.db = db

    def generate_for_trip(self, trip_id: str) -> List[ItineraryItem]:
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return []
        existing_items = self._trip_items(trip)
        if existing_items:
            return existing_items
        return self._persist_ranked_items(trip, [])

    def optimize_for_trip(self, trip_id: str) -> List[ItineraryItem]:
        """Replace proposed catalog selections with a budget-bounded ranked selection."""
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return []

        existing_items = self._trip_items(trip)
        replaceable = [
            item for item in existing_items
            if item.status == "proposed" and (item.hotel_id or item.transport_id or item.activity_id)
        ]
        preserved_items = [item for item in existing_items if item not in replaceable]
        for item in replaceable:
            self.db.delete(item)
        if replaceable:
            self.db.flush()

        new_items = self._persist_ranked_items(trip, preserved_items, commit=False)
        self.db.commit()
        return self._sorted_items([*preserved_items, *new_items])

    def _persist_ranked_items(
        self,
        trip: Trip,
        preserved_items: Sequence[ItineraryItem],
        *,
        commit: bool = True,
    ) -> List[ItineraryItem]:
        new_items = self._ranked_items(trip, preserved_items)
        if not new_items:
            return []
        self.db.add_all(new_items)
        if commit:
            self.db.commit()
        return new_items

    def _ranked_items(
        self,
        trip: Trip,
        preserved_items: Sequence[ItineraryItem],
    ) -> List[ItineraryItem]:
        if not trip.destination_id or not trip.destination:
            return []

        recommendations = RecommendationEngine(self.db).get_recommendations(
            trip.destination_id,
            self._preferences(trip),
        )
        hotels = self._ranked_catalog(Hotel, recommendations["recommended_hotels"], trip)
        activities = self._ranked_catalog(Activity, recommendations["recommended_activities"], trip)
        transport_options = [
            option for option in self._ranked_catalog(
                TransportOption,
                recommendations["recommended_transport"],
                trip,
            )
            if option.capacity >= self._traveler_count(trip)
        ]

        duration_days = self._duration_days(trip)
        traveler_count = self._traveler_count(trip)
        remaining_budget = self._remaining_budget(trip, preserved_items)
        preserved_hotel_ids = {item.hotel_id for item in preserved_items if item.hotel_id}
        preserved_transport_ids = {item.transport_id for item in preserved_items if item.transport_id}
        preserved_activity_ids = {item.activity_id for item in preserved_items if item.activity_id}

        hotel_nights = max(1, duration_days - 1)
        hotel = None
        if not preserved_hotel_ids:
            hotel = self._first_within_budget(
                hotels,
                lambda candidate: float(candidate.price_per_night or 0) * hotel_nights,
                remaining_budget,
            )
            if hotel:
                remaining_budget = self._subtract_budget(
                    remaining_budget,
                    float(hotel.price_per_night or 0) * hotel_nights,
                )

        transport = None
        if not preserved_transport_ids:
            transport = self._first_within_budget(
                transport_options,
                lambda candidate: float(candidate.price or 0),
                remaining_budget,
            )
            if transport:
                remaining_budget = self._subtract_budget(remaining_budget, float(transport.price or 0))

        activity_slots = max(0, self._activity_slots(duration_days, trip.pace) - len(preserved_activity_ids))
        selected_activities = []
        selected_activity_ids = set(preserved_activity_ids)
        for activity in activities:
            if len(selected_activities) >= activity_slots or activity.id in selected_activity_ids:
                continue
            cost = float(activity.price_per_person or 0) * traveler_count
            if remaining_budget is not None and cost > remaining_budget:
                continue
            selected_activities.append(activity)
            selected_activity_ids.add(activity.id)
            remaining_budget = self._subtract_budget(remaining_budget, cost)

        occupied_orders = {(item.day_number, item.order_index) for item in preserved_items}
        new_items: List[ItineraryItem] = []
        if transport:
            new_items.append(
                ItineraryItem(
                    trip_id=trip.id,
                    day_number=1,
                    order_index=self._available_order(1, 1, occupied_orders),
                    item_type="transport",
                    title=transport.name,
                    description=self._transport_description(transport),
                    start_time="09:30 AM",
                    end_time="01:00 PM",
                    cost=float(transport.price or 0),
                    status="proposed",
                    transport_id=transport.id,
                    location=transport.route_to,
                )
            )

        if hotel:
            new_items.append(
                ItineraryItem(
                    trip_id=trip.id,
                    day_number=1,
                    order_index=self._available_order(1, 2, occupied_orders),
                    item_type="hotel",
                    title=hotel.name,
                    description=hotel.description,
                    start_time="01:30 PM",
                    end_time="03:00 PM",
                    cost=float(hotel.price_per_night or 0) * hotel_nights,
                    status="proposed",
                    hotel_id=hotel.id,
                    location=hotel.address or hotel.name,
                )
            )

        for index, activity in enumerate(selected_activities):
            day_number, preferred_order, start_time = self._activity_slot(index)
            new_items.append(
                ItineraryItem(
                    trip_id=trip.id,
                    day_number=day_number,
                    order_index=self._available_order(day_number, preferred_order, occupied_orders),
                    item_type="activity",
                    title=activity.title,
                    description=activity.description,
                    start_time=start_time,
                    end_time=self._end_time(start_time, activity.duration_hours),
                    cost=float(activity.price_per_person or 0) * traveler_count,
                    status="proposed",
                    activity_id=activity.id,
                    location=activity.meeting_point or trip.destination.name,
                )
            )
        return new_items

    def _trip_items(self, trip: Trip) -> List[ItineraryItem]:
        return self._sorted_items(
            self.db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip.id).all()
        )

    @staticmethod
    def _sorted_items(items: Iterable[ItineraryItem]) -> List[ItineraryItem]:
        return sorted(items, key=lambda item: (item.day_number, item.order_index, item.id))

    @staticmethod
    def _preferences(trip: Trip) -> Dict[str, Any]:
        preferences = trip.preferences
        if not preferences:
            return {}
        return {
            "budget_tier": preferences.budget_tier,
            "interests": preferences.interests or [],
            "accommodation_types": preferences.accommodation_types or [],
            "transport_preferences": preferences.transport_preferences or [],
            "travel_companions": preferences.travel_companions,
            "dietary_requirements": preferences.dietary_requirements or [],
            "special_requests": preferences.special_requests,
        }

    def _ranked_catalog(
        self,
        model: Type[Any],
        recommendations: Sequence[Dict[str, Any]],
        trip: Trip,
    ) -> List[Any]:
        ranked_ids = [entry.get("id") for entry in recommendations if entry.get("id")]
        if not ranked_ids:
            return []
        query = self.db.query(model).filter(
            model.id.in_(ranked_ids),
            model.destination_id == trip.destination_id,
            model.is_active.is_(True),
        )
        if trip.currency:
            query = query.filter(model.currency == trip.currency)
        catalog_by_id = {item.id: item for item in query.all()}
        return [catalog_by_id[item_id] for item_id in ranked_ids if item_id in catalog_by_id]

    @staticmethod
    def _duration_days(trip: Trip) -> int:
        return max(1, int(trip.duration_days or 1))

    @staticmethod
    def _traveler_count(trip: Trip) -> int:
        return max(1, int(trip.traveler_count or 1))

    @classmethod
    def _remaining_budget(cls, trip: Trip, preserved_items: Sequence[ItineraryItem]) -> Optional[float]:
        if trip.total_budget is None:
            return None
        return float(trip.total_budget) - sum(float(item.cost or 0) for item in preserved_items)

    @staticmethod
    def _activity_slots(duration_days: int, pace: Optional[str]) -> int:
        if str(pace or "").casefold() == "relaxed":
            return duration_days
        if str(pace or "").casefold() == "packed":
            return duration_days * 2
        return 1 + max(0, duration_days - 1) * 2

    @staticmethod
    def _first_within_budget(
        candidates: Sequence[Any],
        cost: Any,
        remaining_budget: Optional[float],
    ) -> Optional[Any]:
        for candidate in candidates:
            if remaining_budget is None or cost(candidate) <= remaining_budget:
                return candidate
        return None

    @staticmethod
    def _subtract_budget(remaining_budget: Optional[float], cost: float) -> Optional[float]:
        if remaining_budget is None:
            return None
        return remaining_budget - cost

    @staticmethod
    def _available_order(day_number: int, preferred_order: int, occupied_orders: set[tuple[int, int]]) -> int:
        order = preferred_order
        while (day_number, order) in occupied_orders:
            order += 1
        occupied_orders.add((day_number, order))
        return order

    @staticmethod
    def _transport_description(transport: TransportOption) -> Optional[str]:
        if transport.route_from and transport.route_to:
            return f"{transport.route_from} to {transport.route_to}"
        return None

    @staticmethod
    def _activity_slot(index: int) -> tuple[int, int, str]:
        if index == 0:
            return 1, 3, "04:30 PM"
        day_number = 2 + (index - 1) // 2
        if index % 2:
            return day_number, 1, "09:00 AM"
        return day_number, 2, "03:00 PM"

    @staticmethod
    def _end_time(start_time: str, duration_hours: Any) -> str:
        start_hour, minute_period = start_time.split(":", maxsplit=1)
        start_minute, period = minute_period.split(" ", maxsplit=1)
        hour = int(start_hour) % 12
        minute = int(start_minute)
        if period == "PM":
            hour += 12
        duration_minutes = max(60, round(float(duration_hours or 0) * 60))
        end_minutes = (hour * 60 + minute + duration_minutes) % (24 * 60)
        end_hour, end_minute = divmod(end_minutes, 60)
        display_period = "AM" if end_hour < 12 else "PM"
        display_hour = end_hour % 12 or 12
        return f"{display_hour:02d}:{end_minute:02d} {display_period}"
