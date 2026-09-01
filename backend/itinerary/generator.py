from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models.models import Trip, ItineraryItem, Hotel, Activity, TransportOption
from backend.ai.gemini_service import gemini_service

class ItineraryGenerator:
    """
    Synthesizes and populates structured ItineraryItems for a Trip entity.
    """
    def __init__(self, db: Session):
        self.db = db

    def generate_for_trip(self, trip_id: str) -> List[ItineraryItem]:
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return []

        # Find matching hotels, activities, transport for the destination
        activities = []
        hotel = None
        transport = None

        if trip.destination_id:
            activities = self.db.query(Activity).filter(Activity.destination_id == trip.destination_id).limit(10).all()
            hotel = self.db.query(Hotel).filter(Hotel.destination_id == trip.destination_id).first()
            transport = self.db.query(TransportOption).filter(TransportOption.destination_id == trip.destination_id).first()

        duration = trip.duration_days or 4
        new_items = []

        # Day 1: Arrival & Check-in
        item1 = ItineraryItem(
            trip_id=trip.id,
            day_number=1,
            order_index=1,
            item_type="transport",
            title=f"Scenic Arrival & Transfer ({transport.name if transport else 'Premium Private Cab'})",
            description=f"Transfer from origin/station to destination accommodations with scenic photo stops.",
            start_time="09:30 AM",
            end_time="01:00 PM",
            cost=transport.price if transport else 3500.0,
            status="confirmed",
            transport_id=transport.id if transport else None,
            location=trip.destination.name if trip.destination else "Destination"
        )
        self.db.add(item1)
        new_items.append(item1)

        if hotel:
            item2 = ItineraryItem(
                trip_id=trip.id,
                day_number=1,
                order_index=2,
                item_type="hotel",
                title=f"Resort Check-In & Welcome High Tea ({hotel.name})",
                description=f"Unpack, enjoy panoramic mountain/nature views and warm local welcome drink.",
                start_time="01:30 PM",
                end_time="03:00 PM",
                cost=hotel.price_per_night,
                status="confirmed",
                hotel_id=hotel.id,
                location=hotel.address or hotel.name
            )
            self.db.add(item2)
            new_items.append(item2)

        # Populate Day 2..N with curated activities
        act_idx = 0
        for day in range(1, duration + 1):
            if day == 1:
                # Add evening leisure walk
                if activities and len(activities) > 0:
                    act = activities[0]
                    act_idx += 1
                    item_act = ItineraryItem(
                        trip_id=trip.id,
                        day_number=1,
                        order_index=3,
                        item_type="activity",
                        title=act.title,
                        description=act.description,
                        start_time="04:30 PM",
                        end_time="07:00 PM",
                        cost=act.price_per_person * (trip.traveler_count or 2),
                        status="proposed",
                        activity_id=act.id,
                        location=act.meeting_point or trip.destination.name if trip.destination else "Local Hub"
                    )
                    self.db.add(item_act)
                    new_items.append(item_act)
            else:
                # Morning activity
                if act_idx < len(activities):
                    act_m = activities[act_idx]
                    act_idx += 1
                    item_m = ItineraryItem(
                        trip_id=trip.id,
                        day_number=day,
                        order_index=1,
                        item_type="activity",
                        title=act_m.title,
                        description=act_m.description,
                        start_time="09:00 AM",
                        end_time="01:00 PM",
                        cost=act_m.price_per_person * (trip.traveler_count or 2),
                        status="proposed",
                        activity_id=act_m.id,
                        location=act_m.meeting_point or "Valley Point"
                    )
                    self.db.add(item_m)
                    new_items.append(item_m)

                # Afternoon/Evening activity or culinary experience
                if act_idx < len(activities):
                    act_e = activities[act_idx]
                    act_idx += 1
                    item_e = ItineraryItem(
                        trip_id=trip.id,
                        day_number=day,
                        order_index=2,
                        item_type="activity",
                        title=act_e.title,
                        description=act_e.description,
                        start_time="03:00 PM",
                        end_time="06:30 PM",
                        cost=act_e.price_per_person * (trip.traveler_count or 2),
                        status="proposed",
                        activity_id=act_e.id,
                        location=act_e.meeting_point or "Scenic Point"
                    )
                    self.db.add(item_e)
                    new_items.append(item_e)
                else:
                    item_l = ItineraryItem(
                        trip_id=trip.id,
                        day_number=day,
                        order_index=2,
                        item_type="leisure",
                        title="Sunset Panorama & Local Artisan Market",
                        description="Relaxed evening exploring local bazaars, handicrafts, and signature hillside cafés.",
                        start_time="04:00 PM",
                        end_time="07:30 PM",
                        cost=0.0,
                        status="proposed",
                        location=trip.destination.name if trip.destination else "Town Center"
                    )
                    self.db.add(item_l)
                    new_items.append(item_l)

        self.db.commit()
        return new_items
