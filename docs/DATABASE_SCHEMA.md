# TourFlow AI - Database Schema

All tables are modeled in SQLAlchemy with PostgreSQL dialect support and Alembic versioning.

## Tables (15 Models)

1. **`users`**: System travelers, operators, and administrators.
2. **`traveler_profiles`**: Style, dietary constraints, fitness tier, language.
3. **`destinations`**: Geo-locations (Manali, Goa, Kerala, Rajasthan, Kashmir).
4. **`vendors`**: Verified hospitality, activity, and mobility operators.
5. **`hotels`**: Accommodations with amenities, ratings, photos, and rates.
6. **`activities`**: Curated excursions with duration, difficulty, and meeting points.
7. **`transport_options`**: Vehicles, routes, passenger capacities, and features.
8. **`trips`** (*Central Entity*): Orchestrates all trip planning, statuses, and linked objects.
9. **`trip_preferences`**: Specific constraints, companion types, and budget preferences for each trip.
10. **`itinerary_items`**: Ordered schedule events mapped to hotels, activities, or transfers.
11. **`bookings`**: Vendor reservation references, financial amounts, and payment statuses.
12. **`notifications`**: Contextual traveler alerts and system messages.
13. **`alerts`**: Real-time environmental or logistical disruption warnings.
14. **`change_history`**: Audit trail of AI and traveler modifications.
15. **`reviews`**: Post-trip ratings for destination and AI planning intelligence.
