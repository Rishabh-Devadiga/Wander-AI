import { geminiService, Type } from './services/geminiService';
import { logger } from './utils/logger';

export interface OperatorVendor {
  id: string;
  name: string;
  category: 'hotel' | 'activity' | 'transport' | 'guide';
  rating: number;
  contact_name: string;
  contact_email: string;
  phone: string;
  location: string;
  is_verified: boolean;
  is_available: boolean;
  active_bookings_count: number;
  capacity_status: 'available' | 'limited' | 'suspended';
  compliance_status: 'certified' | 'pending_review' | 'flagged';
  notes?: string;
}

export interface ReplanAlternative {
  id: string;
  activity_id: string;
  title: string;
  vendor_id: string;
  vendor_name: string;
  category: string;
  duration_str: string;
  duration_hours: number;
  start_time: string;
  end_time: string;
  price_per_person: number;
  total_price: number;
  cost_difference: number; // relative to original activity
  match_score: number; // e.g. 94
  safety_rating: number; // e.g. 4.9
  weather_resilience: 'high' | 'moderate' | 'low';
  location: string;
  meeting_point: string;
  hero_image: string;
  description: string;
  ai_rationale: string;
  tags: string[];
}

export interface ImpactAnalysisResult {
  trip_id: string;
  disruption_title: string;
  severity: 'info' | 'warning' | 'critical';
  risk_score: number; // 0-100
  affected_itinerary_items: Array<{
    id: string;
    day_number: number;
    title: string;
    time: string;
    cost: number;
    status: string;
  }>;
  affected_bookings: Array<{
    id: string;
    reference: string;
    vendor_name: string;
    amount: number;
    status: string;
  }>;
  affected_travelers_count: number;
  traveler_names: string[];
  schedule_impact: {
    slot_affected: string;
    duration_affected: string;
    downstream_impact: string;
  };
  transport_dependencies: {
    has_transit_dependency: boolean;
    details: string;
  };
  cost_impact: {
    affected_amount: number;
    refundable: boolean;
    budget_variance_risk: string;
  };
  preference_impact: {
    category: string;
    impact_level: 'low' | 'medium' | 'high';
    notes: string;
  };
  recommended_action: string;
}

// Initial Vendors Database
export const initialVendors: OperatorVendor[] = [
  {
    id: 'vnd-sky-002',
    name: 'Himalayan Sky Adventures & Paragliding Club',
    category: 'activity',
    rating: 4.8,
    contact_name: 'Captain Vikram Negi',
    contact_email: 'ops@himalayansky.in',
    phone: '+91 98160 33410',
    location: 'Solang Valley Launchpad, Manali',
    is_verified: true,
    is_available: false, // temporarily grounded
    active_bookings_count: 3,
    capacity_status: 'suspended',
    compliance_status: 'certified',
    notes: 'Grounding in effect: Wind speeds exceeding 35 km/h limit.',
  },
  {
    id: 'vnd-rap-003',
    name: 'Himalayan Rapids & White Water Kayak Co.',
    category: 'activity',
    rating: 4.9,
    contact_name: 'Suresh Thakur (Chief Guide)',
    contact_email: 'bookings@himalayanrapids.com',
    phone: '+91 98165 44219',
    location: 'Beas River Base, Raison / Kullu Valley',
    is_verified: true,
    is_available: true,
    active_bookings_count: 6,
    capacity_status: 'available',
    compliance_status: 'certified',
    notes: 'Grade 3+ river section active. Fully sheltered valley route.',
  },
  {
    id: 'vnd-atv-004',
    name: 'High Altitude ATV & Quad Motors Solang',
    category: 'activity',
    rating: 4.7,
    contact_name: 'Rajesh Sharma',
    contact_email: 'rentals@manaliatv.in',
    phone: '+91 98055 77123',
    location: 'Solang Meadow Forest Circuit, Manali',
    is_verified: true,
    is_available: true,
    active_bookings_count: 4,
    capacity_status: 'available',
    compliance_status: 'certified',
    notes: '8 Polaris 570cc 4x4 quads fueled and ready.',
  },
  {
    id: 'vnd-trk-005',
    name: 'Pir Panjal Mountain & Waterfall Guides',
    category: 'guide',
    rating: 4.9,
    contact_name: 'Tenzing Bodh',
    contact_email: 'trek@pirpanjal.org',
    phone: '+91 98162 88914',
    location: 'Old Manali Clubhouse Road',
    is_verified: true,
    is_available: true,
    active_bookings_count: 5,
    capacity_status: 'available',
    compliance_status: 'certified',
    notes: 'IMF certified alpine guides with emergency satellite radios.',
  },
  {
    id: 'vnd-him-001',
    name: 'The Himalayan Luxury Castle Resort & Spa',
    category: 'hotel',
    rating: 4.9,
    contact_name: 'Aditi Roy (Guest Relations)',
    contact_email: 'reservations@thehimalayan.com',
    phone: '+91 1902 250123',
    location: 'Hadimba Temple Road, Manali',
    is_verified: true,
    is_available: true,
    active_bookings_count: 8,
    capacity_status: 'available',
    compliance_status: 'certified',
    notes: '12 Premier Victorian Chambers allotted to Himalayan Trails.',
  },
  {
    id: 'vnd-cab-006',
    name: 'North India Chauffeur & 4x4 Mountain Fleet',
    category: 'transport',
    rating: 4.9,
    contact_name: 'Gurpreet Singh',
    contact_email: 'fleet@northindiacabs.com',
    phone: '+91 98720 11990',
    location: 'Chandigarh & Manali Transit Hubs',
    is_verified: true,
    is_available: true,
    active_bookings_count: 14,
    capacity_status: 'available',
    compliance_status: 'certified',
    notes: 'Toyota Fortuner 4x4 and Innova Crysta mountain-certified drivers.',
  },
  {
    id: 'vnd-taj-007',
    name: 'Taj Exotica Resort & Spa Goa',
    category: 'hotel',
    rating: 4.9,
    contact_name: 'Mark Fernandes',
    contact_email: 'concierge.goa@tajhotels.com',
    phone: '+91 832 6683333',
    location: 'Benaulim Beach, South Goa',
    is_verified: true,
    is_available: true,
    active_bookings_count: 3,
    capacity_status: 'available',
    compliance_status: 'certified',
  },
  {
    id: 'vnd-kum-008',
    name: 'Kumarakom Lake Resort & Heritage Houseboats',
    category: 'hotel',
    rating: 4.8,
    contact_name: 'Kavitha Nair',
    contact_email: 'reservations@kumarakomlakeresort.in',
    phone: '+91 481 2524900',
    location: 'Kumarakom, Kottayam, Kerala',
    is_verified: true,
    is_available: true,
    active_bookings_count: 5,
    capacity_status: 'available',
    compliance_status: 'certified',
  },
];

// Available Valid Inventory Candidates for Manali Replan
export const manaliReplanCandidates: ReplanAlternative[] = [
  {
    id: 'alt-kayak-001',
    activity_id: 'act-manali-kayak-01',
    title: 'White Water Alpine Kayaking & River Rafting',
    vendor_id: 'vnd-rap-003',
    vendor_name: 'Himalayan Rapids & White Water Kayak Co.',
    category: 'Adventure & Water Sports',
    duration_str: '2.5 Hours',
    duration_hours: 2.5,
    start_time: '03:00 PM',
    end_time: '05:30 PM',
    price_per_person: 2000,
    total_price: 8000,
    cost_difference: -6000, // Saves ₹6,000 vs Paragliding (₹14,000)
    match_score: 94,
    safety_rating: 4.9,
    weather_resilience: 'high',
    location: 'Beas River Rafting Base, Raison',
    meeting_point: 'Raison Basecamp (18 min private transfer from Solang)',
    hero_image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=80',
    description: 'Thrilling Class III+ white water rapids run on the scenic Beas River with certified river marshals, imported wet suits, rescue kayaks, and GoPro action video footage included.',
    ai_rationale: 'Maintains high-adrenaline adventure interest of the 4 travelers while operating safely inside the sheltered river valley basin completely unaffected by alpine launchpad wind shear. Verified immediate slot availability and saves ₹6,000 on trip budget.',
    tags: ['adrenaline', 'water-sports', 'adventure', 'scenic', 'wind-safe'],
  },
  {
    id: 'alt-atv-002',
    activity_id: 'act-manali-atv-02',
    title: 'Solang Quad ATV Extreme All-Terrain Expedition',
    vendor_id: 'vnd-atv-004',
    vendor_name: 'High Altitude ATV & Quad Motors Solang',
    category: 'Adventure & Motor Sports',
    duration_str: '2.0 Hours',
    duration_hours: 2.0,
    start_time: '03:15 PM',
    end_time: '05:15 PM',
    price_per_person: 2250,
    total_price: 9000,
    cost_difference: -5000,
    match_score: 90,
    safety_rating: 4.7,
    weather_resilience: 'high',
    location: 'Solang Meadow Forest Circuit',
    meeting_point: 'Solang Adventure Hub Parking',
    hero_image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    description: 'Guided 12-kilometer off-road 4x4 quad bike tour conquering pine forest trails, mountain riverbeds, and mud splashes with safety helmets and protective armor.',
    ai_rationale: 'Direct ground-level alternative situated at the very same Solang Valley location, requiring zero additional travel time. Delivers robust active adrenaline matching the group profile.',
    tags: ['motorsports', 'quad-bike', 'off-road', 'adventure', 'zero-transit'],
  },
  {
    id: 'alt-trek-003',
    activity_id: 'act-manali-trek-03',
    title: 'Jogini Waterfall Alpine Nature Trek & Apple Orchard Walk',
    vendor_id: 'vnd-trk-005',
    vendor_name: 'Pir Panjal Mountain & Waterfall Guides',
    category: 'Nature & Soft Adventure',
    duration_str: '3.0 Hours',
    duration_hours: 3.0,
    start_time: '02:45 PM',
    end_time: '05:45 PM',
    price_per_person: 1250,
    total_price: 5000,
    cost_difference: -9000,
    match_score: 83,
    safety_rating: 4.9,
    weather_resilience: 'high',
    location: 'Vashisht Pine Valley & Jogini Falls',
    meeting_point: 'Vashisht Temple Square Entrance',
    hero_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Pine-shaded tranquil trail leading to the thundering Jogini waterfalls, traversing organic apple orchards, traditional wooden Himachali hamlets, and fresh mountain stream crossings.',
    ai_rationale: 'Scenic, weather-shielded woodland trail ideal if travelers prefer a nature walk with local guide interpretation and hot spiced tea at the waterfall cascade.',
    tags: ['nature', 'waterfalls', 'hiking', 'culture', 'tranquil'],
  },
];

// Perform Gemini AI Ranking on Candidates
export async function rankAlternativesWithGemini(
  trip: any,
  disruptionContext: { title: string; description: string },
  candidates: ReplanAlternative[]
): Promise<ReplanAlternative[]> {
  if (!candidates || candidates.length === 0) return [];
  if (!geminiService.isAvailable()) {
    return candidates;
  }

  try {
    const prompt = `You are the lead AI Tour Operations Specialist for Himalayan Trails.
A high-priority operational disruption occurred:
- Disruption: "${disruptionContext.title}" - ${disruptionContext.description}
- Trip: "${trip.title}" (${trip.traveler_count} travelers, ${trip.travel_type || 'friends/group'}, budget ₹${trip.total_budget?.toLocaleString()})
- Interests: ${JSON.stringify(trip.preferences?.interests || ['adventure', 'nature', 'mountains'])}

Here are 3 verified inventory candidates in the local area that are available:
${JSON.stringify(candidates, null, 2)}

TASK:
1. Rank these 3 alternatives (1st, 2nd, 3rd) based on safety in high wind, traveler profile alignment, weather resilience, and zero operational friction.
2. Provide a sharp, concise 2-sentence operator justification for why the candidate is ranked as such.
3. Return a match_score between 50 and 99.`;

    const rankingSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          match_score: { type: Type.INTEGER },
          ai_rationale: { type: Type.STRING },
        },
        required: ['id', 'match_score', 'ai_rationale'],
      },
    };

    const parsed = await geminiService.generateStructured<Array<{ id: string; match_score: number; ai_rationale: string }>>(
      prompt,
      rankingSchema,
      {
        systemInstruction: 'You are TourFlow AI operational resilience officer. Evaluate disruption recovery alternatives and return structured ranking JSON.',
      }
    );

    if (Array.isArray(parsed) && parsed.length > 0) {
      return candidates
        .map((c) => {
          const matched = parsed.find((p) => p.id === c.id);
          if (matched) {
            return {
              ...c,
              match_score: matched.match_score || c.match_score,
              ai_rationale: matched.ai_rationale || c.ai_rationale,
            };
          }
          return c;
        })
        .sort((a, b) => b.match_score - a.match_score);
    }
  } catch (err: any) {
    logger.warn('Gemini ranking fallback to heuristic engine', { module: 'operatorEngine' }, err);
  }

  return candidates;
}

// Compute Impact Analysis
export function computeImpactAnalysis(trip: any, disruption: { title: string; description: string }): ImpactAnalysisResult {
  const travelersCount = trip.traveler_count || 4;
  const travelerNames = trip.passengers?.map((p: any) => p.name) || [
    'Rohan Sharma', 'Ananya Sharma', 'Aarav Sharma', 'Meera Sharma'
  ];

  // Find Day 3 paragliding or affected item
  const paraglidingItem = trip.itinerary?.find((i: any) => 
    i.title?.toLowerCase().includes('paragliding') || (i.day_number === 3 && i.cost > 5000)
  ) || {
    id: 'iti-day3-para',
    day_number: 3,
    title: 'Solang Valley High Altitude Tandem Paragliding',
    time: '03:00 PM – 05:30 PM',
    cost: 14000,
    status: 'cancelled',
  };

  const bookingAffected = trip.bookings?.find((b: any) => 
    b.item_type === 'activity' && (b.amount === 14000 || b.booking_reference?.includes('ACT-8842') || b.booking_reference?.includes('ACT'))
  ) || {
    id: 'bkg-1024-act2',
    reference: 'TF-ACT-8842',
    vendor_name: 'Himalayan Sky Adventures & Paragliding Club',
    amount: 14000,
    status: 'pending_cancellation',
  };

  return {
    trip_id: trip.id,
    disruption_title: disruption.title || 'Alpine Wind Shear & Weather Grounding at Solang Valley',
    severity: 'critical',
    risk_score: 88,
    affected_itinerary_items: [
      {
        id: paraglidingItem.id || 'iti-day3-para',
        day_number: paraglidingItem.day_number || 3,
        title: paraglidingItem.title || 'Solang Valley High Altitude Tandem Paragliding',
        time: paraglidingItem.start_time ? `${paraglidingItem.start_time} – ${paraglidingItem.end_time || '05:30 PM'}` : '03:00 PM – 05:30 PM',
        cost: paraglidingItem.cost || 14000,
        status: 'cancelled',
      },
    ],
    affected_bookings: [
      {
        id: bookingAffected.id,
        reference: bookingAffected.booking_reference || bookingAffected.reference || 'TF-ACT-8842',
        vendor_name: bookingAffected.vendor_name || 'Himalayan Sky Adventures & Paragliding Club',
        amount: bookingAffected.amount || 14000,
        status: 'suspended_refund_eligible',
      },
    ],
    affected_travelers_count: travelersCount,
    traveler_names: travelerNames,
    schedule_impact: {
      slot_affected: 'Day 3 (15:00 – 17:30)',
      duration_affected: '2.5 Hours vacant schedule slot',
      downstream_impact: 'Evening Bohemian Cafe Stroll (18:00) remains unhindered if replacement finishes by 17:45.',
    },
    transport_dependencies: {
      has_transit_dependency: true,
      details: 'Assigned private 4x4 Chauffeur (Gurpreet Singh) is stationed with the group at Solang and available for transit to Beas River or local circuit.',
    },
    cost_impact: {
      affected_amount: 14000,
      refundable: true,
      budget_variance_risk: 'Low / Positive (Kayaking replacement reduces net tour cost by ₹6,000).',
    },
    preference_impact: {
      category: 'Adventure & Adrenaline',
      impact_level: 'high',
      notes: 'Group explicitly requested high-energy outdoor activities. Replacement must preserve active engagement.',
    },
    recommended_action: 'Auto-replan with White Water Alpine Kayaking on Beas River (94% Match, 4.9⭐, ₹8,000).',
  };
}
