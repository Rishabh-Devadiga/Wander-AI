import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.connection import SessionLocal, engine, Base
from backend.models.models import (
    User, TravelerProfile, Destination, Vendor, Hotel, Activity,
    TransportOption, Trip, TripPreference, ItineraryItem, Booking,
    Notification, Alert, ChangeHistory, Review
)

logger = logging.getLogger("tourflow_seed")

def run_seed():
    """Deterministic Database Seeding for TourFlow AI Foundation."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Destination).filter(Destination.slug == "manali").first():
            logger.info("Database already seeded with foundation data.")
            return

        logger.info("Starting deterministic seed data injection...")

        # ----------------------------------------------------
        # 1. Primary Users & Traveler Profiles
        # ----------------------------------------------------
        primary_user = User(
            id="usr-alex-morgan-001",
            email="alex.morgan@tourflow.ai",
            full_name="Alex Morgan",
            phone="+91 98765 43210",
            role="traveler",
            is_active=True
        )
        db.add(primary_user)
        db.flush()

        profile = TravelerProfile(
            id="prof-alex-001",
            user_id=primary_user.id,
            travel_style="adventurous_luxury",
            dietary_preferences=["vegetarian", "artisan_coffee"],
            fitness_level="high",
            preferred_currency="INR",
            language="English",
            bio="Alpine enthusiast, outdoor photographer, and culture seeker."
        )
        db.add(profile)

        operator_user = User(
            id="usr-rahul-sharma-002",
            email="rahul.operator@tourflow.ai",
            full_name="Rahul Sharma",
            phone="+91 98111 22334",
            role="operator",
            is_active=True
        )
        db.add(operator_user)

        # ----------------------------------------------------
        # 2. Vendors
        # ----------------------------------------------------
        v_himalayan = Vendor(
            id="vnd-him-001",
            name="Himalayan Heritage Resorts & Expeditions",
            vendor_type="hotel",
            contact_email="concierge@thehimalayan.com",
            phone="+91 1902 250123",
            rating=4.9,
            is_verified=True
        )
        v_adventure = Vendor(
            id="vnd-adv-002",
            name="Pir Panjal High Altitude Adventures",
            vendor_type="activity",
            contact_email="fly@pirpanjaladventure.com",
            phone="+91 98160 55443",
            rating=4.8,
            is_verified=True
        )
        v_trans = Vendor(
            id="vnd-tra-003",
            name="North Bound Luxury Alpine Mobility",
            vendor_type="transport",
            contact_email="dispatch@northboundmobility.com",
            phone="+91 98050 11223",
            rating=4.9,
            is_verified=True
        )
        db.add_all([v_himalayan, v_adventure, v_trans])
        db.flush()

        # ----------------------------------------------------
        # 3. Destinations
        # ----------------------------------------------------
        d_manali = Destination(
            id="dest-manali-001",
            name="Manali",
            slug="manali",
            country="India",
            state_region="Himachal Pradesh",
            description="Perched at 2,050m in the majestic Kullu Valley, Manali combines snow-clad Pir Panjal peaks, aromatic pine forests, thrilling alpine passes, and vibrant bohemian café culture.",
            hero_image_url="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=80",
            best_time_to_visit="October to June (Snow: Dec-Feb)",
            tags=["mountains", "snow", "adventure", "rivers", "cafes", "trekking"],
            is_featured=True,
            latitude=32.2396,
            longitude=77.1887
        )

        d_goa = Destination(
            id="dest-goa-002",
            name="Goa",
            slug="goa",
            country="India",
            state_region="Goa",
            description="Sun-drenched tropical coastline famed for golden sand beaches, Portuguese colonial architecture, bohemian flea markets, and world-class seafood cuisine.",
            hero_image_url="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80",
            best_time_to_visit="November to March",
            tags=["beaches", "sunsets", "nightlife", "heritage", "water_sports"],
            is_featured=True,
            latitude=15.2993,
            longitude=74.1240
        )

        d_kerala = Destination(
            id="dest-kerala-003",
            name="Kerala",
            slug="kerala",
            country="India",
            state_region="Kerala",
            description="God's Own Country, featuring serene palm-fringed backwaters, emerald tea estates in Munnar, Ayurvedic rejuvenation sanctuaries, and spice-laden coastal breezes.",
            hero_image_url="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80",
            best_time_to_visit="September to March",
            tags=["backwaters", "tea_gardens", "ayurveda", "nature", "houseboats"],
            is_featured=True,
            latitude=10.8505,
            longitude=76.2711
        )

        d_rajasthan = Destination(
            id="dest-rajasthan-004",
            name="Rajasthan",
            slug="rajasthan",
            country="India",
            state_region="Rajasthan",
            description="Land of royal kings, golden Thar sand dunes, monumental hilltop fortresses, and opulent heritage palace hotels in Jaipur, Udaipur, and Jaisalmer.",
            hero_image_url="https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1400&q=80",
            best_time_to_visit="October to March",
            tags=["palaces", "desert", "forts", "royal_heritage", "culture"],
            is_featured=True,
            latitude=27.0238,
            longitude=74.2179
        )

        d_kashmir = Destination(
            id="dest-kashmir-005",
            name="Kashmir",
            slug="kashmir",
            country="India",
            state_region="Jammu & Kashmir",
            description="The Crown Jewel of the Himalayas, offering tranquil Dal Lake shikara rides, Gulmarg powder-snow skiing, and the wildflower meadows of Pahalgam.",
            hero_image_url="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=80",
            best_time_to_visit="March to October (Snow: Dec-Feb)",
            tags=["dal_lake", "snow_skiing", "valleys", "houseboats", "nature"],
            is_featured=True,
            latitude=34.0837,
            longitude=74.7973
        )

        db.add_all([d_manali, d_goa, d_kerala, d_rajasthan, d_kashmir])
        db.flush()

        # ----------------------------------------------------
        # 4. Realistic Hotels for Manali & Others
        # ----------------------------------------------------
        h_manali_1 = Hotel(
            id="htl-manali-001",
            destination_id=d_manali.id,
            vendor_id=v_himalayan.id,
            name="The Himalayan Luxury Boutique Resort & Castle",
            category="luxury",
            price_per_night=18500.0,
            currency="INR",
            rating=4.9,
            address="Hadimba Road, Manali, Himachal Pradesh 175131",
            amenities=["Victorian Castle Architecture", "Heated Swimming Pool", "Panoramic Mountain Views", "Gourmet Fine Dining", "Fireplace Lounges", "Spa"],
            images=["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"],
            description="A premier 19th-century Victorian Gothic castle stay set amongst apple and cherry orchards with dramatic views of snow peaks."
        )

        h_manali_2 = Hotel(
            id="htl-manali-002",
            destination_id=d_manali.id,
            vendor_id=v_himalayan.id,
            name="Larisa Mountain Resort & Organic Apple Orchard",
            category="boutique",
            price_per_night=12000.0,
            currency="INR",
            rating=4.8,
            address="Haripur, Manali, Himachal Pradesh 175136",
            amenities=["Private Stone Cottages", "Organic Farm-to-Table Dining", "Jacuzzi", "Bonfire Patios", "Forest Trails"],
            images=["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"],
            description="Exquisite stone and wood cottages nestled in fragrant apple orchards with bespoke butler service and starlit bonfire evenings."
        )

        h_manali_3 = Hotel(
            id="htl-manali-003",
            destination_id=d_manali.id,
            vendor_id=v_himalayan.id,
            name="Span Resort & Alpine Spa (Riverside)",
            category="luxury",
            price_per_night=16000.0,
            currency="INR",
            rating=4.7,
            address="Baragran Bihal, Manali Highway, HP 175129",
            amenities=["Direct Riverfront Access", "Helipad Access", "Ayurvedic Wellness Spa", "Fly Fishing", "Tennis Court"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"],
            description="Located directly along the banks of the rushing Beas River with private pine woods and bespoke riverside breakfast pavilions."
        )

        h_manali_4 = Hotel(
            id="htl-manali-004",
            destination_id=d_manali.id,
            vendor_id=v_himalayan.id,
            name="Zostel Plus Old Manali (Boutique Social Stay)",
            category="mid-range",
            price_per_night=3800.0,
            currency="INR",
            rating=4.6,
            address="Manu Temple Road, Old Manali 175131",
            amenities=["High-Speed Fiber WiFi", "Co-working Lounge", "Café Deck", "Mountain View Pods", "Acoustic Nights"],
            images=["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"],
            description="Vibrant design-led social stay overlooking Old Manali valley, beloved by creators, digital nomads, and young explorers."
        )

        # Goa Hotel
        h_goa_1 = Hotel(
            id="htl-goa-001",
            destination_id=d_goa.id,
            name="Taj Exotica Resort & Spa (Benaulim)",
            category="luxury",
            price_per_night=24000.0,
            currency="INR",
            rating=4.9,
            address="Calwaddo, Benaulim, Goa 403716",
            amenities=["Private Beach Front", "Golf Course", "Jiva Ayurvedic Spa", "Infinity Pool"],
            images=["https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80"],
            description="Mediterranean-style 56-acre coastal sanctuary overlooking the pristine Arabian Sea."
        )

        db.add_all([h_manali_1, h_manali_2, h_manali_3, h_manali_4, h_goa_1])
        db.flush()

        # ----------------------------------------------------
        # 5. Realistic Activities for Manali & Others
        # ----------------------------------------------------
        act_manali_1 = Activity(
            id="act-manali-001",
            destination_id=d_manali.id,
            vendor_id=v_adventure.id,
            title="Solang Valley High Altitude Paragliding & ATV Expedition",
            category="adventure",
            duration_hours=3.5,
            price_per_person=3500.0,
            currency="INR",
            difficulty_level="moderate",
            rating=4.9,
            images=["https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80"],
            description="Tandem flight over cedar canopies with certified instructors, followed by a rugged quad bike excursion along alpine streams.",
            meeting_point="Solang Adventure Base Camp"
        )

        act_manali_2 = Activity(
            id="act-manali-002",
            destination_id=d_manali.id,
            vendor_id=v_adventure.id,
            title="Rohtang Pass & Atal Tunnel Snow Glacier Tour",
            category="nature",
            duration_hours=6.0,
            price_per_person=4200.0,
            currency="INR",
            difficulty_level="moderate",
            rating=4.8,
            images=["https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80"],
            description="Journey through the engineering marvel of Atal Tunnel into Lahaul Valley and ascend to Rohtang Pass (3,978m) for pristine snow landscapes.",
            meeting_point="TourFlow Private Lounge, Manali Mall Road"
        )

        act_manali_3 = Activity(
            id="act-manali-003",
            destination_id=d_manali.id,
            vendor_id=v_adventure.id,
            title="Jogini Waterfalls & Vashisht Natural Sulphur Springs Trek",
            category="adventure",
            duration_hours=3.0,
            price_per_person=1500.0,
            currency="INR",
            difficulty_level="easy",
            rating=4.7,
            images=["https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&w=800&q=80"],
            description="Tranquil guided forest trail passing ancient apple orchards to the cascading Jogini falls, culminating in ancient hot spring baths.",
            meeting_point="Vashisht Temple Square"
        )

        act_manali_4 = Activity(
            id="act-manali-004",
            destination_id=d_manali.id,
            vendor_id=v_himalayan.id,
            title="Old Manali Bohemian Artisan Café & Woodcarving Trail",
            category="culture",
            duration_hours=2.5,
            price_per_person=1200.0,
            currency="INR",
            difficulty_level="easy",
            rating=4.8,
            images=["https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80"],
            description="Curated insider walk discovering woodcraft master studios, hidden rooftop cider cafés, and local live acoustic folklore.",
            meeting_point="Old Manali Bridge Gate"
        )

        act_manali_5 = Activity(
            id="act-manali-005",
            destination_id=d_manali.id,
            vendor_id=v_adventure.id,
            title="Beas River Grade-IV White Water Rafting & Zipline",
            category="adventure",
            duration_hours=2.5,
            price_per_person=2800.0,
            currency="INR",
            difficulty_level="challenging",
            rating=4.8,
            images=["https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=800&q=80"],
            description="Adrenaline-pumping 14km rafting course through glacier-fed rapids in the Kullu-Manali stretch with safety kayaks.",
            meeting_point="Pirdi Rafting Point"
        )

        db.add_all([act_manali_1, act_manali_2, act_manali_3, act_manali_4, act_manali_5])
        db.flush()

        # ----------------------------------------------------
        # 6. Realistic Transport Options for Manali
        # ----------------------------------------------------
        tr_manali_1 = TransportOption(
            id="trn-manali-001",
            destination_id=d_manali.id,
            vendor_id=v_trans.id,
            type="private_cab",
            name="Chauffeur-Driven Toyota Fortuner 4x4 Alpine SUV",
            route_from="Chandigarh / Bhuntar Airport",
            route_to="Manali Valley Resorts",
            duration_hours=5.5,
            price=12500.0,
            currency="INR",
            capacity=4,
            features=["Heated Leather Seats", "Alpine Snow Chains", "WiFi Hotspot", "Chilled Spring Water", "Roof Carrier"]
        )

        tr_manali_2 = TransportOption(
            id="trn-manali-002",
            destination_id=d_manali.id,
            vendor_id=v_trans.id,
            type="volvo_bus",
            name="Mercedes-Benz Multi-Axle Luxury AC Sleeper",
            route_from="Delhi Kashmere Gate ISBT",
            route_to="Manali Private Bus Terminal",
            duration_hours=12.0,
            price=1950.0,
            currency="INR",
            capacity=32,
            features=["Full Flat Sleeper Pods", "Individual Entertainment Screens", "Air Suspension", "Blankets & Water"]
        )

        tr_manali_3 = TransportOption(
            id="trn-manali-003",
            destination_id=d_manali.id,
            vendor_id=v_trans.id,
            type="self_drive",
            name="Mahindra Thar 4x4 Hardtop Adventure Rental",
            route_from="Manali Town Hub",
            route_to="Solang & Sissu Valley Exploration",
            duration_hours=24.0,
            price=5500.0,
            currency="INR",
            capacity=4,
            features=["4-Wheel Drive Low Range", "All-Terrain Tyres", "GPS Navigation", "Zero-Dep Insurance"]
        )

        db.add_all([tr_manali_1, tr_manali_2, tr_manali_3])
        db.flush()

        # ----------------------------------------------------
        # 7. Central Entity Demo: Seed Trip with Complete Sub-Entities
        # ----------------------------------------------------
        demo_trip = Trip(
            id="trp-manali-alpine-demo-001",
            user_id=primary_user.id,
            destination_id=d_manali.id,
            title="Winter Escape: Curated Manali Alpine Explorer",
            status="confirmed",
            start_date=datetime.utcnow() + timedelta(days=14),
            end_date=datetime.utcnow() + timedelta(days=18),
            duration_days=4,
            total_budget=75000.0,
            currency="INR",
            traveler_count=2,
            pace="balanced"
        )
        db.add(demo_trip)
        db.flush()

        # Preferences
        demo_pref = TripPreference(
            id="pref-manali-001",
            trip_id=demo_trip.id,
            budget_tier="luxury",
            interests=["snow", "mountains", "paragliding", "artisan_cafes", "heritage"],
            travel_companions="couple",
            accommodation_types=["boutique", "mountain_view_resort"],
            transport_preferences=["private_suv", "chauffeur"],
            dietary_requirements=["vegetarian"],
            special_requests="High floor mountain-facing room with fireplace access and private photography stops."
        )
        db.add(demo_pref)

        # Itinerary Items (Day 1 to 4)
        iti_1 = ItineraryItem(
            id="iti-001",
            trip_id=demo_trip.id,
            day_number=1,
            order_index=1,
            item_type="transport",
            title="Private Luxury Fortuner SUV Transfer from Chandigarh",
            description="Scenic mountain highway transfer with riverside tea stop at Pandoh Dam.",
            start_time="08:00 AM",
            end_time="01:30 PM",
            cost=12500.0,
            status="confirmed",
            transport_id=tr_manali_1.id,
            location="Chandigarh to Manali"
        )
        iti_2 = ItineraryItem(
            id="iti-002",
            trip_id=demo_trip.id,
            day_number=1,
            order_index=2,
            item_type="hotel",
            title="Check-in at The Himalayan Luxury Boutique Castle",
            description="Welcome Himalayan herbal tea, luggage unpacking, and mountain terrace relaxation.",
            start_time="02:00 PM",
            end_time="04:00 PM",
            cost=18500.0,
            status="confirmed",
            hotel_id=h_manali_1.id,
            location=h_manali_1.address
        )
        iti_3 = ItineraryItem(
            id="iti-003",
            trip_id=demo_trip.id,
            day_number=1,
            order_index=3,
            item_type="activity",
            title="Old Manali Bohemian Artisan Café Walk",
            description="Evening stroll exploring woodcraft workshops, local cider, and acoustic violin performance.",
            start_time="05:00 PM",
            end_time="07:30 PM",
            cost=2400.0,
            status="confirmed",
            activity_id=act_manali_4.id,
            location="Old Manali"
        )
        iti_4 = ItineraryItem(
            id="iti-004",
            trip_id=demo_trip.id,
            day_number=2,
            order_index=1,
            item_type="activity",
            title="Solang Valley High Altitude Paragliding & ATV Expedition",
            description="Morning tandem paragliding glide over snow pine trees followed by quad trail ride.",
            start_time="09:00 AM",
            end_time="01:00 PM",
            cost=7000.0,
            status="confirmed",
            activity_id=act_manali_1.id,
            location="Solang Valley"
        )
        iti_5 = ItineraryItem(
            id="iti-005",
            trip_id=demo_trip.id,
            day_number=3,
            order_index=1,
            item_type="activity",
            title="Rohtang Pass & Atal Tunnel Snow Expedition",
            description="Full day panoramic drive through Atal Tunnel to North Portal and Rohtang glaciers.",
            start_time="08:30 AM",
            end_time="03:30 PM",
            cost=8400.0,
            status="proposed",
            activity_id=act_manali_2.id,
            location="Rohtang Pass"
        )
        db.add_all([iti_1, iti_2, iti_3, iti_4, iti_5])

        # Booking
        demo_booking = Booking(
            id="bkg-001",
            trip_id=demo_trip.id,
            vendor_id=v_himalayan.id,
            booking_reference="TF-MANALI-7782",
            item_type="hotel",
            item_id=h_manali_1.id,
            amount=37000.0,
            currency="INR",
            status="confirmed",
            payment_status="paid"
        )
        db.add(demo_booking)

        # Alert
        demo_alert = Alert(
            id="alt-001",
            trip_id=demo_trip.id,
            alert_type="weather",
            severity="info",
            title="Fresh Snowfall Forecast at Rohtang Pass",
            description="Expect 8-12 inches of fresh powder snow at Rohtang Pass on Day 3. 4x4 SUV equipped with tire chains is pre-arranged.",
            is_resolved=False
        )
        db.add(demo_alert)

        # Notification
        demo_notif = Notification(
            id="notif-001",
            trip_id=demo_trip.id,
            user_id=primary_user.id,
            title="Your Alpine Itinerary is Ready",
            message="TourFlow AI has optimized your 4-day Manali winter escape with private transfers and top-rated stays.",
            type="success",
            is_read=False
        )
        db.add(demo_notif)

        # Change History
        ch_1 = ChangeHistory(
            id="chg-001",
            trip_id=demo_trip.id,
            changed_by="ai",
            action="itinerary_optimized",
            field_changed="day_2_timing",
            old_value="11:00 AM",
            new_value="09:00 AM",
            reason="Shifted paragliding to early morning for optimal alpine thermal wind conditions"
        )
        ch_2 = ChangeHistory(
            id="chg-002",
            trip_id=demo_trip.id,
            changed_by="user",
            action="room_upgrade",
            field_changed="hotel_category",
            old_value="boutique",
            new_value="luxury_castle",
            reason="Traveler upgraded to The Himalayan Victorian Castle"
        )
        db.add_all([ch_1, ch_2])

        # Review
        demo_review = Review(
            id="rev-001",
            trip_id=demo_trip.id,
            user_id=primary_user.id,
            rating=5.0,
            title="Flawless Alpine Planning Experience",
            comment="TourFlow AI dynamic recommendations and live disruption alerts made our mountain trip completely seamless.",
            destination_rating=5.0,
            ai_planning_rating=5.0
        )
        db.add(demo_review)

        db.commit()
        logger.info("Deterministic database seed completed successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
