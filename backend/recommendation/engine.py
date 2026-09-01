from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models.models import Hotel, Activity, TransportOption
from backend.ai.gemini_service import gemini_service

class RecommendationEngine:
    """
    AI & Heuristic Hybrid Recommendation Engine.
    Ranks accommodations, activities, and transport according to traveler preferences.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_recommendations(self, destination_id: Optional[str], preferences: Dict[str, Any]) -> Dict[str, Any]:
        hotels_query = self.db.query(Hotel).filter(Hotel.is_active == True)
        activities_query = self.db.query(Activity).filter(Activity.is_active == True)
        transport_query = self.db.query(TransportOption).filter(TransportOption.is_active == True)

        if destination_id:
            hotels_query = hotels_query.filter(Hotel.destination_id == destination_id)
            activities_query = activities_query.filter(Activity.destination_id == destination_id)
            transport_query = transport_query.filter(TransportOption.destination_id == destination_id)

        hotels = hotels_query.order_by(Hotel.rating.desc()).limit(5).all()
        activities = activities_query.order_by(Activity.rating.desc()).limit(6).all()
        transport = transport_query.limit(4).all()

        ai_summary = gemini_service.recommend(preferences=preferences, destination_id=destination_id)

        return {
            "ai_insights": ai_summary,
            "recommended_hotels": [
                {
                    "id": h.id,
                    "name": h.name,
                    "category": h.category,
                    "price_per_night": h.price_per_night,
                    "currency": h.currency,
                    "rating": h.rating,
                    "amenities": h.amenities,
                    "images": h.images,
                    "description": h.description
                }
                for h in hotels
            ],
            "recommended_activities": [
                {
                    "id": a.id,
                    "title": a.title,
                    "category": a.category,
                    "price_per_person": a.price_per_person,
                    "currency": a.currency,
                    "duration_hours": a.duration_hours,
                    "difficulty_level": a.difficulty_level,
                    "rating": a.rating,
                    "images": a.images,
                    "description": a.description
                }
                for a in activities
            ],
            "recommended_transport": [
                {
                    "id": t.id,
                    "name": t.name,
                    "type": t.type,
                    "route_from": t.route_from,
                    "route_to": t.route_to,
                    "duration_hours": t.duration_hours,
                    "price": t.price,
                    "currency": t.currency,
                    "features": t.features
                }
                for t in transport
            ]
        }
