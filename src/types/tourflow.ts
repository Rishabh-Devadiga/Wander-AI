export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'traveler' | 'operator' | 'admin';
  is_active: boolean;
  created_at: string;
  traveler_profile?: TravelerProfile;
}

export interface TravelerProfile {
  id: string;
  user_id: string;
  travel_style: string;
  dietary_preferences: string[];
  fitness_level: string;
  preferred_currency: string;
  language: string;
  bio?: string;
  created_at: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  state_region: string;
  description: string;
  hero_image_url?: string;
  gallery_images?: string[];
  best_time_to_visit?: string;
  tags: string[];
  is_featured: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Hotel {
  id: string;
  destination_id: string;
  vendor_id?: string;
  name: string;
  category: 'luxury' | 'boutique' | 'mid-range' | 'budget' | 'homestay';
  price_per_night: number;
  currency: string;
  rating: number;
  address?: string;
  amenities: string[];
  images: string[];
  description?: string;
  is_active: boolean;
}

export interface Activity {
  id: string;
  destination_id: string;
  vendor_id?: string;
  title: string;
  category: 'adventure' | 'culture' | 'nature' | 'culinary' | 'relaxation';
  duration_hours: number;
  price_per_person: number;
  currency: string;
  difficulty_level: 'easy' | 'moderate' | 'challenging';
  rating: number;
  images: string[];
  description?: string;
  meeting_point?: string;
  is_active: boolean;
}

export interface TransportOption {
  id: string;
  destination_id: string;
  vendor_id?: string;
  type: 'private_cab' | 'volvo_bus' | 'flight' | 'train' | 'self_drive' | 'boat';
  name: string;
  route_from: string;
  route_to: string;
  duration_hours: number;
  price: number;
  currency: string;
  capacity: number;
  features: string[];
  is_active: boolean;
}

export interface TripPreference {
  id: string;
  trip_id: string;
  budget_tier: 'budget' | 'moderate' | 'luxury' | 'ultra_luxury';
  interests: string[];
  travel_companions: 'solo' | 'couple' | 'family' | 'friends';
  accommodation_types: string[];
  transport_preferences: string[];
  dietary_requirements: string[];
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

export interface TransportAggregatorLink {
  title: string;
  url: string;
  logo_icon?: string;
  type: 'google_flights' | 'skyscanner' | 'irctc' | 'indigo' | 'airindia' | 'redbus' | 'makemytrip' | 'official';
  description?: string;
}

export interface TransportBookingOption {
  id: string;
  mode: 'flight' | 'train' | 'bus' | 'road' | 'cab';
  title: string;
  operator: string;
  route_summary: string;
  origin_city: string;
  destination_city: string;
  transit_hub: string; // e.g. "Bagdogra Airport (IXB)" or "New Jalpaiguri (NJP)"
  origin_coords?: [number, number];
  transit_coords?: [number, number];
  dest_coords?: [number, number];
  distance_km?: number;
  driving_distance_km?: number;
  departure_time: string; // e.g. "08:20 AM"
  arrival_time: string; // e.g. "10:55 AM"
  duration_str: string; // e.g. "2h 35m"
  price_per_person: number;
  total_price: number;
  badge: 'recommended' | 'cheapest' | 'fastest' | 'alternative';
  verification_status: 'verified' | 'estimated';
  verification_label: string; // "Verified Daily Schedule" or "Sample option — verify before booking"
  live_fare_source?: string; // e.g. "Live Skyscanner & Amadeus Grounded API"
  carbon_emissions_kg?: number;
  booking_url: string;
  aggregator_links?: TransportAggregatorLink[];
  rationale: string;
  dependent_transfer: {
    title: string;
    duration_str: string;
    cost: number;
    arrival_at_destination: string;
    description: string;
  };
}

export interface AccommodationOption {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  category: 'luxury' | 'boutique' | 'mid-range' | 'budget' | 'homestay';
  location: string;
  room_type: string;
  price_per_night: number;
  total_price: number;
  nights: number;
  amenities: string[];
  why_it_matches: string;
  hero_image: string;
  images?: string[];
  badge: 'best_match' | 'cheapest' | 'best_rated' | 'luxury';
  booking_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface DayAccommodation {
  day_number: number;
  date?: string;
  formatted_date?: string;
  hotel: AccommodationOption;
  alternatives?: AccommodationOption[];
  is_customized?: boolean;
}

export interface CostBreakdown {
  transport: number;
  accommodation: number;
  activities: number;
  food_and_other: number;
  total: number;
  target_budget: number;
  remaining_budget: number;
  is_under_budget: boolean;
}

export interface StructuredTripIntent {
  destination?: string | null;
  origin?: string | null;
  travelers?: number | null;
  travel_type?: 'solo' | 'couple' | 'family' | 'friends' | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  duration_days?: number | null;
  budget?: number | null;
  currency?: string | null;
  interests?: string[];
  travel_style?: string | null;
  accommodation_preference?: string | null;
  transport_preference?: string | null;
}

export interface PossibleOptionItem {
  id: string;
  title: string;
  category: 'sightseeing' | 'adventure' | 'heritage' | 'leisure' | 'culinary' | 'scenic';
  location: string;
  duration: string;
  cost: number;
  description: string;
  image_url: string;
  tags?: string[];
  walking_intensity?: 'none' | 'light' | 'moderate' | 'high';
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  order_index: number;
  item_type: 'hotel' | 'activity' | 'transport' | 'meal' | 'note' | 'leisure';
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost: number;
  status: 'proposed' | 'confirmed' | 'completed' | 'skipped';
  is_disabled?: boolean;
  rest_buffer_minutes?: number;
  walking_intensity?: 'none' | 'light' | 'moderate' | 'high';
  image_url?: string;
  gallery?: string[];
  hotel_id?: string;
  activity_id?: string;
  transport_id?: string;
  location?: string;
  meta_data?: Record<string, any>;
}

export interface Booking {
  id: string;
  trip_id: string;
  vendor_id?: string;
  booking_reference: string;
  item_type: string;
  item_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'refunded';
  booking_date: string;
}

export interface Notification {
  id: string;
  trip_id?: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'update';
  is_read: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  trip_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ChangeHistory {
  id: string;
  trip_id: string;
  changed_by: 'user' | 'ai' | 'operator';
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  timestamp: string;
}

export interface Review {
  id: string;
  trip_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  destination_rating?: number;
  ai_planning_rating?: number;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination_id?: string;
  title: string;
  status: 'draft' | 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  origin?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  is_dates_confirmed?: boolean;
  duration_days: number;
  total_budget: number;
  total_cost?: number;
  currency: string;
  traveler_count: number;
  travel_type?: 'solo' | 'couple' | 'family' | 'friends';
  pace: 'relaxed' | 'balanced' | 'packed';
  created_at: string;
  updated_at: string;
  destination?: Destination;
  preferences?: TripPreference;
  selected_transport?: TransportBookingOption;
  transport_alternatives?: TransportBookingOption[];
  selected_accommodation?: AccommodationOption;
  accommodation_alternatives?: AccommodationOption[];
  daily_accommodations?: DayAccommodation[];
  cost_breakdown?: CostBreakdown;
  itinerary: ItineraryItem[];
  bookings: Booking[];
  alerts: Alert[];
  notifications: Notification[];
  change_history: ChangeHistory[];
  reviews: Review[];
  packing_items?: Array<{ id: string; category: string; text: string; checked: boolean }>;
  expenses?: Array<{ id: string; title: string; amount: number; paidBy: string }>;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  database: string;
  counts: {
    destinations: number;
    trips: number;
  };
  ai_engine: {
    gemini_available: boolean;
    model: string;
  };
}

export interface AIChatResponse {
  response: string;
  suggestions: string[];
  extracted_preferences?: StructuredTripIntent;
  updated_trip?: Trip;
  captured_count?: number;
  dates_required?: boolean;
  checklist?: {
    where_to?: string | null;
    where_from?: string | null;
    who_is_coming?: string | null;
    when_you_go?: string | null;
    what_you_are_after?: string | null;
    travel_dates?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_dates_valid?: boolean;
  };
}
