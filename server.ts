import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { 
  initialVendors, 
  manaliReplanCandidates, 
  computeImpactAnalysis, 
  rankAlternativesWithGemini,
  OperatorVendor
} from './src/server/operatorEngine';
import { createCanonicalSeedTrips } from './src/server/seedTrips';
import { 
  isInvalidDestination, 
  parseDateRange, 
  parseBudget,
  validateTripFields, 
  ParsedDates, 
  TripValidationResult 
} from './src/utils/validation';
import {
  validateAndEnforceItinerary,
  generateAIStructuredItinerary,
  DESTINATION_KNOWLEDGE_BASE,
  ATTRACTION_PHOTOS
} from './src/server/itineraryEngine';
import { computeLiveTransportOptions } from './src/server/liveTransportEngine';
import { getPossibleOptionsForDestination } from './src/server/possibleOptionsEngine';
import { handleConciergeChat } from './src/server/chatEngine';

// Enterprise Gemini Services & Infrastructure
import { geminiService, Type } from './src/server/services/geminiService';
import { itineraryService } from './src/server/services/itineraryService';
import { replanService } from './src/server/services/replanService';
import { operatorAiService } from './src/server/services/operatorAiService';
import { conciergeService } from './src/server/services/conciergeService';
import { logger } from './src/server/utils/logger';
import { geminiConfig } from './src/server/config/geminiConfig';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Resilient Gemini generator wrapper bridging to GeminiService
async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
  models?: string[];
}): Promise<string | null> {
  try {
    if (params.config?.responseSchema) {
      const structured = await geminiService.generateStructured<any>(
        params.contents,
        params.config.responseSchema,
        {
          systemInstruction: params.config.systemInstruction,
          temperature: params.config.temperature,
          model: params.models?.[0],
        }
      );
      return JSON.stringify(structured);
    } else if (Array.isArray(params.contents) && params.contents.length > 0 && params.contents[0].role) {
      return await geminiService.generateChat(params.contents, {
        systemInstruction: params.config?.systemInstruction,
        temperature: params.config?.temperature,
        model: params.models?.[0],
      });
    } else {
      const promptText = typeof params.contents === 'string' 
        ? params.contents 
        : JSON.stringify(params.contents);
      return await geminiService.generateText(promptText, {
        systemInstruction: params.config?.systemInstruction,
        temperature: params.config?.temperature,
        model: params.models?.[0],
      });
    }
  } catch (err: any) {
    logger.warn('Gemini wrapper caught generation error', { module: 'server.ts' }, err);
    return null;
  }
}

// ----------------------------------------------------
// Types
// ----------------------------------------------------
export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  state_region: string;
  description: string;
  hero_image_url: string;
  gallery_images?: string[];
  best_time_to_visit: string;
  tags: string[];
  is_featured: boolean;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface TransportBookingOption {
  id: string;
  mode: 'flight' | 'train' | 'bus' | 'road' | 'cab';
  title: string;
  operator: string;
  route_summary: string;
  origin_city: string;
  destination_city: string;
  transit_hub: string;
  departure_time: string;
  arrival_time: string;
  duration_str: string;
  price_per_person: number;
  total_price: number;
  badge: 'recommended' | 'cheapest' | 'fastest' | 'alternative';
  verification_status: 'verified' | 'estimated';
  verification_label: string;
  booking_url: string;
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
  hotel_id?: string;
  activity_id?: string;
  transport_id?: string;
  location?: string;
  image_url?: string;
}

// ----------------------------------------------------
// Destinations Catalog
// ----------------------------------------------------
const destinationsCatalog: Destination[] = [
  {
    id: 'dest-darjeeling-001',
    name: 'Darjeeling',
    slug: 'darjeeling',
    country: 'India',
    state_region: 'West Bengal',
    description: 'The Queen of the Hills, renowned for world-famous tea gardens, iconic UNESCO Himalayan Railway toy train, panoramic Kanchenjunga sunrises at Tiger Hill, and serene Buddhist monasteries.',
    hero_image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'March to May & October to December',
    tags: ['tea_gardens', 'himalayas', 'toy_train', 'culture', 'family', 'scenic_views'],
    is_featured: true,
    latitude: 27.041,
    longitude: 88.2663,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-manali-002',
    name: 'Manali',
    slug: 'manali',
    country: 'India',
    state_region: 'Himachal Pradesh',
    description: 'Perched at 2,050m in Kullu Valley, featuring snow-clad Pir Panjal peaks, alpine pine forests, thrilling passes, and vibrant bohemian café culture.',
    hero_image_url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'October to June (Snow: Dec-Feb)',
    tags: ['mountains', 'snow', 'adventure', 'rivers', 'cafes', 'trekking'],
    is_featured: true,
    latitude: 32.2396,
    longitude: 77.1887,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-goa-003',
    name: 'Goa',
    slug: 'goa',
    country: 'India',
    state_region: 'Goa',
    description: 'Sun-drenched tropical coastline famed for golden sand beaches, Portuguese colonial architecture, vibrant night markets, and fresh coastal cuisine.',
    hero_image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'November to March',
    tags: ['beaches', 'sunsets', 'nightlife', 'heritage', 'water_sports'],
    is_featured: true,
    latitude: 15.2993,
    longitude: 74.124,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-kerala-004',
    name: 'Kerala',
    slug: 'kerala',
    country: 'India',
    state_region: 'Kerala',
    description: "God's Own Country, featuring serene palm-fringed backwaters, emerald tea estates in Munnar, Ayurvedic rejuvenation sanctuaries, and spice-laden breezes.",
    hero_image_url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'September to March',
    tags: ['backwaters', 'tea_gardens', 'ayurveda', 'nature', 'houseboats'],
    is_featured: true,
    latitude: 10.8505,
    longitude: 76.2711,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-rajasthan-005',
    name: 'Rajasthan',
    slug: 'rajasthan',
    country: 'India',
    state_region: 'Rajasthan',
    description: 'Land of royal kings, golden Thar sand dunes, monumental hilltop fortresses, and opulent heritage palace hotels in Jaipur, Udaipur, and Jaisalmer.',
    hero_image_url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'October to March',
    tags: ['palaces', 'desert', 'forts', 'royal_heritage', 'culture'],
    is_featured: true,
    latitude: 27.0238,
    longitude: 74.2179,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-kashmir-006',
    name: 'Kashmir',
    slug: 'kashmir',
    country: 'India',
    state_region: 'Jammu & Kashmir',
    description: 'The Crown Jewel of the Himalayas, offering tranquil Dal Lake shikara rides, Gulmarg powder-snow skiing, and wildflower meadows of Pahalgam.',
    hero_image_url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'March to October (Snow: Dec-Feb)',
    tags: ['dal_lake', 'snow_skiing', 'valleys', 'houseboats', 'nature'],
    is_featured: true,
    latitude: 34.0837,
    longitude: 74.7973,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-puri-007',
    name: 'Jagannath Puri',
    slug: 'jagannath-puri',
    country: 'India',
    state_region: 'Odisha',
    description: 'Sacred coastal city famed for the 12th-century Shree Jagannath Temple, the vibrant Grand Road (Badadanda), Golden Beach, Raghurajpur heritage crafts village, and Chilika Lake dolphin sanctuary.',
    hero_image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'October to March (Rath Yatra in June/July)',
    tags: ['temples', 'beach', 'heritage', 'crafts', 'spiritual', 'culinary'],
    is_featured: true,
    latitude: 19.8135,
    longitude: 85.8312,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-bali-008',
    name: 'Bali',
    slug: 'bali',
    country: 'Indonesia',
    state_region: 'Bali',
    description: 'The Island of the Gods, featuring sacred sea cliff temples at Uluwatu, emerald Tegallalang rice terraces, vibrant Ubud artisan culture, and sunset shores in Seminyak.',
    hero_image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'April to October (Dry & Sunny Season)',
    tags: ['temples', 'beaches', 'rice_terraces', 'culture', 'wellness', 'sunsets'],
    is_featured: true,
    latitude: -8.4095,
    longitude: 115.1889,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dest-china-009',
    name: 'China',
    slug: 'china',
    country: 'China',
    state_region: 'Beijing & Shanghai',
    description: 'Explore the imperial wonders of the Great Wall, Forbidden City, Summer Palace, and the futuristic skyline along Shanghai’s Bund.',
    hero_image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1513415277900-a62401e19be4?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'September to November & April to May',
    tags: ['great_wall', 'imperial_palaces', 'culture', 'skylines', 'history', 'bullet_trains'],
    is_featured: true,
    latitude: 39.9042,
    longitude: 116.4074,
    created_at: new Date().toISOString(),
  },
];

let tripsStore: any[] = createCanonicalSeedTrips(destinationsCatalog);
let vendorsStore: OperatorVendor[] = [...initialVendors];
let tripsVersion: number = Date.now();

function getOrCreateDestination(destName: string): Destination {
  const cleanName = destName.trim();
  const lower = cleanName.toLowerCase();
  const found = destinationsCatalog.find((d) => 
    d.name.toLowerCase() === lower || 
    lower.includes(d.name.toLowerCase()) || 
    d.slug.toLowerCase() === lower
  );
  if (found) return found;

  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `dest-${slug}-${Date.now()}`,
    name: cleanName,
    slug,
    country: 'India',
    state_region: cleanName,
    description: `Discover the breathtaking sights, authentic local culture, and curated culinary experiences of ${cleanName}.`,
    hero_image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=80',
    gallery_images: [
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    ],
    best_time_to_visit: 'Year-round depending on preferred season',
    tags: ['sightseeing', 'culture', 'nature', 'exploration'],
    is_featured: false,
    latitude: 20.5937,
    longitude: 78.9629,
    created_at: new Date().toISOString(),
  };
}

// ----------------------------------------------------
// Deterministic Extraction Engine
// ----------------------------------------------------
interface StructuredTripExtraction {
  destination: string | null;
  origin: string | null;
  travelers: number | null;
  travel_type: 'solo' | 'couple' | 'family' | 'friends' | null;
  start_date: string | null;
  end_date: string | null;
  formatted_dates: string | null;
  travel_month?: string | null;
  duration_days: number | null;
  budget: number | null;
  currency: string;
  interests: string[];
  travel_style: string | null;
  accommodation_preference: string | null;
  transport_preference: 'flight' | 'train' | 'bus' | 'road' | null;
  action: 'new_trip' | 'modify_trip' | 'ask_question';
  is_dates_valid?: boolean;
  modifications?: {
    cheaper?: boolean;
    new_destination?: string | null;
    new_duration_days?: number | null;
    new_budget?: number | null;
    new_travelers?: number | null;
    upgrade_hotel?: boolean;
    cheaper_hotel?: boolean;
    change_flight?: boolean;
    train_preferred?: boolean;
    flight_preferred?: boolean;
    faster_option?: boolean;
    cheapest_transport?: boolean;
    keep_hotel_reduce_transport?: boolean;
  };
}

function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function ruleBasedExtract(text: string, currentContext?: any): StructuredTripExtraction {
  const clean = text.trim();

  // 1. Destination Rule
  // Destination MUST be a real geographic place. NEVER a month, date, number, or season.
  let destination: string | null = null;
  const destMatches = [
    // Top Global & International Destinations
    { name: 'China', regex: /\b(?:china|beijing|shanghai|guangzhou|shenzhen|chengdu|xian|xi'an|hangzhou|guilin|wuhan|tianjin|hong kong|macau)\b/i },
    { name: 'Japan', regex: /\b(?:japan|tokyo|kyoto|osaka|hokkaido|fuji|mt fuji|mount fuji|hiroshima|nara|fukuoka|okinawa)\b/i },
    { name: 'Bali', regex: /\b(?:bali|denpasar|ubud|seminyak|canggu|kuta|uluwatu|nusa penida|kintamani|sanur|jimbaran)\b/i },
    { name: 'Thailand', regex: /\b(?:thailand|bangkok|phuket|pattaya|krabi|chiang mai|koh samui|phi phi)\b/i },
    { name: 'Singapore', regex: /\b(?:singapore|sentosa|marina bay)\b/i },
    { name: 'Dubai', regex: /\b(?:dubai|abu dhabi|sharjah|uae|united arab emirates)\b/i },
    { name: 'Vietnam', regex: /\b(?:vietnam|hanoi|ho chi minh|da nang|hoi an|ha long|halong bay)\b/i },
    { name: 'Malaysia', regex: /\b(?:malaysia|kuala lumpur|penang|langkawi|malacca)\b/i },
    { name: 'Maldives', regex: /\b(?:maldives|male|maafushi)\b/i },
    { name: 'Sri Lanka', regex: /\b(?:sri lanka|colombo|kandy|galle|bentota|nuwara eliya|sigiriya)\b/i },
    { name: 'Nepal', regex: /\b(?:nepal|kathmandu|pokhara|everest|annapurna)\b/i },
    { name: 'Bhutan', regex: /\b(?:bhutan|thimphu|paro|punakha)\b/i },
    { name: 'Switzerland', regex: /\b(?:switzerland|swiss|zurich|geneva|lucerne|interlaken|zermatt|alps|matterhorn)\b/i },
    { name: 'France', regex: /\b(?:france|paris|nice|lyon|marseille|cannes|bordeaux|french riviera)\b/i },
    { name: 'Italy', regex: /\b(?:italy|rome|florence|venice|milan|amalfi|naples|cinque terre|pisa)\b/i },
    { name: 'United Kingdom', regex: /\b(?:uk|united kingdom|london|scotland|edinburgh|manchester|oxford|cambridge)\b/i },
    { name: 'Germany', regex: /\b(?:germany|berlin|munich|frankfurt|bavaria|hamburg|cologne)\b/i },
    { name: 'Spain', regex: /\b(?:spain|barcelona|madrid|seville|ibiza|valencia|mallorca|granada)\b/i },
    { name: 'Greece', regex: /\b(?:greece|athens|santorini|mykonos|crete|rhodes)\b/i },
    { name: 'Turkey', regex: /\b(?:turkey|türkiye|istanbul|cappadocia|antalya|bodrum)\b/i },
    { name: 'Egypt', regex: /\b(?:egypt|cairo|giza|pyramids|luxor|aswan|sharm el sheikh|hurghada)\b/i },
    { name: 'United States', regex: /\b(?:usa|united states|america|new york|nyc|los angeles|san francisco|las vegas|miami|hawaii|orlando|chicago)\b/i },
    { name: 'Australia', regex: /\b(?:australia|sydney|melbourne|brisbane|gold coast|cairns|perth)\b/i },
    { name: 'New Zealand', regex: /\b(?:new zealand|auckland|queenstown|christchurch|rotorua)\b/i },
    { name: 'South Korea', regex: /\b(?:korea|south korea|seoul|busan|jeju)\b/i },
    { name: 'Mauritius', regex: /\b(?:mauritius|port louis)\b/i },
    { name: 'Indonesia', regex: /\b(?:indonesia|jakarta|lombok|komodo)\b/i },
    { name: 'Canada', regex: /\b(?:canada|toronto|vancouver|montreal|banff)\b/i },
    { name: 'South Africa', regex: /\b(?:south africa|cape town|johannesburg|kruger)\b/i },
    { name: 'Georgia', regex: /\b(?:tbilisi|batumi)\b/i },
    { name: 'Azerbaijan', regex: /\b(?:baku|azerbaijan)\b/i },
    { name: 'Kazakhstan', regex: /\b(?:almaty|astana|kazakhstan)\b/i },
    { name: 'Uzbekistan', regex: /\b(?:tashkent|samarkand|uzbekistan)\b/i },
    { name: 'Hong Kong', regex: /\bhong kong\b/i },
    { name: 'Taiwan', regex: /\b(?:taiwan|taipei)\b/i },

    // Indian States & Iconic Destinations
    { name: 'Uttar Pradesh', regex: /\b(?:uttar pradesh|up|varanasi|kashi|ayodhya|mathura|lucknow|agra|vrindavan|prayagraj|sarnath)\b/i },
    { name: 'Jagannath Puri', regex: /\b(?:jagannath|puri|jagannath puri|shree jagannath)\b/i },
    { name: 'Darjeeling', regex: /\bdarjeeling\b/i },
    { name: 'Goa', regex: /\bgoa\b/i },
    { name: 'Manali', regex: /\bmanali\b|\bsolang\b|\brohtang\b/i },
    { name: 'Kerala', regex: /\bkerala\b|\bmunnar\b|\balleppey\b|\bkochi\b|\bcochin\b|\bwayanad\b|\bvarkala\b|\bthekkady\b|\bkumarakom\b/i },
    { name: 'Rajasthan', regex: /\brajasthan\b|\bjaipur\b|\budaipur\b|\bjodhpur\b|\bjaisalmer\b|\bpushkar\b|\bmount abu\b|\branthambore\b/i },
    { name: 'Kashmir', regex: /\bkashmir\b|\bsrinagar\b|\bgulmarg\b|\bpahalgam\b|\bsonamarg\b/i },
    { name: 'Ladakh', regex: /\bladakh\b|\bleh\b|\bnubra\b|\bpangong\b/i },
    { name: 'Shimla', regex: /\bshimla\b|\bkufri\b|\bchail\b/i },
    { name: 'Ooty', regex: /\booty\b|\budhagamandalam\b|\bcoonoor\b/i },
    { name: 'Rishikesh', regex: /\brishikesh\b|\bharidwar\b/i },
    { name: 'Varanasi', regex: /\bvaranasi\b|\bbanaras\b|\bkashi\b/i },
    { name: 'Andaman', regex: /\bandaman\b|\bhavelock\b|\bport blair\b|\bneil island\b|\bradhannagar\b/i },
    { name: 'Sikkim', regex: /\bsikkim\b|\bgangtok\b|\bpelling\b|\blachung\b|\byumthang\b/i },
    { name: 'Coorg', regex: /\bcoorg\b|\bmadikeri\b/i },
    { name: 'Kodaikanal', regex: /\bkodaikanal\b/i },
    { name: 'Nainital', regex: /\bnainital\b|\bbhimtal\b|\bmukteshwar\b/i },
    { name: 'Mussoorie', regex: /\bmussoorie\b|\bdhanaulti\b/i },
    { name: 'Spiti', regex: /\bspiti\b|\bkaza\b|\btabo\b/i },
    { name: 'Meghalaya', regex: /\bmeghalaya\b|\bshillong\b|\bcherrapunji\b|\bdawki\b/i },
    { name: 'Hampi', regex: /\bhampi\b|\bhospet\b/i },
    { name: 'Pondicherry', regex: /\bpondicherry\b|\bpuducherry\b|\bauroville\b/i },
    { name: 'Agra', regex: /\bagra\b|\btaj mahal\b/i },
    { name: 'Amritsar', regex: /\bamritsar\b|\bgolden temple\b/i },
    { name: 'Mahabaleshwar', regex: /\bmahabaleshwar\b|\blonavala\b|\bkhandala\b|\bpanchgani\b/i },
    { name: 'Munnar', regex: /\bmunnar\b/i },
    { name: 'Jaipur', regex: /\bjaipur\b/i },
    { name: 'Udaipur', regex: /\budaipur\b/i },
    { name: 'Kolkata', regex: /\bkolkata\b|\bcalcutta\b/i },
    { name: 'Mumbai', regex: /\bmumbai\b|\bbombay\b/i },
    { name: 'Delhi', regex: /\bdelhi\b|\bnew delhi\b/i },
    { name: 'Bangalore', regex: /\bbangalore\b|\bbengaluru\b/i },
    { name: 'Chennai', regex: /\bchennai\b|\bmadras\b/i },
    { name: 'Hyderabad', regex: /\bhyderabad\b/i },
  ];

  for (const item of destMatches) {
    if (item.regex.test(clean)) {
      destination = item.name;
      break;
    }
  }

  // 1b. Multi-Pattern Dynamic NLP Destination Extraction
  if (!destination) {
    const sanitizeCand = (rawCand: string): string | null => {
      if (!rawCand) return null;
      let cand = rawCand.trim();
      // Strip leading stop words
      cand = cand.replace(/^(?:to|go|visit|travel|explore|the|a|an|for|in|at|on|from|our|my|into)\s+/i, '').trim();
      // Strip trailing phrases (e.g. "for 6 days", "with 2 people", "from mumbai", "in september", "under 50000", "trip", "tour")
      cand = cand.replace(/\s+(?:for\s+\d+.*|with\s+\d+.*|from\s+.*|in\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-z]+).*|under\s+\d+.*|on\s+\d+.*|trip|tour|vacation|holiday|days?|nights?)$/i, '').trim();
      if (!isInvalidDestination(cand) && cand.length >= 2) {
        return toTitleCase(cand);
      }
      return null;
    };

    const nlpPatterns = [
      // Standalone single/multi-word destination: "china", "darjeeling", "puri", "to bali", "destination: goa", "visit manali", "trip to kashmir"
      /^(?:(?:i\s+want\s+to\s+go\s+to|i\s+want\s+to\s+visit|want\s+to\s+go\s+to|planning\s+to\s+visit|plan\s+to\s+visit|visit|go\s+to|to|for|trip\s+to|tour\s+to|destination\s*:?\s*|dest\s*:?\s*)\s+)?([A-Za-z\s]{2,35})$/i,
      // "want to go to china", "wish to visit china", "want to go china for 6 days", "go china"
      /(?:(?:want|would like|wish|plan|planning|hope|looking)\s+to\s+)?(?:go\s+to|go|travel\s+to|travel|visit|head\s+to|heading\s+to|fly\s+to|fly|tour|explore)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      // "trip to china", "tour of china", "vacation in china", "holiday in china"
      /(?:trip|tour|vacation|holiday|travel|journey|flight)\s+(?:to|for|in|around|of)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      // "planning for china", "plan for china"
      /(?:planning|plan|looking)\s+(?:for|a\s+trip\s+to|a\s+tour\s+to|a\s+visit\s+to)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      // "destination: china", "destination china", "destination is china"
      /(?:destination|dest|place|city|location|country)(?:\s+is|\s*:|\s+to|\s+as)?\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      // "6 days in china", "6 days trip to china"
      /(?:\d+\s*(?:day|days|night|nights|week|weeks))\s+(?:in|at|to|around|trip\s+to|tour\s+to)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      // Start of sentence: "china for 6 days", "china 6 days", "china, 2 people"
      /^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:for\s+\d+\s*(?:day|days|night|nights|week|weeks)|\d+\s*(?:day|days|night|nights)|trip|tour|holiday|vacation|,|\bwith\b|\bfrom\b)/i,
      // "in china for 6 days"
      /(?:in|at|around)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:for\s+\d+\s*(?:day|days)|\d+\s*(?:day|days)|with|from)/i,
    ];

    for (const pattern of nlpPatterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        const sanitized = sanitizeCand(match[1]);
        if (sanitized) {
          destination = sanitized;
          break;
        }
      }
    }
  }

  if (isInvalidDestination(destination)) {
    destination = null;
  }

  // 2. Dates Extraction & Validation
  const dateParsed = parseDateRange(clean);

  // 3. Budget Extraction
  const budget: number | null = parseBudget(clean);

  // 4. Duration Extraction
  let duration_days: number | null = dateParsed.duration_days;
  const dayMatch = clean.match(/(\d+)\s*(?:day|days)/i);
  const nightMatch = clean.match(/(\d+)\s*(?:night|nights)/i);
  const weekMatch = clean.match(/(\d+)\s*(?:week|weeks)/i);

  if (dayMatch) {
    duration_days = parseInt(dayMatch[1], 10);
  } else if (nightMatch) {
    duration_days = parseInt(nightMatch[1], 10) + 1;
  } else if (weekMatch) {
    duration_days = parseInt(weekMatch[1], 10) * 7;
  }

  // 5. Travelers & Travel Type
  let travelers: number | null = null;
  let travel_type: 'solo' | 'couple' | 'family' | 'friends' | null = null;

  const peopleMatch = clean.match(/(\d+)\s*(?:people|persons|travelers|pax|members|adults|guests)/i);
  if (peopleMatch) {
    travelers = parseInt(peopleMatch[1], 10);
  }

  if (/family/i.test(clean)) {
    travel_type = 'family';
    // STRICT: Do NOT default travelers to 4
  } else if (/couple|honeymoon|partner|husband|wife/i.test(clean)) {
    travel_type = 'couple';
    if (!travelers) travelers = 2;
  } else if (/friends|gang|buddies|group/i.test(clean)) {
    travel_type = 'friends';
    // STRICT: Do NOT default travelers to 4
  } else if (/solo|myself|alone/i.test(clean)) {
    travel_type = 'solo';
    if (!travelers) travelers = 1;
  }

  // 6. Origin (Origin ≠ Destination, not invalid)
  let origin: string | null = null;
  const fromMatch = clean.match(/(?:from|starting from|departing from|leaving from|out of)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (fromMatch) {
    const cand = fromMatch[1].trim().replace(/\s+(?:in|for|with|on|during|to)\s+.*$/i, '').trim();
    if (!isInvalidDestination(cand)) {
      origin = toTitleCase(cand);
    }
  }
  if (origin && destination && origin.toLowerCase() === destination.toLowerCase()) {
    origin = null;
  }

  // 7. Transport & Accommodation Intent & Modifications
  let transport_preference: 'flight' | 'train' | 'bus' | 'road' | null = null;
  if (/train|railway|irctc|shatabdi|rajdhani|vande bharat/i.test(clean)) {
    transport_preference = 'train';
  } else if (/flight|plane|air|airline/i.test(clean) && !/change (?:my )?flight/i.test(clean)) {
    transport_preference = 'flight';
  }

  const isCheaper = /cheaper|reduce (?:trip )?budget|lower budget|less expensive|too costly|budget cut|economical|make (?:the )?trip cheaper/i.test(clean);
  const isCheaperHotel = /cheaper hotel|cheaper resort|cheaper stay|budget hotel|reduce hotel cost/i.test(clean);
  const isUpgradeHotel = /upgrade|luxury|4[- ]?star|5[- ]?star|premium resort|find a 4-star|find a 5-star/i.test(clean);
  const isChangeFlight = /change (?:my )?flight|alternative flight|different flight|another flight/i.test(clean);
  const isTrainPreferred = /prefer train|train instead|take train|by train/i.test(clean);
  const isFlightPreferred = /prefer flight|flight instead|take flight|by flight/i.test(clean);
  const isFasterOption = /faster|fastest|quickest|save time|non-stop/i.test(clean);
  const isCheapestTransport = /cheapest transport|cheap transport|reduce transport|lowest fare/i.test(clean);
  const isKeepHotelReduceTransport = /keep (?:the )?hotel but reduce transport|keep hotel/i.test(clean);

  let newDestChange: string | null = null;
  const changeDestMatch = clean.match(/(?:change|switch|modify|move|update|put|plan for)\s+(?:destination\s+)?(?:to\s+)?([A-Za-z]+)/i);
  if (changeDestMatch) {
    const cand = changeDestMatch[1].trim();
    if (!isInvalidDestination(cand)) {
      newDestChange = cand.toLowerCase() === 'bali' ? 'Bali' : cand;
    }
  }

  let newDurationChange: number | null = null;
  if (dayMatch && (/make it|change to|increase to|extend to|reduce to|set to/i.test(clean) || clean.toLowerCase().startsWith('make it'))) {
    newDurationChange = parseInt(dayMatch[1], 10);
  }

  let action: 'new_trip' | 'modify_trip' | 'ask_question' = 'new_trip';
  if (currentContext && (
    isCheaper || isCheaperHotel || isUpgradeHotel || isChangeFlight || isTrainPreferred || isFlightPreferred ||
    isFasterOption || isCheapestTransport || isKeepHotelReduceTransport || newDestChange || newDurationChange ||
    clean.toLowerCase().startsWith('make ') || clean.toLowerCase().startsWith('change ') || clean.toLowerCase().startsWith('find ')
  )) {
    action = 'modify_trip';
  }

  return {
    destination,
    origin,
    travelers,
    travel_type,
    start_date: dateParsed.start_date,
    end_date: dateParsed.end_date,
    formatted_dates: dateParsed.formatted_dates,
    travel_month: dateParsed.travel_month,
    duration_days,
    budget,
    currency: 'INR',
    interests: [],
    travel_style: null,
    accommodation_preference: isUpgradeHotel ? 'luxury' : isCheaperHotel ? 'budget' : null,
    transport_preference,
    action,
    is_dates_valid: dateParsed.is_valid,
    modifications: {
      cheaper: isCheaper,
      cheaper_hotel: isCheaperHotel,
      upgrade_hotel: isUpgradeHotel,
      change_flight: isChangeFlight,
      train_preferred: isTrainPreferred,
      flight_preferred: isFlightPreferred,
      faster_option: isFasterOption,
      cheapest_transport: isCheapestTransport,
      keep_hotel_reduce_transport: isKeepHotelReduceTransport,
      new_destination: newDestChange,
      new_duration_days: newDurationChange,
      new_budget: (action === 'modify_trip' && budget) ? budget : null,
      new_travelers: (action === 'modify_trip' && travelers) ? travelers : null,
    },
  };
}

async function extractWithGemini(userMessage: string, currentContext?: any): Promise<StructuredTripExtraction> {
  const ruleExtraction = ruleBasedExtract(userMessage, currentContext);

  try {
    const prompt = `You are the master trip extraction and intent parser for TourFlow AI.
Analyze user input: "${userMessage}"
Current Context: ${JSON.stringify(currentContext || {})}

EXTRACTION CONFIGURATION:
{
  "extraction_rules": {
    "allow_defaults": false,
    "placeholder_leakage_prevention": "Do NOT use numbers from input placeholder text or system prompt examples as extracted values.",
    "missing_value_action": "Set missing keys to null and ask the user to specify them."
  }
}

STRICT PARAMETER EXTRACTION (No Default Fallbacks):
- Only extract a parameter (destination, origin, travelers, dates, budget) if it is EXPLICITLY provided by the user in the current message or verified active state.
- NEVER pull values from system prompt examples, placeholder text, or pre-filled template strings.
- If budget is not specified by the user, set budget: null.
- If travelers is not specified by the user, set travelers: null.
- If origin is not specified by the user, set origin: null.
- If destination is not specified by the user, set destination: null.
- If dates (start_date, end_date) are not explicitly specified by the user, set start_date: null, end_date: null, formatted_dates: null.

CRITICAL DESTINATION RULES:
- Destination MUST be a real geographic place (city, state, region, hill station, or country).
- NEVER treat months, dates, years, weekdays, seasons, durations, numbers, or budgets as destinations!
- Words such as January, February, March, April, May, June, July, August, September, October, November, December are DATE/TIME information, NEVER destinations.
- If user says "Manali in September", destination = "Manali" and travel_month = "September".
- If user says "21st September to 26th September", those are travel dates, NOT the destination.
- If no valid geographic place is mentioned in the input, set destination to null.

CRITICAL DATE RULES:
- Explicit dates require specific calendar days (e.g. "21 September to 26 September").
- If only a month is mentioned (e.g. "in September"), store travel_month = "September", but set start_date = null, end_date = null, formatted_dates = null. Do NOT invent dates!
- When explicit dates are provided, extract start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), formatted_dates (e.g. "Sep 21 – Sep 26, 2026"), and duration_days.

CRITICAL VALIDATION RULES:
- Origin must be a geographic place (e.g. Mumbai, Delhi, Kolkata). Origin cannot equal destination.
- Travelers must be a positive integer explicitly stated.
- Budget must be a positive integer in INR explicitly stated.
- If any parameter is omitted by the user, set its value to null.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        origin: { type: Type.STRING },
        travelers: { type: Type.INTEGER },
        travel_type: { type: Type.STRING },
        start_date: { type: Type.STRING },
        end_date: { type: Type.STRING },
        formatted_dates: { type: Type.STRING },
        travel_month: { type: Type.STRING },
        duration_days: { type: Type.INTEGER },
        budget: { type: Type.INTEGER },
        currency: { type: Type.STRING },
        interests: { type: Type.ARRAY, items: { type: Type.STRING } },
        transport_preference: { type: Type.STRING },
        action: { type: Type.STRING },
        modifications: {
          type: Type.OBJECT,
          properties: {
            cheaper: { type: Type.BOOLEAN },
            cheaper_hotel: { type: Type.BOOLEAN },
            upgrade_hotel: { type: Type.BOOLEAN },
            change_flight: { type: Type.BOOLEAN },
            train_preferred: { type: Type.BOOLEAN },
            flight_preferred: { type: Type.BOOLEAN },
            faster_option: { type: Type.BOOLEAN },
            cheapest_transport: { type: Type.BOOLEAN },
            new_destination: { type: Type.STRING },
            new_duration_days: { type: Type.INTEGER },
            new_budget: { type: Type.INTEGER },
            new_travelers: { type: Type.INTEGER },
          },
        },
      },
      required: ['action'],
    };

    const parsed = await geminiService.generateStructured<any>(prompt, schema, {
      temperature: geminiConfig.structuredTemperature,
    });

    if (!parsed) {
      return ruleExtraction;
    }

    // Post-process & Validate Gemini Extraction
    let finalDest: string | null = null;
    if (parsed.destination && !isInvalidDestination(parsed.destination)) {
      finalDest = toTitleCase(parsed.destination.trim());
    } else if (ruleExtraction.destination && !isInvalidDestination(ruleExtraction.destination)) {
      finalDest = toTitleCase(ruleExtraction.destination);
    }

    let finalOrigin: string | null = null;
    if (parsed.origin && !isInvalidDestination(parsed.origin)) {
      finalOrigin = toTitleCase(parsed.origin.trim());
    } else if (ruleExtraction.origin && !isInvalidDestination(ruleExtraction.origin)) {
      finalOrigin = toTitleCase(ruleExtraction.origin);
    }
    if (finalOrigin && finalDest && finalOrigin.toLowerCase() === finalDest.toLowerCase()) {
      finalOrigin = null;
    }

    const travelMonth = ruleExtraction.travel_month || parsed.travel_month || null;
    const startDate = ruleExtraction.start_date || parsed.start_date || null;
    const endDate = ruleExtraction.end_date || parsed.end_date || null;
    const formattedDates = ruleExtraction.formatted_dates || parsed.formatted_dates || null;
    const isDatesValid = Boolean(startDate && endDate);

    let durationDays = ruleExtraction.duration_days || parsed.duration_days || null;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        durationDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      }
    }

    const finalTravelers = (typeof parsed.travelers === 'number' && parsed.travelers > 0)
      ? parsed.travelers
      : (ruleExtraction.travelers || null);

    const finalBudget = (typeof parsed.budget === 'number' && parsed.budget > 0)
      ? parsed.budget
      : (ruleExtraction.budget || null);

    return {
      destination: finalDest,
      origin: finalOrigin,
      travelers: finalTravelers,
      travel_type: (parsed.travel_type as any) || ruleExtraction.travel_type,
      start_date: startDate,
      end_date: endDate,
      formatted_dates: formattedDates,
      travel_month: travelMonth,
      duration_days: durationDays,
      budget: finalBudget,
      currency: parsed.currency || 'INR',
      interests: parsed.interests || ruleExtraction.interests || [],
      travel_style: null,
      accommodation_preference: ruleExtraction.accommodation_preference,
      transport_preference: (parsed.transport_preference as any) || ruleExtraction.transport_preference,
      action: (parsed.action as any) || ruleExtraction.action,
      is_dates_valid: isDatesValid,
      modifications: {
        ...ruleExtraction.modifications,
        ...(parsed.modifications || {}),
      },
    };
  } catch (err) {
    console.warn('Gemini extraction fallback to rule engine:', err);
    return ruleExtraction;
  }
}

// ----------------------------------------------------
// Grounded Verified Transport & Accommodation Data Engine
// ----------------------------------------------------
function resolveTransportOptions(params: {
  origin: string | null;
  destination: string;
  startDate: string | null;
  travelers: number;
  targetBudget: number;
  preference?: 'flight' | 'train' | 'bus' | 'road' | null;
  travelMonth?: string | null;
}): { selected: TransportBookingOption; alternatives: TransportBookingOption[] } {
  return computeLiveTransportOptions({
    origin: params.origin,
    destination: params.destination,
    startDate: params.startDate,
    travelers: params.travelers,
    targetBudget: params.targetBudget,
    preference: params.preference,
    travelMonth: params.travelMonth,
  });
}

function resolveAccommodationOptions(params: {
  destination: string;
  nights: number;
  travelers: number;
  budgetTier?: 'budget' | 'moderate' | 'luxury';
  preference?: string | null;
  targetBudget?: number;
}): { selected: AccommodationOption; alternatives: AccommodationOption[] } {
  const { destination, nights, travelers, budgetTier, targetBudget } = params;
  const numRooms = Math.max(1, Math.ceil(travelers / 2));
  const dest = destination.trim();
  const lowerDest = dest.toLowerCase();

  const options: AccommodationOption[] = [];

  if (lowerDest.includes('darjeeling') || lowerDest.includes('sikkim')) {
    // 1. Best Match: Mountain View Boutique Resort
    const baseRate = 6500;
    options.push({
      id: 'acc-darj-boutique',
      name: 'Cedar Inn & Heritage Kanchenjunga Boutique Resort',
      rating: 4.8,
      review_count: 1420,
      category: 'boutique',
      location: 'Jalapahar Road, Above Mall Road, Darjeeling',
      room_type: `${numRooms}x Deluxe Mountain View Valley Room (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Buffet Breakfast Included', 'Kanchenjunga Balcony', 'Heated Rooms', 'High-Speed Wi-Fi', 'Spa & Fireplace'],
      why_it_matches: 'Matches your group size and provides authentic colonial charm with panoramic sunrise views from your private terrace.',
      hero_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'best_match',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 2. Cheapest: Cozy Heritage Homestay
    const cheapRate = 3200;
    options.push({
      id: 'acc-darj-homestay',
      name: 'Happy Valley Pine Heritage Homestay & Tea Villa',
      rating: 4.6,
      review_count: 580,
      category: 'homestay',
      location: 'Near Happy Valley Tea Estate, Darjeeling',
      room_type: `${numRooms}x Family Pine Wood Suite with Mountain Balcony`,
      price_per_night: cheapRate * numRooms,
      total_price: cheapRate * numRooms * nights,
      nights,
      amenities: ['Home-Cooked Breakfast', 'Organic Tea Garden Walk', 'Wi-Fi', 'Warm Hospitality', 'Electric Blankets'],
      why_it_matches: 'Saves over 50% on accommodation costs while offering authentic local family hospitality and homemade Darjeeling meals.',
      hero_image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'cheapest',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 3. Best Rated: Heritage Tea Estate
    const bestRatedRate = 11500;
    options.push({
      id: 'acc-darj-estate',
      name: 'Glenburn Heritage Colonial Tea Estate & Mountain Sanctuary',
      rating: 4.9,
      review_count: 890,
      category: 'luxury',
      location: 'Glenburn Tea Estate Valley, Darjeeling',
      room_type: `${numRooms}x Planters Colonial Suite with Tea Valley Vistas`,
      price_per_night: bestRatedRate * numRooms,
      total_price: bestRatedRate * numRooms * nights,
      nights,
      amenities: ['All Meals & High Tea Included', 'Private Estate Guide', 'Himalayan River Access', 'Ayurvedic Spa'],
      why_it_matches: 'Ranked #1 luxury estate in the Eastern Himalayas with world-class personalized chef dining and tea experiences.',
      hero_image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'best_rated',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 4. Luxury 5-Star Resort
    const luxRate = 14000;
    options.push({
      id: 'acc-darj-luxury',
      name: 'Mayfair Darjeeling 5-Star Hill Resort & Spa',
      rating: 4.8,
      review_count: 2100,
      category: 'luxury',
      location: 'Opposite Governor House, Darjeeling',
      room_type: `${numRooms}x Luxury Heritage Royal Suite with Fireplace`,
      price_per_night: luxRate * numRooms,
      total_price: luxRate * numRooms * nights,
      nights,
      amenities: ['Heated Indoor Pool', 'Multi-Cuisine Fine Dining', 'Kids Play Zone', 'Signature Spa', 'Valet Parking'],
      why_it_matches: 'Ultimate luxury with palatial wooden architecture, heated amenities, and prime location right across Raj Bhavan.',
      hero_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'luxury',
      booking_url: 'https://www.makemytrip.com/hotels',
    });
  } else if (lowerDest.includes('goa')) {
    // Goa Accommodations
    // 1. Best Match: Beachfront Boutique Resort
    const baseRate = 7200;
    options.push({
      id: 'acc-goa-boutique',
      name: 'Caravela Beach Resort & Spa, Varca Beach',
      rating: 4.8,
      review_count: 1850,
      category: 'boutique',
      location: 'Varca Beach Coast, South Goa',
      room_type: `${numRooms}x Ocean View Deluxe Suite (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Private Beach Access', 'Buffet Breakfast Included', 'Lagoon Pool', 'Ayurvedic Spa', 'Sunset Bar'],
      why_it_matches: 'Direct white sand beach access in serene South Goa with landscaped tropical gardens and family ocean suites.',
      hero_image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'best_match',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 2. Cheapest: Heritage Portuguese Villa Homestay
    const cheapRate = 3400;
    options.push({
      id: 'acc-goa-homestay',
      name: 'Casa Heritage Goan Villa & Palm Homestay',
      rating: 4.6,
      review_count: 620,
      category: 'homestay',
      location: 'Fontainhas Heritage Quarter, Panaji / Benaulim',
      room_type: `${numRooms}x Portuguese Veranda Family Suite`,
      price_per_night: cheapRate * numRooms,
      total_price: cheapRate * numRooms * nights,
      nights,
      amenities: ['Traditional Goan Breakfast', 'Garden Veranda', 'High-Speed Wi-Fi', 'Bicycle Rentals', 'AC Suites'],
      why_it_matches: 'Cozy colonial heritage atmosphere offering significant cost savings with authentic home-cooked seafood and breakfast.',
      hero_image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'cheapest',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 3. Best Rated / Luxury: Taj Exotica Resort & Spa Benaulim
    const luxRate = 16500;
    options.push({
      id: 'acc-goa-luxury',
      name: 'Taj Exotica Resort & Spa, Benaulim Coast',
      rating: 4.9,
      review_count: 2800,
      category: 'luxury',
      location: 'Calwaddo, Benaulim Beach, Goa',
      room_type: `${numRooms}x Luxury Mediterranean Villa Suite with Plunge Pool`,
      price_per_night: luxRate * numRooms,
      total_price: luxRate * numRooms * nights,
      nights,
      amenities: ['56 Acres Lush Gardens', 'Golf Course', 'Jiva Spa', 'Private Beachfront', 'Multi-Cuisine Fine Dining'],
      why_it_matches: 'Ranked Goa’s finest 5-star Mediterranean beachfront sanctuary with private butler service and gourmet dining.',
      hero_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'luxury',
      booking_url: 'https://www.makemytrip.com/hotels',
    });
  } else if (lowerDest.includes('manali')) {
    // Manali Accommodations
    const baseRate = 5800;
    options.push({
      id: 'acc-manali-boutique',
      name: 'The Himalayan Castle Resort & Spa, Old Manali',
      rating: 4.8,
      review_count: 1120,
      category: 'boutique',
      location: 'Hadimba Road, Manali',
      room_type: `${numRooms}x Premier Cedar Mountain Suite (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Snow View Balconies', 'Heated Wooden Rooms', 'Buffet Breakfast', 'Bonfire & Barbecue', 'Wi-Fi'],
      why_it_matches: 'Gothic castle design surrounded by apple orchards and towering deodar cedars overlooking Pir Panjal peaks.',
      hero_image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      badge: 'best_match',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    const cheapRate = 2800;
    options.push({
      id: 'acc-manali-budget',
      name: 'Solang Pine Valley Heritage Homestay',
      rating: 4.6,
      review_count: 450,
      category: 'homestay',
      location: 'Solang Valley Road, Manali',
      room_type: `${numRooms}x Alpine Wooden Family Suite`,
      price_per_night: cheapRate * numRooms,
      total_price: cheapRate * numRooms * nights,
      nights,
      amenities: ['Home-Cooked Meals', 'Scenic Balcony', 'Free Wi-Fi', 'Heater on Request'],
      why_it_matches: 'Warm local Himachali family hospitality with serene mountain river sounds and substantial savings.',
      hero_image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      badge: 'cheapest',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    const luxRate = 13500;
    options.push({
      id: 'acc-manali-luxury',
      name: 'Span Resort & Spa, Riverside Beas',
      rating: 4.9,
      review_count: 1600,
      category: 'luxury',
      location: 'Baragarh Estate, Manali Highway',
      room_type: `${numRooms}x Grand Royal Riverfront Suite`,
      price_per_night: luxRate * numRooms,
      total_price: luxRate * numRooms * nights,
      nights,
      amenities: ['Private Helipad', 'Riverfront Heated Pool', 'Luxury Spa', 'Fine Dining Gourmet Kitchen'],
      why_it_matches: '5-Star luxury mountain estate spanning pristine acres along the Beas river.',
      hero_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
      badge: 'luxury',
      booking_url: 'https://www.makemytrip.com/hotels',
    });
  } else if (lowerDest.includes('puri') || lowerDest.includes('jagannath') || lowerDest.includes('odisha')) {
    // 1. Best Match: Mayfair Waves & Heritage Puri Beachfront Resort
    const baseRate = 5400;
    options.push({
      id: 'acc-puri-boutique',
      name: 'Mayfair Waves Beachfront Resort & Spa, Puri',
      rating: 4.8,
      review_count: 2450,
      category: 'boutique',
      location: 'Chakratirtha Road, Sea Beach, Puri',
      room_type: `${numRooms}x Ocean View Deluxe Room (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Direct Blue Flag Beach Access', 'Buffet Breakfast Included', 'Outdoor Sea-View Pool', 'Ayurvedic Spa', 'Free Wi-Fi'],
      why_it_matches: 'Top-rated seaside boutique resort right on Golden Beach with tranquil gardens, swimming pool, and direct access to morning beach strolls.',
      hero_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'best_match',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 2. Cheapest: Puri Heritage Sea View Homestay & Guest House
    const cheapRate = 1800;
    options.push({
      id: 'acc-puri-homestay',
      name: 'Puri Heritage Sea View Homestay & Guest House',
      rating: 4.6,
      review_count: 510,
      category: 'homestay',
      location: 'Near Swargadwar Sea Face, Puri',
      room_type: `${numRooms}x Family Ocean Breeze Suite`,
      price_per_night: cheapRate * numRooms,
      total_price: cheapRate * numRooms * nights,
      nights,
      amenities: ['Home-Cooked Odia Breakfast', 'Balcony with Sea Breeze', 'High-Speed Wi-Fi', '24/7 Hot Water', 'Temple Guide Assistance'],
      why_it_matches: 'Comfortable family homestay saving over 60% on stay costs with warm local host guidance for temple darshan and dining.',
      hero_image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'cheapest',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 3. Luxury: Hans Coco Palms Luxury Heritage Beach Resort
    const luxRate = 11000;
    options.push({
      id: 'acc-puri-luxury',
      name: 'The Hans Coco Palms Heritage Beach Sanctuary, Puri',
      rating: 4.9,
      review_count: 1890,
      category: 'luxury',
      location: 'Swargadwar Sea Face, Puri',
      room_type: `${numRooms}x Royal Heritage Ocean Suite`,
      price_per_night: luxRate * numRooms,
      total_price: luxRate * numRooms * nights,
      nights,
      amenities: ['Private Beachfront Cabanas', 'Multi-Cuisine Seafood Restaurant', 'Signature Ayurvedic Wellness Center', 'Live Odissi Recitals'],
      why_it_matches: 'Former retreat of Odishan royalty converted into a 5-star colonial beach estate surrounded by coconut palm groves.',
      hero_image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      badge: 'luxury',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    // 4. Split Stay / Cluster B: Lotus Eco Beach Resort, Konark Marine Drive (For distant day excursions > 5km from Puri Beach)
    const splitRate = 4800;
    options.push({
      id: 'acc-puri-konark-split',
      name: 'Lotus Eco Beach Resort & Marine Sanctuary, Konark Marine Drive',
      rating: 4.7,
      review_count: 920,
      category: 'boutique',
      location: 'Konark Marine Drive & Chandrabhaga Beach, Odisha',
      room_type: `${numRooms}x Eco-Luxury Pine Cottage (${travelers} Guests)`,
      price_per_night: splitRate * numRooms,
      total_price: splitRate * numRooms * nights,
      nights,
      amenities: ['Direct Chandrabhaga Beach Access', 'Ayurvedic Wellness Spa', 'Organic Odia Restaurant', 'Water Sports Desk', 'Free Wi-Fi'],
      why_it_matches: 'Strategically located along the Konark Marine Drive & Chilika Lagoon reach (>30 km from Puri), reducing transit time for Sun Temple and dolphin boat safaris.',
      hero_image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
      ],
      badge: 'best_rated',
      booking_url: 'https://www.makemytrip.com/hotels',
    });
  } else if (lowerDest.includes('bali') || lowerDest.includes('ubud') || lowerDest.includes('seminyak')) {
    // 1. Best Match: Maya Ubud Resort & River Valley Spa
    const baseRate = 7800;
    options.push({
      id: 'acc-bali-boutique',
      name: 'Maya Ubud Resort & Secret River Valley Sanctuary, Bali',
      rating: 4.9,
      review_count: 2340,
      category: 'boutique',
      location: 'Petanu River Valley, Peliatan, Ubud, Bali',
      room_type: `${numRooms}x Forest View Valley Suite (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Buffet Floating Breakfast Included', 'River Valley Infinity Pools', 'Balinese Spa Sanctuary', 'Free Ubud Shuttle', 'High-Speed Wi-Fi'],
      why_it_matches: 'Award-winning eco-luxury resort secluded in the lush river valley of Ubud with iconic infinity pools and Balinese architecture.',
      hero_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'best_match',
      booking_url: 'https://www.booking.com/searchresults.html?ss=Bali',
    });

    // 2. Cheapest: Traditional Balinese Garden Villa & Homestay
    const cheapRate = 2200;
    options.push({
      id: 'acc-bali-homestay',
      name: 'Pondok Prapen Balinese Garden Villa & Homestay, Ubud',
      rating: 4.7,
      review_count: 780,
      category: 'homestay',
      location: 'Hanoman Street, Ubud Cultural Center, Bali',
      room_type: `${numRooms}x Tropical Garden Family Suite`,
      price_per_night: cheapRate * numRooms,
      total_price: cheapRate * numRooms * nights,
      nights,
      amenities: ['Authentic Tropical Fruit Breakfast', 'Courtyard Swimming Pool', 'Scooter Rental Desk', 'Air Conditioning', 'Free High-Speed Wi-Fi'],
      why_it_matches: 'Cost-saving authentic family compound nestled among lotus ponds and frangipani blossoms, walking distance to Ubud Monkey Forest.',
      hero_image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'cheapest',
      booking_url: 'https://www.booking.com/searchresults.html?ss=Bali',
    });

    // 3. Luxury: AYANA Resort & Rock Bar Cliffside Estate
    const luxRate = 16000;
    options.push({
      id: 'acc-bali-luxury',
      name: 'AYANA Estate & Rock Bar Luxury Cliffside Resort, Jimbaran Bali',
      rating: 4.9,
      review_count: 4120,
      category: 'luxury',
      location: 'Karang Mas Estate, Jimbaran Cliff, Bali',
      room_type: `${numRooms}x Ocean View Cliffside Luxury Suite`,
      price_per_night: luxRate * numRooms,
      total_price: luxRate * numRooms * nights,
      nights,
      amenities: ['14 Oceanfront Pools', 'Rock Bar Priority Sunset Access', 'Private Kubu Beach Access', 'World-Class Thalassotherapy Spa'],
      why_it_matches: 'Legendary 5-star cliffside sanctuary overlooking Jimbaran Bay with sunset vistas and world-class dining.',
      hero_image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      ],
      badge: 'luxury',
      booking_url: 'https://www.booking.com/searchresults.html?ss=Bali',
    });
  } else {
    // Universal Options
    const baseRate = 5000;
    options.push({
      id: 'acc-gen-boutique',
      name: `${dest} Premium Scenic Resort & Spa`,
      rating: 4.7,
      review_count: 650,
      category: 'boutique',
      location: `Central ${dest}`,
      room_type: `${numRooms}x Deluxe Suite (${travelers} Guests)`,
      price_per_night: baseRate * numRooms,
      total_price: baseRate * numRooms * nights,
      nights,
      amenities: ['Breakfast Included', 'Free Wi-Fi', 'Scenic Views', 'Room Service'],
      why_it_matches: `Top-rated centrally located stay in ${dest} tailored for your family duration.`,
      hero_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      badge: 'best_match',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    options.push({
      id: 'acc-gen-budget',
      name: `${dest} Cozy Heritage Homestay`,
      rating: 4.5,
      review_count: 320,
      category: 'budget',
      location: `Scenic outskirts of ${dest}`,
      room_type: `${numRooms}x Standard Family Room`,
      price_per_night: 2500 * numRooms,
      total_price: 2500 * numRooms * nights,
      nights,
      amenities: ['Breakfast Included', 'Wi-Fi', 'Local Host Guidance'],
      why_it_matches: 'Cost-saving stay with comfortable beds and authentic hospitality.',
      hero_image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      badge: 'cheapest',
      booking_url: 'https://www.makemytrip.com/hotels',
    });

    options.push({
      id: 'acc-gen-lux',
      name: `Grand Palace & Spa ${dest}`,
      rating: 4.9,
      review_count: 1100,
      category: 'luxury',
      location: `Prime location in ${dest}`,
      room_type: `${numRooms}x Royal Executive Suite`,
      price_per_night: 11000 * numRooms,
      total_price: 11000 * numRooms * nights,
      nights,
      amenities: ['Luxury Spa', 'Fine Dining', 'Infinity Pool', 'Concierge Service'],
      why_it_matches: '5-Star luxury resort experience with premier service.',
      hero_image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      badge: 'luxury',
      booking_url: 'https://www.makemytrip.com/hotels',
    });
  }

  let selected = options[0];
  if (budgetTier === 'budget') {
    const cheap = options.find((o) => o.badge === 'cheapest');
    if (cheap) selected = cheap;
  } else if (budgetTier === 'luxury') {
    const lux = options.find((o) => o.badge === 'luxury' || o.badge === 'best_rated');
    if (lux) selected = lux;
  } else if (targetBudget > 0) {
    // If targetBudget is strict (e.g. ₹80,000 for a long trip), verify if boutique stay total exceeds 60% of budget
    const affordableOption = options.find((o) => o.total_price <= targetBudget * 0.65) || options.find((o) => o.badge === 'cheapest');
    if (affordableOption && selected.total_price > targetBudget * 0.65) {
      selected = affordableOption;
    }
  }

  const alternatives = options.filter((o) => o.id !== selected.id);
  return { selected, alternatives };
}

function calculateCostBreakdown(
  transport: TransportBookingOption,
  accommodation: AccommodationOption,
  itinerary: ItineraryItem[],
  travelers: number,
  targetBudget: number
): CostBreakdown {
  const transportCost = transport.total_price || 0;
  const accommodationCost = accommodation.total_price || 0;
  const activitiesCost = itinerary
    .filter((i) => ['activity', 'sightseeing', 'leisure', 'meal'].includes(i.item_type) && (i.cost || 0) > 0)
    .reduce((sum, i) => sum + (i.cost || 0), 0);
  
  const estimatedDays = itinerary.length > 0 ? Math.max(1, Math.ceil(itinerary.length / 3)) : 6;
  
  let mealsAndOther = Math.round(travelers * 450 * estimatedDays);
  if (targetBudget > 0) {
    const fixedDirectCosts = transportCost + accommodationCost + activitiesCost;
    if (fixedDirectCosts + mealsAndOther > targetBudget) {
      mealsAndOther = Math.max(0, targetBudget - fixedDirectCosts);
    }
  }

  const finalTotal = transportCost + accommodationCost + activitiesCost + mealsAndOther;
  const remaining = Math.max(0, targetBudget - finalTotal);

  return {
    transport: transportCost,
    accommodation: accommodationCost,
    activities: activitiesCost,
    food_and_other: mealsAndOther,
    total: finalTotal,
    target_budget: targetBudget,
    remaining_budget: remaining,
    is_under_budget: targetBudget > 0 ? finalTotal <= targetBudget : true,
  };
}

// ----------------------------------------------------
// Geographic 5km Radius Split Stay Resolver
// ----------------------------------------------------
function resolveDailySplitAccommodations(params: {
  destName: string;
  duration: number;
  selectedAccommodation: AccommodationOption;
  alternatives: AccommodationOption[];
  rawItinerary?: ItineraryItem[];
}): Array<{ day_number: number; hotel: AccommodationOption; alternatives: AccommodationOption[] }> {
  const { destName, duration, selectedAccommodation, alternatives, rawItinerary = [] } = params;
  const lowerDest = destName.toLowerCase();
  const numNights = Math.max(1, duration - 1);
  const dailyAccommodations: Array<{ day_number: number; hotel: AccommodationOption; alternatives: AccommodationOption[] }> = [];

  // Check if an alternative split-stay resort exists for outlying excursions (>5km)
  const splitResort = alternatives.find(
    (a) => a.id.includes('split') || a.id.includes('konark') || a.name.toLowerCase().includes('lotus') || a.name.toLowerCase().includes('mirik') || a.name.toLowerCase().includes('naggar') || a.name.toLowerCase().includes('south')
  );

  for (let d = 1; d <= numNights; d++) {
    // Check if day d involves distant excursions (>5km from Basecamp)
    const dayItems = rawItinerary.filter((i) => i.day_number === d);
    const hasDistantTrip = dayItems.some((item) => {
      const text = `${item.title} ${item.location} ${item.description}`.toLowerCase();
      return (
        text.includes('konark') ||
        text.includes('chandrabhaga') ||
        text.includes('chilika') ||
        text.includes('satapada') ||
        text.includes('dolphin') ||
        text.includes('mirik') ||
        text.includes('kurseong') ||
        text.includes('naggar') ||
        text.includes('solang') ||
        text.includes('palolem') ||
        text.includes('dudhsagar') ||
        text.includes('pahalgam') ||
        text.includes('gulmarg')
      );
    }) || (lowerDest.includes('puri') && (d === 4 || d === 5)) || (lowerDest.includes('darjeeling') && (d === 4 || d === 5)) || (lowerDest.includes('manali') && d === 4);

    if (hasDistantTrip && splitResort) {
      // Allocate Cluster B resort to avoid long round-trip commutes
      dailyAccommodations.push({
        day_number: d,
        hotel: splitResort,
        alternatives: [selectedAccommodation, ...alternatives.filter((a) => a.id !== splitResort.id)],
      });
    } else {
      // Allocate Basecamp Hotel A
      dailyAccommodations.push({
        day_number: d,
        hotel: selectedAccommodation,
        alternatives: alternatives,
      });
    }
  }

  return dailyAccommodations;
}

// ----------------------------------------------------
// Itinerary Generation Engine (Non-Repetitive & Full Duration)
// ----------------------------------------------------
function generateCanonicalItinerary(params: {
  tripId: string;
  destName: string;
  durationDays: number;
  travelers: number;
  transport: TransportBookingOption;
  accommodation: AccommodationOption;
  budgetTier?: 'budget' | 'moderate' | 'luxury';
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
}): { itinerary: ItineraryItem[] } {
  const itinerary = validateAndEnforceItinerary({
    tripId: params.tripId,
    destName: params.destName,
    durationDays: params.durationDays,
    startDate: params.startDate,
    endDate: params.endDate,
    transport: params.transport,
    accommodation: params.accommodation,
    travelerCount: params.travelers,
    budgetTier: params.budgetTier || 'moderate',
    totalBudget: params.totalBudget,
  });

  return { itinerary };
}

// ----------------------------------------------------
// Canonical Trip State Builder
// ----------------------------------------------------
function buildCanonicalTrip(params: {
  tripId?: string;
  destination: string;
  origin?: string | null;
  travelers?: number | null;
  travel_type?: 'solo' | 'couple' | 'family' | 'friends' | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  duration_days?: number | null;
  budget?: number | null;
  currency?: string;
  preferences?: any;
}): any {
  const destObj = getOrCreateDestination(params.destination);
  const newTripId = params.tripId || `trp-${Date.now()}`;
  const duration = params.duration_days && params.duration_days > 0 ? params.duration_days : 6;
  const travelersCount = params.travelers && params.travelers > 0 ? params.travelers : 4;
  const travelType = params.travel_type || 'family';
  const targetBudget = params.budget && params.budget > 0 ? params.budget : 90000;
  const currency = params.currency || 'INR';

  // Dates handling
  const startDate = params.start_date || '2026-09-21';
  const endDate = params.end_date || '2026-09-26';
  const formattedDates = params.formatted_dates || 'Sep 21, 2026 – Sep 26, 2026';

  // 1. Resolve Transport Options
  const { selected: selectedTransport, alternatives: transportAlternatives } = resolveTransportOptions({
    origin: params.origin || 'Mumbai',
    destination: destObj.name,
    startDate,
    travelers: travelersCount,
    targetBudget,
    preference: params.preferences?.transport_preference,
  });

  // 2. Resolve Accommodation Options
  const { selected: selectedAccommodation, alternatives: accommodationAlternatives } = resolveAccommodationOptions({
    destination: destObj.name,
    nights: Math.max(1, duration - 1),
    travelers: travelersCount,
    budgetTier: params.preferences?.budget_tier || 'moderate',
    targetBudget,
  });

  // 3. Generate Day-by-Day Itinerary (Guaranteed Full Duration & Non-Repetitive)
  const { itinerary } = generateCanonicalItinerary({
    tripId: newTripId,
    destName: destObj.name,
    durationDays: duration,
    travelers: travelersCount,
    transport: selectedTransport,
    accommodation: selectedAccommodation,
    budgetTier: params.preferences?.budget_tier || 'moderate',
    startDate,
    endDate,
    totalBudget: targetBudget,
  });

  // 2b. Compute Multi-Hotel 5km Radius Split Allocations based on itinerary destinations
  const dailyAccommodations = resolveDailySplitAccommodations({
    destName: destObj.name,
    duration,
    selectedAccommodation,
    alternatives: accommodationAlternatives,
    rawItinerary: itinerary,
  });

  const totalStayCost = dailyAccommodations.reduce((sum, d) => sum + (d.hotel?.price_per_night || 0), 0);
  const effectiveAccommodation = {
    ...selectedAccommodation,
    total_price: totalStayCost > 0 ? totalStayCost : selectedAccommodation.total_price,
  };

  // 4. Calculate Canonical Cost Breakdown with strict Hard-Capped Budget Engine
  const costBreakdown = calculateCostBreakdown(
    selectedTransport,
    effectiveAccommodation,
    itinerary,
    travelersCount,
    targetBudget
  );

  const trip: any = {
    id: newTripId,
    user_id: 'usr-traveler-001',
    destination_id: destObj.id,
    title: `${duration}-Day ${travelType.charAt(0).toUpperCase() + travelType.slice(1)} Trip to ${destObj.name}`,
    status: 'planning',
    origin: params.origin || 'Mumbai',
    start_date: startDate,
    end_date: endDate,
    formatted_dates: formattedDates,
    is_dates_confirmed: true,
    duration_days: duration,
    total_budget: targetBudget,
    total_cost: costBreakdown.total,
    currency,
    traveler_count: travelersCount,
    travel_type: travelType,
    pace: 'balanced',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    destination: destObj,
    selected_transport: selectedTransport,
    transport_alternatives: transportAlternatives,
    selected_accommodation: selectedAccommodation,
    accommodation_alternatives: accommodationAlternatives,
    daily_accommodations: dailyAccommodations,
    cost_breakdown: costBreakdown,
    preferences: {
      id: `pref-${newTripId}`,
      trip_id: newTripId,
      budget_tier: params.preferences?.budget_tier || 'moderate',
      interests: params.preferences?.interests || ['scenic_views', 'culture', 'nature', 'sightseeing'],
      travel_companions: travelType,
      accommodation_types: [selectedAccommodation.category],
      transport_preferences: [selectedTransport.mode],
      dietary_requirements: [],
      special_requests: `Origin: ${params.origin || 'Mumbai'}. Dates: ${formattedDates}. Budget: ₹${targetBudget.toLocaleString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    itinerary,
    bookings: [
      {
        id: `bkg-${newTripId}-trans`,
        trip_id: newTripId,
        booking_reference: `TF-TRN-${Math.floor(1000 + Math.random() * 9000)}`,
        item_type: 'transport',
        amount: selectedTransport.total_price,
        currency,
        status: 'confirmed',
        payment_status: 'paid',
        booking_date: new Date().toISOString(),
      },
      {
        id: `bkg-${newTripId}-hotel`,
        trip_id: newTripId,
        booking_reference: `TF-HTL-${Math.floor(1000 + Math.random() * 9000)}`,
        item_type: 'hotel',
        amount: selectedAccommodation.total_price,
        currency,
        status: 'confirmed',
        payment_status: 'paid',
        booking_date: new Date().toISOString(),
      },
    ],
    alerts: [
      {
        id: `alt-${newTripId}-1`,
        trip_id: newTripId,
        alert_type: 'weather',
        severity: 'info',
        title: `Optimal Weather & Schedule for ${destObj.name}`,
        description: `High-altitude viewpoints and scenic transfers scheduled during peak daylight and clear visibility hours.`,
        is_resolved: false,
        created_at: new Date().toISOString(),
      },
    ],
    notifications: [
      {
        id: `notif-${newTripId}-1`,
        trip_id: newTripId,
        user_id: 'usr-traveler-001',
        title: 'Trip Initialized with Verified Data',
        message: `Your ${duration}-day journey to ${destObj.name} is configured for ${travelersCount} travelers (${formattedDates}) with a budget target of ₹${targetBudget.toLocaleString()}.`,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ],
    change_history: [
      {
        id: `chg-${newTripId}-1`,
        trip_id: newTripId,
        changed_by: 'ai',
        action: 'trip_created',
        field_changed: 'all',
        new_value: `${destObj.name}, ${formattedDates}, ${travelersCount} travelers, ₹${targetBudget.toLocaleString()}`,
        reason: 'Initialized via TourFlow AI parsing user input as absolute source of truth',
        timestamp: new Date().toISOString(),
      },
    ],
    reviews: [],
    packing_items: [
      { id: 'p1', category: 'Clothing & Layers', text: 'Comfortable mountain/coastal walking footwear & extra socks', checked: true },
      { id: 'p2', category: 'Clothing & Layers', text: 'Light thermal/wind jacket or breathable linen shirts', checked: true },
      { id: 'p3', category: 'Essentials & Tech', text: 'Government ID cards (Aadhaar / Passports) for all travelers', checked: true },
      { id: 'p4', category: 'Essentials & Tech', text: 'High-speed camera & power banks (10,000mAh+)', checked: false },
      { id: 'p5', category: 'Health & Wellness', text: 'Personal medication kit (Motion sickness, Paracetamol, Band-aids)', checked: true },
      { id: 'p6', category: 'Health & Wellness', text: 'UV Sunscreen SPF 50+ & Hydrating Lip Balm', checked: false },
      { id: 'p7', category: 'Accessories', text: 'Polarized Sunglasses & compact foldable daypack (20L)', checked: false },
    ],
    expenses: [
      { id: 'e1', title: `${selectedTransport.operator} (${selectedTransport.mode.toUpperCase()})`, amount: selectedTransport.total_price, paidBy: `Traveler 1` },
      { id: 'e2', title: `${selectedAccommodation.name} (${Math.max(1, duration - 1)} Nights)`, amount: selectedAccommodation.total_price, paidBy: `Traveler 2` },
      { id: 'e3', title: `Curated Sightseeing & Activities Passes`, amount: costBreakdown.activities, paidBy: `Traveler 1` },
      { id: 'e4', title: `Food, Meals & Incidental Reserve`, amount: costBreakdown.food_and_other, paidBy: `Traveler 2` },
    ],
  };

  return trip;
}

async function buildCanonicalTripAsync(params: {
  tripId?: string;
  destination: string;
  origin?: string | null;
  travelers?: number | null;
  travel_type?: 'solo' | 'couple' | 'family' | 'friends' | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  duration_days?: number | null;
  budget?: number | null;
  currency?: string;
  preferences?: any;
}): Promise<any> {
  const destObj = getOrCreateDestination(params.destination);
  const newTripId = params.tripId || `trp-${Date.now()}`;
  const duration = params.duration_days && params.duration_days > 0 ? params.duration_days : 6;
  const travelersCount = params.travelers && params.travelers > 0 ? params.travelers : 4;
  const travelType = params.travel_type || 'family';
  const targetBudget = params.budget && params.budget > 0 ? params.budget : 90000;
  const currency = params.currency || 'INR';

  // Dates handling
  const startDate = params.start_date || '2026-09-21';
  const endDate = params.end_date || '2026-09-26';
  const formattedDates = params.formatted_dates || 'Sep 21, 2026 – Sep 26, 2026';

  // 1. Resolve Transport Options
  const { selected: selectedTransport, alternatives: transportAlternatives } = resolveTransportOptions({
    origin: params.origin || 'Mumbai',
    destination: destObj.name,
    startDate,
    travelers: travelersCount,
    targetBudget,
    preference: params.preferences?.transport_preference,
  });

  // 2. Resolve Accommodation Options
  const { selected: selectedAccommodation, alternatives: accommodationAlternatives } = resolveAccommodationOptions({
    destination: destObj.name,
    nights: Math.max(1, duration - 1),
    travelers: travelersCount,
    budgetTier: params.preferences?.budget_tier || 'moderate',
    targetBudget,
  });

  const numNights = Math.max(1, duration - 1);
  const dailyAccommodations = [];
  for (let d = 1; d <= numNights; d++) {
    dailyAccommodations.push({
      day_number: d,
      hotel: selectedAccommodation,
      alternatives: accommodationAlternatives,
    });
  }

  // 3. Generate Day-by-Day Itinerary via Itinerary Service
  const itinerary = await itineraryService.generateItinerary({
    tripId: newTripId,
    destName: destObj.name,
    durationDays: duration,
    startDate,
    endDate,
    travelerCount: travelersCount,
    travelType,
    totalBudget: targetBudget,
    origin: params.origin || 'Mumbai',
    transport: selectedTransport,
    accommodation: selectedAccommodation,
    dailyAccommodations,
    interests: params.preferences?.interests,
    budgetTier: params.preferences?.budget_tier || 'moderate',
  });

  // 3b. Compute Multi-Hotel 5km Radius Split Allocations
  const finalDailyAccommodations = resolveDailySplitAccommodations({
    destName: destObj.name,
    duration,
    selectedAccommodation,
    alternatives: accommodationAlternatives,
    rawItinerary: itinerary,
  });

  const totalStayCostAsync = finalDailyAccommodations.reduce((sum, d) => sum + (d.hotel?.price_per_night || 0), 0);
  const effectiveAccommodationAsync = {
    ...selectedAccommodation,
    total_price: totalStayCostAsync > 0 ? totalStayCostAsync : selectedAccommodation.total_price,
  };

  // 4. Calculate Canonical Cost Breakdown with strict Hard-Capped Budget Engine
  const costBreakdown = calculateCostBreakdown(
    selectedTransport,
    effectiveAccommodationAsync,
    itinerary,
    travelersCount,
    targetBudget
  );

  const trip: any = {
    id: newTripId,
    user_id: 'usr-traveler-001',
    destination_id: destObj.id,
    title: `${duration}-Day ${travelType.charAt(0).toUpperCase() + travelType.slice(1)} Trip to ${destObj.name}`,
    status: 'planning',
    origin: params.origin || 'Mumbai',
    start_date: startDate,
    end_date: endDate,
    formatted_dates: formattedDates,
    is_dates_confirmed: true,
    duration_days: duration,
    total_budget: targetBudget,
    total_cost: costBreakdown.total,
    currency,
    traveler_count: travelersCount,
    travel_type: travelType,
    pace: 'balanced',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    destination: destObj,
    selected_transport: selectedTransport,
    transport_alternatives: transportAlternatives,
    selected_accommodation: effectiveAccommodationAsync,
    accommodation_alternatives: accommodationAlternatives,
    daily_accommodations: finalDailyAccommodations,
    cost_breakdown: costBreakdown,
    preferences: {
      id: `pref-${newTripId}`,
      trip_id: newTripId,
      budget_tier: params.preferences?.budget_tier || 'moderate',
      interests: params.preferences?.interests || ['scenic_views', 'culture', 'nature', 'sightseeing'],
      travel_companions: travelType,
      accommodation_types: [selectedAccommodation.category],
      transport_preferences: [selectedTransport.mode],
      dietary_requirements: [],
      special_requests: `Origin: ${params.origin || 'Mumbai'}. Dates: ${formattedDates}. Budget: ₹${targetBudget.toLocaleString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    itinerary,
    bookings: [
      {
        id: `bkg-${newTripId}-trans`,
        trip_id: newTripId,
        booking_reference: `TF-TRN-${Math.floor(1000 + Math.random() * 9000)}`,
        item_type: 'transport',
        amount: selectedTransport.total_price,
        currency,
        status: 'confirmed',
        payment_status: 'paid',
        booking_date: new Date().toISOString(),
      },
      {
        id: `bkg-${newTripId}-hotel`,
        trip_id: newTripId,
        booking_reference: `TF-HTL-${Math.floor(1000 + Math.random() * 9000)}`,
        item_type: 'hotel',
        amount: selectedAccommodation.total_price,
        currency,
        status: 'confirmed',
        payment_status: 'paid',
        booking_date: new Date().toISOString(),
      },
    ],
    alerts: [
      {
        id: `alt-${newTripId}-1`,
        trip_id: newTripId,
        alert_type: 'weather',
        severity: 'info',
        title: `Optimal Weather & Schedule for ${destObj.name}`,
        description: `High-altitude viewpoints and scenic transfers scheduled during peak daylight and clear visibility hours.`,
        is_resolved: false,
        created_at: new Date().toISOString(),
      },
    ],
    notifications: [
      {
        id: `notif-${newTripId}-1`,
        trip_id: newTripId,
        user_id: 'usr-traveler-001',
        title: 'Trip Initialized with Verified Data',
        message: `Your ${duration}-day journey to ${destObj.name} is configured for ${travelersCount} travelers (${formattedDates}) with a budget target of ₹${targetBudget.toLocaleString()}.`,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ],
    change_history: [
      {
        id: `chg-${newTripId}-1`,
        trip_id: newTripId,
        changed_by: 'ai',
        action: 'trip_created',
        field_changed: 'all',
        new_value: `${destObj.name}, ${formattedDates}, ${travelersCount} travelers, ₹${targetBudget.toLocaleString()}`,
        reason: 'Initialized via TourFlow AI with zero activity repetition and optimal timing',
        timestamp: new Date().toISOString(),
      },
    ],
    reviews: [],
    packing_items: [
      { id: 'p1', category: 'Clothing & Layers', text: 'Comfortable mountain/coastal walking footwear & extra socks', checked: true },
      { id: 'p2', category: 'Clothing & Layers', text: 'Light thermal/wind jacket or breathable linen shirts', checked: true },
      { id: 'p3', category: 'Essentials & Tech', text: 'Government ID cards (Aadhaar / Passports) for all travelers', checked: true },
      { id: 'p4', category: 'Essentials & Tech', text: 'High-speed camera & power banks (10,000mAh+)', checked: false },
      { id: 'p5', category: 'Health & Wellness', text: 'Personal medication kit (Motion sickness, Paracetamol, Band-aids)', checked: true },
      { id: 'p6', category: 'Health & Wellness', text: 'UV Sunscreen SPF 50+ & Hydrating Lip Balm', checked: false },
      { id: 'p7', category: 'Accessories', text: 'Polarized Sunglasses & compact foldable daypack (20L)', checked: false },
    ],
    expenses: [
      { id: 'e1', title: `${selectedTransport.operator} (${selectedTransport.mode.toUpperCase()})`, amount: selectedTransport.total_price, paidBy: `Traveler 1` },
      { id: 'e2', title: `${selectedAccommodation.name} (${Math.max(1, duration - 1)} Nights)`, amount: selectedAccommodation.total_price, paidBy: `Traveler 2` },
      { id: 'e3', title: `Curated Sightseeing & Activities Passes`, amount: costBreakdown.activities, paidBy: `Traveler 1` },
      { id: 'e4', title: `Food, Meals & Incidental Reserve`, amount: costBreakdown.food_and_other, paidBy: `Traveler 2` },
    ],
  };

  return trip;
}

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'TourFlow AI Engine',
    version: '2.5.0',
    database: 'connected',
    counts: {
      destinations: destinationsCatalog.length,
      trips: tripsStore.length,
    },
    ai_engine: {
      gemini_available: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.7-flash',
    },
  });
});

app.get('/api/destinations', (req: Request, res: Response) => {
  const { featured_only } = req.query;
  if (featured_only === 'true') {
    return res.json(destinationsCatalog.filter((d) => d.is_featured));
  }
  return res.json(destinationsCatalog);
});

app.get('/api/destinations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const dest = destinationsCatalog.find((d) => d.id === id || d.slug === id);
  if (!dest) return res.status(404).json({ detail: 'Destination not found' });
  return res.json(dest);
});

// Dynamic Hotel Catalog Endpoint
app.get('/api/hotels', (req: Request, res: Response) => {
  const destIdOrName = (req.query.destination_id as string) || (req.query.destination as string) || '';
  const category = (req.query.category as string) || '';
  let dest = 'Darjeeling';
  if (destIdOrName) {
    const found = destinationsCatalog.find((d) => d.id === destIdOrName || d.slug === destIdOrName || d.name.toLowerCase() === destIdOrName.toLowerCase());
    dest = found ? found.name : destIdOrName;
  }
  
  const { selected, alternatives } = resolveAccommodationOptions({
    destination: dest,
    nights: 4,
    travelers: 2,
    budgetTier: 'moderate',
  });
  
  const allAccoms = [selected, ...alternatives].filter(Boolean);
  let hotelsList: any[] = allAccoms.map((acc, idx) => ({
    id: acc.id,
    destination_id: destIdOrName || 'dest-all',
    vendor_id: `vnd-htl-${idx + 1}`,
    name: acc.name,
    category: acc.category,
    price_per_night: acc.price_per_night,
    currency: 'INR',
    rating: acc.rating,
    address: acc.location,
    amenities: acc.amenities,
    images: acc.images && acc.images.length > 0 ? acc.images : [acc.hero_image],
    description: acc.why_it_matches,
    is_active: true,
  }));
  
  if (category) {
    hotelsList = hotelsList.filter((h) => h.category === category);
  }
  return res.json(hotelsList);
});

// Dynamic Activities Catalog Endpoint
app.get('/api/activities', (req: Request, res: Response) => {
  const destIdOrName = (req.query.destination_id as string) || (req.query.destination as string) || '';
  const category = (req.query.category as string) || '';
  let dest = 'Darjeeling';
  if (destIdOrName) {
    const found = destinationsCatalog.find((d) => d.id === destIdOrName || d.slug === destIdOrName || d.name.toLowerCase() === destIdOrName.toLowerCase());
    dest = found ? found.name : destIdOrName;
  }

  const rawOptions = getPossibleOptionsForDestination(dest);
  let activitiesList = rawOptions.map((opt, idx) => ({
    id: opt.id,
    destination_id: destIdOrName || 'dest-all',
    vendor_id: `vnd-act-${idx + 1}`,
    title: opt.title,
    category: opt.category,
    duration_hours: opt.duration ? parseFloat(opt.duration.replace(/[^0-9.]/g, '')) || 2.5 : 2.5,
    price_per_person: opt.cost,
    currency: 'INR',
    difficulty_level: opt.walking_intensity === 'high' ? 'demanding' : opt.walking_intensity === 'moderate' ? 'moderate' : 'easy',
    rating: 4.8,
    images: [opt.image_url],
    description: opt.description,
    meeting_point: opt.location,
    is_active: true,
  }));

  if (category) {
    activitiesList = activitiesList.filter((a) => a.category === category);
  }
  return res.json(activitiesList);
});

// Dynamic Transport Catalog Endpoint
app.get('/api/transport', (req: Request, res: Response) => {
  const destIdOrName = (req.query.destination_id as string) || (req.query.destination as string) || '';
  const type = (req.query.type as string) || '';
  let dest = 'Darjeeling';
  if (destIdOrName) {
    const found = destinationsCatalog.find((d) => d.id === destIdOrName || d.slug === destIdOrName || d.name.toLowerCase() === destIdOrName.toLowerCase());
    dest = found ? found.name : destIdOrName;
  }

  const { selected, alternatives } = computeLiveTransportOptions({
    origin: 'Mumbai',
    destination: dest,
    startDate: '2026-09-21',
    travelers: 2,
    targetBudget: 90000,
  });

  const allTransports = [selected, ...alternatives].filter(Boolean);
  let transportList = allTransports.map((t, idx) => ({
    id: t.id,
    destination_id: destIdOrName || 'dest-all',
    vendor_id: `vnd-trn-${idx + 1}`,
    type: t.mode === 'flight' ? 'flight' : t.mode === 'train' ? 'train' : 'private_cab',
    name: `${t.operator} - ${t.title}`,
    route_from: t.origin_city,
    route_to: t.destination_city,
    duration_hours: parseFloat(t.duration_str.replace(/[^0-9.]/g, '')) || 4.5,
    price: t.total_price,
    currency: 'INR',
    capacity: 4,
    features: [t.route_summary, t.badge, t.verification_label],
    is_active: true,
  }));

  if (type) {
    transportList = transportList.filter((t) => t.type === type);
  }
  return res.json(transportList);
});

app.post('/api/trips', async (req: Request, res: Response) => {
  const payload = req.body;
  const destinationName = (typeof payload.destination === 'string' ? payload.destination : payload.destination?.name) || payload.destination_name || payload.destinationName || 'Darjeeling';
  
  const newTrip = await buildCanonicalTripAsync({
    destination: destinationName,
    origin: payload.origin || 'Mumbai',
    travelers: payload.traveler_count || payload.travelers || 2,
    travel_type: payload.travel_type || 'couple',
    start_date: payload.start_date || '2026-09-21',
    end_date: payload.end_date || '2026-09-26',
    formatted_dates: payload.formatted_dates || 'Sep 21, 2026 – Sep 26, 2026',
    duration_days: payload.duration_days || payload.duration || 6,
    budget: payload.total_budget || payload.budget || 90000,
    currency: payload.currency || 'INR',
    preferences: payload.preferences,
  });

  tripsStore.unshift(newTrip);
  tripsVersion = Date.now();
  res.status(201).json(newTrip);
});

app.get('/api/trips', (req: Request, res: Response) => {
  const { status, destination_id, operator_id, search } = req.query;
  let list = [...tripsStore];

  if (status && typeof status === 'string') {
    list = list.filter((t) => t.status === status);
  }
  if (destination_id && typeof destination_id === 'string') {
    list = list.filter((t) => t.destination_id === destination_id || t.destination?.id === destination_id);
  }
  if (operator_id && typeof operator_id === 'string') {
    list = list.filter((t) => t.operator_id === operator_id || t.operator_name?.toLowerCase().includes(operator_id.toLowerCase()));
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter((t) => 
      t.title?.toLowerCase().includes(q) || 
      t.id?.toLowerCase().includes(q) || 
      t.destination?.name?.toLowerCase().includes(q) ||
      t.origin?.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.get('/api/trips/:id', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const trip = tripsStore.find((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001')) ||
    (idParam === 'trp-manali-1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001')) ||
    (idParam === 'trp-manali-alpine-demo-001' && (t.id === '1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (!trip) return res.status(404).json({ detail: 'Trip not found' });
  res.json(trip);
});

app.put('/api/trips/:id', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001')) ||
    (idParam === 'trp-manali-1024' && (t.id === '1024' || t.id === 'trp-manali-1024'))
  );
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const current = tripsStore[tripIndex];
  const updatedTrip = {
    ...current,
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  tripsStore[tripIndex] = updatedTrip;
  tripsVersion = Date.now();
  res.json(updatedTrip);
});

// Delete Entire Trip / Itinerary
app.delete('/api/trips/:id', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001')) ||
    (idParam === 'trp-manali-1024' && (t.id === '1024' || t.id === 'trp-manali-1024'))
  );
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const [deletedTrip] = tripsStore.splice(tripIndex, 1);
  tripsVersion = Date.now();
  res.json({
    success: true,
    message: 'Trip itinerary deleted successfully.',
    deleted_id: deletedTrip?.id || idParam,
  });
});

app.delete('/api/itineraries/:id', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => t.id === idParam);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Itinerary not found' });

  const [deletedTrip] = tripsStore.splice(tripIndex, 1);
  tripsVersion = Date.now();
  res.json({
    success: true,
    message: 'Itinerary deleted successfully.',
    deleted_id: deletedTrip?.id || idParam,
  });
});

// Deterministic Disruption Scenario Trigger for Demo (e.g. Paragliding Cancelled on Day 3)
app.post('/api/trips/:id/trigger-disruption', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  
  // 1. Mark Day 3 Paragliding item as cancelled
  if (trip.itinerary) {
    trip.itinerary = trip.itinerary.map((item: any) => {
      if (item.title?.toLowerCase().includes('paragliding') || (item.day_number === 3 && item.cost >= 10000)) {
        return {
          ...item,
          status: 'cancelled',
          meta_data: {
            ...item.meta_data,
            cancellation_reason: 'Severe alpine wind shear exceeding 35 km/h safety limits',
            cancelled_at: new Date().toISOString(),
          },
        };
      }
      return item;
    });
  }

  // 2. Mark booking as pending cancellation / suspended
  if (trip.bookings) {
    trip.bookings = trip.bookings.map((b: any) => {
      if (b.item_type === 'activity' && (b.amount === 14000 || b.booking_reference?.includes('ACT-8842'))) {
        return {
          ...b,
          status: 'cancelled',
        };
      }
      return b;
    });
  }

  // 3. Inject Critical Alert
  const newAlertId = `alt-disrupt-${Date.now()}`;
  const alertObj = {
    id: newAlertId,
    trip_id: trip.id,
    alert_type: 'weather',
    severity: 'critical',
    title: 'Severe Alpine Wind Shear Warning (48 km/h) at Solang Valley',
    description: 'DGCA & Himachal Tourism Authority suspended all tandem paragliding flights due to gusting wind shear. 4 travelers affected on Day 3. Operational replan required.',
    is_resolved: false,
    created_at: new Date().toISOString(),
  };

  trip.alerts = [alertObj, ...(trip.alerts?.filter((a: any) => a.id !== newAlertId) || [])];

  // 4. Log Change History
  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'operator',
      action: 'disruption_detected',
      field_changed: 'itinerary[Day 3 - Paragliding]',
      old_value: 'Solang Valley High Altitude Tandem Paragliding (Confirmed)',
      new_value: 'Grounded / Cancelled due to weather advisory',
      reason: 'Automated weather sensor feed reported 48 km/h winds at Solang launchpad',
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  // 5. Create Traveler Notification
  trip.notifications = [
    {
      id: `notif-${Date.now()}`,
      trip_id: trip.id,
      user_id: trip.user_id || 'usr-rohan-sharma-001',
      title: 'Activity Advisory: Solang Paragliding Suspended',
      message: 'Due to sudden mountain wind gusts, tandem paragliding on Day 3 is temporarily suspended. Himalayan Trails Operations is curating safe, high-rated alternative adventures for your group.',
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    ...(trip.notifications || []),
  ];

  trip.updated_at = new Date().toISOString();
  tripsStore[tripIndex] = trip;
  tripsVersion = Date.now();

  res.json({
    success: true,
    message: 'Disruption successfully triggered and synchronized to shared database.',
    trip,
  });
});

// Impact Analysis Endpoint
app.post('/api/trips/:id/impact-analysis', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const trip = tripsStore.find((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (!trip) return res.status(404).json({ detail: 'Trip not found' });

  const disruption = req.body.disruption || {
    title: 'Severe Alpine Wind Shear at Solang Valley',
    description: '48 km/h wind gusts grounding paragliding launchpad',
  };

  const analysis = computeImpactAnalysis(trip, disruption);
  res.json(analysis);
});

// AI Replanning Candidates with Gemini Engine
app.post('/api/trips/:id/ai-replan-options', async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const trip = tripsStore.find((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (!trip) return res.status(404).json({ detail: 'Trip not found' });

  const disruption = req.body.disruption || {
    title: 'Alpine Wind Shear Warning at Solang Valley',
    description: 'Paragliding grounded due to high wind speeds',
  };

  // Rank valid candidates using Gemini AI (with deterministic fallback)
  const ranked = await replanService.rankAlternatives({
    trip,
    disruption,
    candidates: manaliReplanCandidates,
  });

  res.json({
    trip_id: trip.id,
    disruption,
    total_candidates_found: ranked.length,
    candidates: ranked,
  });
});

// Apply Replan to Shared Database
app.post('/api/trips/:id/apply-replan', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => 
    t.id === idParam || 
    (idParam === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  const { alternative_id, notes } = req.body;

  const chosenAlt = manaliReplanCandidates.find((c) => c.id === alternative_id) || manaliReplanCandidates[0];

  // 1. Replace the Paragliding itinerary item with chosen alternative
  let replaced = false;
  let oldCost = 14000;
  if (trip.itinerary) {
    trip.itinerary = trip.itinerary.map((item: any) => {
      if (item.title?.toLowerCase().includes('paragliding') || (item.day_number === 3 && item.status === 'cancelled') || (item.day_number === 3 && item.cost >= 8000 && !replaced)) {
        oldCost = item.cost || 14000;
        replaced = true;
        return {
          id: `iti-1024-d3-kayak-${Date.now()}`,
          trip_id: trip.id,
          day_number: 3,
          order_index: item.order_index || 3,
          item_type: 'activity',
          title: chosenAlt.title,
          description: chosenAlt.description,
          start_time: chosenAlt.start_time,
          end_time: chosenAlt.end_time,
          cost: chosenAlt.total_price,
          status: 'confirmed',
          location: chosenAlt.location,
          image_url: chosenAlt.hero_image,
          meta_data: {
            vendor_id: chosenAlt.vendor_id,
            vendor_name: chosenAlt.vendor_name,
            match_score: chosenAlt.match_score,
            replaced_item: 'Solang Valley High Altitude Tandem Paragliding',
            replanned_by: 'Himalayan Trails Tour Operations',
            replanned_at: new Date().toISOString(),
          },
        };
      }
      return item;
    });
  }

  // 2. Update Bookings: cancel old paragliding booking and insert new booking
  const newBookingRef = `TF-ACT-${Math.floor(1000 + Math.random() * 9000)}`;
  const newBooking = {
    id: `bkg-${Date.now()}`,
    trip_id: trip.id,
    vendor_id: chosenAlt.vendor_id,
    booking_reference: newBookingRef,
    item_type: 'activity',
    amount: chosenAlt.total_price,
    currency: 'INR',
    status: 'confirmed',
    payment_status: 'paid',
    booking_date: new Date().toISOString(),
  };

  if (trip.bookings) {
    trip.bookings = trip.bookings.map((b: any) => {
      if (b.item_type === 'activity' && (b.amount === 14000 || b.booking_reference?.includes('ACT-8842'))) {
        return {
          ...b,
          status: 'cancelled',
          refund_status: 'refunded_to_package_balance',
        };
      }
      return b;
    });
    trip.bookings.push(newBooking);
  }

  // 3. Recalculate Trip Cost Breakdown
  const costDiff = oldCost - chosenAlt.total_price;
  if (trip.cost_breakdown) {
    trip.cost_breakdown.activities = Math.max(0, trip.cost_breakdown.activities - costDiff);
    trip.cost_breakdown.total = Math.max(0, trip.cost_breakdown.total - costDiff);
    trip.cost_breakdown.remaining_budget = trip.cost_breakdown.target_budget - trip.cost_breakdown.total;
    trip.cost_breakdown.is_under_budget = trip.cost_breakdown.remaining_budget >= 0;
  }
  trip.total_cost = trip.cost_breakdown?.total || (trip.total_cost - costDiff);

  // 4. Resolve the critical alert
  if (trip.alerts) {
    trip.alerts = trip.alerts.map((a: any) => {
      if (a.severity === 'critical' || a.title?.includes('Wind Shear')) {
        return {
          ...a,
          is_resolved: true,
          resolution_note: `Resolved by Operator (Himalayan Trails): Replaced with ${chosenAlt.title} (Booking ${newBookingRef}). Cost adjusted by ₹${costDiff.toLocaleString()}.`,
        };
      }
      return a;
    });
  }

  // 5. Append to Change History
  const changeEntry = {
    id: `chg-${Date.now()}`,
    trip_id: trip.id,
    changed_by: 'operator',
    action: 'ai_replan_approved',
    field_changed: 'itinerary[Day 3] & bookings',
    old_value: `Solang Valley Paragliding (₹${oldCost.toLocaleString()})`,
    new_value: `${chosenAlt.title} (₹${chosenAlt.total_price.toLocaleString()})`,
    reason: `Operator approved AI Replan: Swapped grounded paragliding with ${chosenAlt.title} (${chosenAlt.match_score}% match). ${notes || ''}`,
    timestamp: new Date().toISOString(),
  };
  trip.change_history = [changeEntry, ...(trip.change_history || [])];

  // 6. Create Traveler Notification
  const travelerNotif = {
    id: `notif-${Date.now()}`,
    trip_id: trip.id,
    user_id: trip.user_id || 'usr-rohan-sharma-001',
    title: `Itinerary Confirmed: ${chosenAlt.title}`,
    message: `Due to alpine wind conditions, Himalayan Trails Operations has confirmed ${chosenAlt.title} for your group on Day 3 (${chosenAlt.start_time} – ${chosenAlt.end_time}). Booking reference: ${newBookingRef}. Package price updated with ₹${costDiff.toLocaleString()} adjustment.`,
    type: 'success',
    is_read: false,
    created_at: new Date().toISOString(),
  };
  trip.notifications = [travelerNotif, ...(trip.notifications || [])];

  trip.updated_at = new Date().toISOString();
  tripsStore[tripIndex] = trip;
  tripsVersion = Date.now();

  res.json({
    success: true,
    message: 'Replan successfully executed across shared canonical database.',
    trip,
    summary: {
      booking_updated: true,
      itinerary_updated: true,
      price_recalculated: true,
      history_recorded: true,
      traveler_notified: true,
      new_activity: chosenAlt.title,
      cost_savings: costDiff,
      booking_reference: newBookingRef,
    },
  });
});

// Accept Incoming Trip Request & Assign Operator
app.post('/api/trips/:id/accept-request', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => t.id === idParam);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  trip.status = 'confirmed';
  trip.operator_id = 'op-himalayan-001';
  trip.operator_name = 'Himalayan Trails';
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'operator',
      action: 'request_accepted',
      field_changed: 'status',
      old_value: 'planning',
      new_value: 'confirmed',
      reason: 'Himalayan Trails accepted booking request and verified itinerary feasibility.',
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  trip.notifications = [
    {
      id: `notif-${Date.now()}`,
      trip_id: trip.id,
      user_id: trip.user_id,
      title: 'Booking Request Accepted by Himalayan Trails!',
      message: 'Your dedicated tour operator Himalayan Trails has confirmed your itinerary and commenced vendor reservations.',
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    ...(trip.notifications || []),
  ];

  tripsStore[tripIndex] = trip;
  tripsVersion = Date.now();

  res.json({
    success: true,
    message: 'Trip request accepted and assigned to Himalayan Trails.',
    trip,
  });
});

// Decline Incoming Trip Request
app.post('/api/trips/:id/decline-request', (req: Request, res: Response) => {
  const idParam = req.params.id;
  const tripIndex = tripsStore.findIndex((t) => t.id === idParam);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  trip.status = 'cancelled';
  trip.updated_at = new Date().toISOString();

  tripsStore[tripIndex] = trip;
  tripsVersion = Date.now();

  res.json({ success: true, message: 'Trip request declined.', trip });
});

// Operator Command Center Dashboard KPIs
app.get('/api/operator/dashboard', (req: Request, res: Response) => {
  const activeTours = tripsStore.filter((t) => ['ongoing', 'confirmed'].includes(t.status) && t.id !== 'trp-manali-alpine-demo-001');
  const travelersTotal = activeTours.reduce((sum, t) => sum + (t.traveler_count || 0), 0);
  const revenueTotal = activeTours.reduce((sum, t) => sum + (t.total_cost || t.total_budget || 0), 0);
  const upcomingCount = tripsStore.filter((t) => t.status === 'planning').length;

  // Flatten all unresolved alerts
  const priorityAlerts: any[] = [];
  tripsStore.forEach((t) => {
    if (t.alerts) {
      t.alerts.filter((a: any) => !a.is_resolved).forEach((a: any) => {
        priorityAlerts.push({
          ...a,
          trip_title: t.title,
          trip_id: t.id,
          traveler_count: t.traveler_count,
          origin: t.origin,
          destination_name: t.destination?.name,
        });
      });
    }
  });

  res.json({
    kpis: {
      active_tours: activeTours.length,
      travelers_on_ground: travelersTotal,
      today_activities: 14,
      urgent_issues: priorityAlerts.filter((a) => a.severity === 'critical').length,
      upcoming_trips: upcomingCount,
      total_revenue: revenueTotal,
    },
    priority_alerts: priorityAlerts,
    active_tours_table: activeTours.map((t) => ({
      id: t.id,
      title: t.title,
      route: `${t.origin || 'Origin'} → ${t.destination?.name || 'Destination'}`,
      travelers: t.traveler_count,
      travel_type: t.travel_type,
      current_day: t.id === '1024' ? 3 : t.id === '1018' ? 2 : t.id === '1012' ? 4 : 1,
      duration_days: t.duration_days,
      price: t.total_cost || t.total_budget,
      status: t.id === '1012' ? 'issue' : t.id === '1018' ? 'attention' : t.alerts?.some((a: any) => !a.is_resolved && a.severity === 'critical') ? 'issue' : 'on_track',
      status_label: t.id === '1012' ? '🔴 Issue' : t.id === '1018' ? '🟡 Attention' : t.alerts?.some((a: any) => !a.is_resolved && a.severity === 'critical') ? '🔴 Issue' : '🟢 On Track',
      has_unresolved_alerts: Boolean(t.alerts?.some((a: any) => !a.is_resolved)),
      operator_name: t.operator_name || 'Himalayan Trails',
    })),
  });
});

// Operator Vendors Directory
app.get('/api/operator/vendors', (req: Request, res: Response) => {
  res.json(vendorsStore);
});

// Toggle Vendor Availability
app.post('/api/operator/vendors/:id/toggle', (req: Request, res: Response) => {
  const vendor = vendorsStore.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ detail: 'Vendor not found' });

  vendor.is_available = !vendor.is_available;
  vendor.capacity_status = vendor.is_available ? 'available' : 'suspended';
  res.json(vendor);
});

// Central Bookings List
app.get('/api/operator/bookings', (req: Request, res: Response) => {
  const allBookings: any[] = [];
  tripsStore.forEach((t) => {
    if (t.bookings) {
      t.bookings.forEach((b: any) => {
        const vendor = vendorsStore.find((v) => v.id === b.vendor_id);
        allBookings.push({
          ...b,
          trip_id: t.id,
          trip_title: t.title,
          traveler_count: t.traveler_count,
          vendor_name: vendor?.name || 'Verified Partner Network',
          vendor_category: vendor?.category || b.item_type,
        });
      });
    }
  });

  res.json(allBookings);
});

// Operator Booking Action (Confirm / Cancel / Rebook)
app.post('/api/operator/bookings/:id/action', (req: Request, res: Response) => {
  const { action } = req.body; // 'confirm', 'cancel', 'rebook'
  const bookingId = req.params.id;

  let found = false;
  tripsStore.forEach((t) => {
    if (t.bookings) {
      const b = t.bookings.find((item: any) => item.id === bookingId || item.booking_reference === bookingId);
      if (b) {
        found = true;
        if (action === 'cancel') b.status = 'cancelled';
        else if (action === 'confirm') b.status = 'confirmed';
        else if (action === 'rebook') b.status = 'confirmed';
        b.updated_at = new Date().toISOString();
      }
    }
  });

  if (!found) return res.status(404).json({ detail: 'Booking not found' });
  tripsVersion = Date.now();
  res.json({ success: true, message: `Booking status updated to ${action}.` });
});

// Central Alerts List
app.get('/api/operator/alerts', (req: Request, res: Response) => {
  const allAlerts: any[] = [];
  tripsStore.forEach((t) => {
    if (t.alerts) {
      t.alerts.forEach((a: any) => {
        allAlerts.push({
          ...a,
          trip_id: t.id,
          trip_title: t.title,
          traveler_count: t.traveler_count,
        });
      });
    }
  });
  res.json(allAlerts);
});

// Resolve Alert
app.post('/api/operator/alerts/:id/resolve', (req: Request, res: Response) => {
  const alertId = req.params.id;
  let found = false;

  tripsStore.forEach((t) => {
    if (t.alerts) {
      const a = t.alerts.find((item: any) => item.id === alertId);
      if (a) {
        found = true;
        a.is_resolved = true;
        a.resolved_at = new Date().toISOString();
      }
    }
  });

  if (!found) return res.status(404).json({ detail: 'Alert not found' });
  tripsVersion = Date.now();
  res.json({ success: true, message: 'Alert marked as resolved.' });
});

// Operator Login & Auth Verification (Enforcing operator role)
app.post('/api/auth/operator-login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  // Validate credentials: operator@tourflow.ai or operator@himalayantrails.com with demo123
  if ((cleanEmail === 'operator@tourflow.ai' || cleanEmail === 'operator@himalayantrails.com') && password === 'demo123') {
    const operatorUser = {
      id: 'usr-operator-001',
      email: cleanEmail,
      name: 'Rajesh Sharma',
      role: 'operator',
      designation: 'Lead Operations & Dispatch Manager',
      operator_name: 'Himalayan Trails Tour Operations',
      assigned_sectors: ['Himachal Pradesh', 'Ladakh', 'Kashmir', 'Uttarakhand', 'Sikkim & Darjeeling'],
      token: `tk_ops_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
    return res.json({ success: true, user: operatorUser });
  }

  return res.status(401).json({
    success: false,
    detail: 'Invalid operator credentials. Demo account: operator@tourflow.ai / demo123',
  });
});

// Operator AI Operations Assistant
app.post('/api/operator/ai-assistant', async (req: Request, res: Response) => {
  try {
    const { message, context_trip_id } = req.body;
    const userQuery = message || '';

    const response = await operatorAiService.processOperatorQuery({
      userQuery,
      contextTripId: context_trip_id,
      trips: tripsStore,
      vendors: vendorsStore,
    });

    res.json(response);
  } catch (err: any) {
    logger.error('Error processing operator AI query', { module: 'server.ts' }, err);
    res.status(500).json({ error: 'Internal operator AI processing error' });
  }
});

// Operator Analytics
app.get('/api/operator/analytics', (req: Request, res: Response) => {
  res.json({
    overview: {
      total_tours_operated: 148,
      active_tours: 4,
      total_travelers_hosted: 582,
      total_gross_revenue: 34800000,
      avg_satisfaction_rating: 4.92,
      disruption_recovery_rate: 98.4,
      ai_replan_adoption_rate: 94.2,
      avg_resolution_time_minutes: 4.8,
    },
    monthly_revenue: [
      { month: 'Apr', revenue: 4200000 },
      { month: 'May', revenue: 5800000 },
      { month: 'Jun', revenue: 6400000 },
      { month: 'Jul', revenue: 7100000 },
      { month: 'Aug', revenue: 8900000 },
      { month: 'Sep', revenue: 11200000 },
    ],
    vendor_performance: vendorsStore.map((v) => ({
      name: v.name,
      category: v.category,
      rating: v.rating,
      active_bookings: v.active_bookings_count,
      on_time_fulfillment_pct: v.id === 'vnd-sky-002' ? 88.5 : 99.2,
    })),
    disruptions_by_type: [
      { type: 'Weather & Wind Shear', count: 18, resolved_pct: 100 },
      { type: 'Flight & Transit Delay', count: 12, resolved_pct: 96 },
      { type: 'Equipment & Maintenance', count: 5, resolved_pct: 100 },
      { type: 'Road & Landslide Diversion', count: 4, resolved_pct: 100 },
    ],
  });
});

// Real-Time Version Polling Endpoint
app.get('/api/sync/version', (req: Request, res: Response) => {
  res.json({
    version: tripsVersion,
    timestamp: new Date().toISOString(),
    trips_count: tripsStore.length,
  });
});

// Switch Selected Transport & Recalculate Trip
app.post('/api/trips/:id/change-transport', (req: Request, res: Response) => {
  const { id } = req.params;
  const { transport_id } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  const allTransports = [trip.selected_transport, ...(trip.transport_alternatives || [])].filter(Boolean);
  const newSelected = allTransports.find((t) => t.id === transport_id);

  if (!newSelected) {
    return res.status(400).json({ detail: 'Transport option not found' });
  }

  const remainingAlts = allTransports.filter((t) => t.id !== newSelected.id);
  trip.selected_transport = newSelected;
  trip.transport_alternatives = remainingAlts;

  // Regenerate itinerary to update Day 1 arrival timeline
  const { itinerary } = generateCanonicalItinerary({
    tripId: trip.id,
    destName: trip.destination?.name || 'Darjeeling',
    durationDays: trip.duration_days,
    travelers: trip.traveler_count,
    transport: newSelected,
    accommodation: trip.selected_accommodation,
    budgetTier: trip.preferences?.budget_tier || 'moderate',
  });

  trip.itinerary = itinerary;
  trip.cost_breakdown = calculateCostBreakdown(
    newSelected,
    trip.selected_accommodation,
    itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'transport_changed',
      field_changed: 'selected_transport',
      new_value: newSelected.title,
      reason: `Switched to ${newSelected.operator} (${newSelected.duration_str}, ₹${newSelected.total_price.toLocaleString()})`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Switch Selected Accommodation & Recalculate Trip
app.post('/api/trips/:id/change-accommodation', (req: Request, res: Response) => {
  const { id } = req.params;
  const { accommodation_id } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  const allAccommodations = [trip.selected_accommodation, ...(trip.accommodation_alternatives || [])].filter(Boolean);
  const newSelected = allAccommodations.find((a) => a.id === accommodation_id);

  if (!newSelected) {
    return res.status(400).json({ detail: 'Accommodation option not found' });
  }

  const remainingAlts = allAccommodations.filter((a) => a.id !== newSelected.id);
  trip.selected_accommodation = newSelected;
  trip.accommodation_alternatives = remainingAlts;

  // Update all nights in daily_accommodations
  const numNights = Math.max(1, (trip.duration_days || 6) - 1);
  trip.daily_accommodations = [];
  for (let d = 1; d <= numNights; d++) {
    trip.daily_accommodations.push({
      day_number: d,
      hotel: newSelected,
      alternatives: remainingAlts,
    });
  }

  // Regenerate itinerary to update stay item titles and descriptions
  const { itinerary } = generateCanonicalItinerary({
    tripId: trip.id,
    destName: trip.destination?.name || 'Darjeeling',
    durationDays: trip.duration_days,
    travelers: trip.traveler_count,
    transport: trip.selected_transport,
    accommodation: newSelected,
    budgetTier: trip.preferences?.budget_tier || 'moderate',
  });

  trip.itinerary = itinerary;
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    newSelected,
    itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'hotel_changed',
      field_changed: 'selected_accommodation',
      new_value: newSelected.name,
      reason: `Switched hotel to ${newSelected.name} (Total: ₹${newSelected.total_price.toLocaleString()})`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Switch Selected Accommodation for a Specific Day & Recalculate Trip
app.post('/api/trips/:id/change-daily-accommodation', (req: Request, res: Response) => {
  const { id } = req.params;
  const { day_number, accommodation_id } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  const allAccommodations = [
    trip.selected_accommodation,
    ...(trip.accommodation_alternatives || []),
  ].filter(Boolean);

  const newHotel = allAccommodations.find((a) => a.id === accommodation_id);
  if (!newHotel) return res.status(400).json({ detail: 'Accommodation option not found' });

  const numNights = Math.max(1, (trip.duration_days || 6) - 1);
  if (!trip.daily_accommodations || !Array.isArray(trip.daily_accommodations)) {
    trip.daily_accommodations = [];
    for (let d = 1; d <= numNights; d++) {
      trip.daily_accommodations.push({
        day_number: d,
        hotel: trip.selected_accommodation,
        alternatives: trip.accommodation_alternatives || [],
      });
    }
  }

  const targetDay = Number(day_number);
  const dayAccIndex = trip.daily_accommodations.findIndex((d: any) => d.day_number === targetDay);
  if (dayAccIndex !== -1) {
    trip.daily_accommodations[dayAccIndex].hotel = newHotel;
    trip.daily_accommodations[dayAccIndex].alternatives = allAccommodations.filter((a) => a.id !== newHotel.id);
  } else {
    trip.daily_accommodations.push({
      day_number: targetDay,
      hotel: newHotel,
      alternatives: allAccommodations.filter((a) => a.id !== newHotel.id),
    });
  }

  if (targetDay === 1) {
    trip.selected_accommodation = newHotel;
  }

  // Update Itinerary overnight / check-in item for that day
  if (trip.itinerary && Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach((item: any) => {
      if (item.item_type === 'hotel' && item.day_number === targetDay) {
        if (item.title.includes('Check-in')) {
          item.title = `Check-in: ${newHotel.name}`;
          item.description = `Unpack and relax in your ${newHotel.room_type}. Welcome refreshments.`;
          item.cost = newHotel.price_per_night;
        } else {
          item.title = `Overnight Stay: ${newHotel.name}`;
          item.description = `Rest and recharge in your ${newHotel.room_type}.`;
        }
        item.image_url = newHotel.hero_image;
        item.location = newHotel.location;
      }
    });
  }

  // Recalculate cost breakdown
  const totalHotelCost = trip.daily_accommodations.reduce((acc: number, curr: any) => acc + (curr.hotel?.price_per_night || 0), 0);
  const costBreakdown = calculateCostBreakdown(
    trip.selected_transport,
    { ...trip.selected_accommodation, total_price: totalHotelCost },
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.cost_breakdown = costBreakdown;
  trip.total_cost = costBreakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'hotel_changed',
      field_changed: `daily_accommodations[Day ${targetDay}]`,
      new_value: newHotel.name,
      reason: `Changed Day ${targetDay} hotel to ${newHotel.name} (₹${newHotel.price_per_night.toLocaleString()}/night)`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Add Itinerary Activity with Strict Time Clash Validation
app.post('/api/trips/:id/add-activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const { day_number, title, description, start_time, end_time, cost, location, item_type } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.itinerary) trip.itinerary = [];

  const targetDay = Number(day_number) || 1;
  const newItemId = `iti-${trip.id}-d${targetDay}-custom-${Date.now()}`;
  const dayItems = trip.itinerary.filter((i: any) => i.day_number === targetDay);

  // Time parsing helper
  const parseTimeMinutes = (tStr?: string): number | null => {
    if (!tStr || typeof tStr !== 'string') return null;
    const clean = tStr.trim().toLowerCase();
    const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (m12) {
      let h = parseInt(m12[1], 10);
      const m = m12[2] ? parseInt(m12[2], 10) : 0;
      if (h === 12) h = m12[3].toLowerCase() === 'am' ? 0 : 12;
      else if (m12[3].toLowerCase() === 'pm') h += 12;
      return h * 60 + m;
    }
    const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    return null;
  };

  const reqStart = start_time || '03:30 PM';
  const reqEnd = end_time || '05:30 PM';
  const newStartMin = parseTimeMinutes(reqStart);
  const newEndMin = parseTimeMinutes(reqEnd);

  if (newStartMin !== null && newEndMin !== null) {
    if (newEndMin <= newStartMin) {
      return res.status(400).json({ detail: 'End time must be strictly after start time.' });
    }
    const clashing = dayItems.find((item: any) => {
      if (item.is_disabled) return false;
      const sMin = parseTimeMinutes(item.start_time);
      const eMin = parseTimeMinutes(item.end_time);
      if (sMin === null || eMin === null) return false;
      return Math.max(newStartMin, sMin) < Math.min(newEndMin, eMin);
    });

    if (clashing) {
      return res.status(400).json({
        detail: `Time clash detected with "${clashing.title}" (${clashing.start_time} – ${clashing.end_time}). Please pick an open time slot.`,
      });
    }
  }

  const newItem: any = {
    id: newItemId,
    trip_id: trip.id,
    day_number: targetDay,
    order_index: dayItems.length + 1,
    item_type: item_type || 'activity',
    title: title || 'Custom Activity',
    description: description || 'Tailored activity added to your personalized schedule.',
    start_time: start_time || '03:30 PM',
    end_time: end_time || '05:30 PM',
    cost: typeof cost === 'number' ? cost : 1500,
    status: 'confirmed',
    location: location || trip.destination?.name || 'Local Area',
    image_url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80',
  };

  trip.itinerary.push(newItem);
  trip.itinerary.sort((a: any, b: any) => a.day_number - b.day_number || (a.order_index || 0) - (b.order_index || 0));

  // Recalculate cost
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'activity_added',
      field_changed: `itinerary[Day ${targetDay}]`,
      new_value: newItem.title,
      reason: `Added "${newItem.title}" on Day ${targetDay} (₹${newItem.cost.toLocaleString()})`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Delete Itinerary Item (Activity, Hotel, Transport, or Custom Event)
const handleDeleteItemFromTrip = (tripId: string, itemId: string, res: Response) => {
  const tripIndex = tripsStore.findIndex((t) => 
    t.id === tripId || 
    (tripId === '1024' && (t.id === '1024' || t.id === 'trp-manali-1024' || t.id === 'trp-manali-alpine-demo-001'))
  );
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.itinerary) trip.itinerary = [];

  const targetItem = trip.itinerary.find((i: any) => i.id === itemId);
  const targetDay = targetItem?.day_number || 1;

  // 1. Remove from itinerary
  trip.itinerary = trip.itinerary.filter((i: any) => i.id !== itemId);

  // 2. If it was a hotel item, also adjust daily accommodations if needed
  if (targetItem?.item_type === 'hotel' || targetItem?.title?.toLowerCase().includes('check-in') || targetItem?.title?.toLowerCase().includes('stay')) {
    if (trip.daily_accommodations && Array.isArray(trip.daily_accommodations)) {
      trip.daily_accommodations = trip.daily_accommodations.filter((d: any) => d.day_number !== targetDay);
    }
  }

  // 3. Re-sequence timeline order and times for the affected day
  const dayItems = trip.itinerary.filter((i: any) => i.day_number === targetDay);
  let currentHour = 9;
  let currentMin = 0;
  dayItems.forEach((item: any, idx: number) => {
    item.order_index = idx + 1;
    if (!item.is_disabled && item.status !== 'skipped') {
      const startH = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const startPeriod = currentHour >= 12 ? 'PM' : 'AM';
      item.start_time = `${startH.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')} ${startPeriod}`;
      
      const durationMins = item.item_type === 'meal' ? 90 : (item.item_type === 'sightseeing' ? 120 : (item.item_type === 'hotel' ? 60 : 150));
      const endTotalMin = currentHour * 60 + currentMin + durationMins;
      const endH24 = Math.floor(endTotalMin / 60);
      const endM = endTotalMin % 60;
      const endH = endH24 % 12 === 0 ? 12 : endH24 % 12;
      const endPeriod = endH24 >= 12 ? 'PM' : 'AM';
      item.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} ${endPeriod}`;

      const nextStartMin = endTotalMin + (idx === 1 ? 45 : 30);
      currentHour = Math.floor(nextStartMin / 60);
      currentMin = nextStartMin % 60;
    }
  });

  // 4. Recompute 4-category cost breakdown
  const totalHotelCost = (trip.daily_accommodations && trip.daily_accommodations.length > 0)
    ? trip.daily_accommodations.reduce((acc: number, curr: any) => acc + (curr.hotel?.price_per_night || 0), 0)
    : (trip.selected_accommodation?.total_price || 0);

  const effectiveAccom = trip.selected_accommodation ? { ...trip.selected_accommodation, total_price: totalHotelCost } : trip.selected_accommodation;

  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    effectiveAccom,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  // 5. Append to change history
  const itemTitle = targetItem?.title || 'Item';
  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'item_deleted',
      field_changed: `itinerary[${itemTitle}]`,
      new_value: 'Deleted',
      reason: `Deleted "${itemTitle}" from Day ${targetDay}. Daily timeline & 4-category budget recomputed.`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  tripsVersion = Date.now();
  return res.json(trip);
};

app.post('/api/trips/:id/delete-activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const { item_id } = req.body;
  return handleDeleteItemFromTrip(id, item_id, res);
});

app.delete('/api/trips/:id/items/:itemId', (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  return handleDeleteItemFromTrip(id, itemId, res);
});

app.delete('/api/trips/:id/activities/:itemId', (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  return handleDeleteItemFromTrip(id, itemId, res);
});

// Swap Itinerary Activity
app.post('/api/trips/:id/swap-activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const { item_id, new_title, new_description, new_cost, new_image_url } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.itinerary) return res.json(trip);

  const targetIndex = trip.itinerary.findIndex((i: any) => i.id === item_id);
  if (targetIndex === -1) return res.status(404).json({ detail: 'Itinerary item not found' });

  const oldTitle = trip.itinerary[targetIndex].title;
  trip.itinerary[targetIndex] = {
    ...trip.itinerary[targetIndex],
    title: new_title || trip.itinerary[targetIndex].title,
    description: new_description || trip.itinerary[targetIndex].description,
    cost: typeof new_cost === 'number' ? new_cost : trip.itinerary[targetIndex].cost,
    image_url: new_image_url || trip.itinerary[targetIndex].image_url,
  };

  // Recalculate cost
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'activity_swapped',
      field_changed: `itinerary[${oldTitle}]`,
      new_value: trip.itinerary[targetIndex].title,
      reason: `Swapped "${oldTitle}" with "${trip.itinerary[targetIndex].title}"`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Edit Itinerary Activity
app.post('/api/trips/:id/edit-activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const { item_id, title, description, start_time, end_time, cost } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.itinerary) return res.json(trip);

  const targetIndex = trip.itinerary.findIndex((i: any) => i.id === item_id);
  if (targetIndex === -1) return res.status(404).json({ detail: 'Itinerary item not found' });

  trip.itinerary[targetIndex] = {
    ...trip.itinerary[targetIndex],
    title: title ?? trip.itinerary[targetIndex].title,
    description: description ?? trip.itinerary[targetIndex].description,
    start_time: start_time ?? trip.itinerary[targetIndex].start_time,
    end_time: end_time ?? trip.itinerary[targetIndex].end_time,
    cost: typeof cost === 'number' ? cost : trip.itinerary[targetIndex].cost,
  };

  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Toggle Activity Selection (Enable / Deselect)
app.post('/api/trips/:id/toggle-activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const { item_id } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.itinerary) return res.json(trip);

  const targetItem = trip.itinerary.find((i: any) => i.id === item_id);
  if (!targetItem) return res.status(404).json({ detail: 'Itinerary item not found' });

  const isCurrentlyDisabled = targetItem.is_disabled || targetItem.status === 'skipped';
  targetItem.is_disabled = !isCurrentlyDisabled;
  targetItem.status = !isCurrentlyDisabled ? 'skipped' : 'confirmed';

  // Recalculate timeline sequence for this day to close time gaps
  const dayNum = targetItem.day_number;
  const dayItems = trip.itinerary.filter((i: any) => i.day_number === dayNum);
  
  let currentHour = 9;
  let currentMin = 0;
  dayItems.forEach((item: any, idx: number) => {
    if (!item.is_disabled && item.status !== 'skipped') {
      const startH = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const startPeriod = currentHour >= 12 ? 'PM' : 'AM';
      item.start_time = `${startH.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')} ${startPeriod}`;
      
      const durationMins = item.item_type === 'meal' ? 90 : (item.item_type === 'sightseeing' ? 120 : 150);
      const endTotalMin = currentHour * 60 + currentMin + durationMins;
      const endH24 = Math.floor(endTotalMin / 60);
      const endM = endTotalMin % 60;
      const endH = endH24 % 12 === 0 ? 12 : endH24 % 12;
      const endPeriod = endH24 >= 12 ? 'PM' : 'AM';
      item.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} ${endPeriod}`;
      item.order_index = idx + 1;

      const nextStartMin = endTotalMin + (idx === 1 ? 45 : 30);
      currentHour = Math.floor(nextStartMin / 60);
      currentMin = nextStartMin % 60;
    }
  });

  // Recalculate cost
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'activity_toggled',
      field_changed: `itinerary[${targetItem.title}]`,
      new_value: targetItem.is_disabled ? 'Disabled' : 'Enabled',
      reason: `${targetItem.is_disabled ? 'Deselected' : 'Selected'} "${targetItem.title}" on Day ${targetItem.day_number}`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Add Day Leg to Trip
app.post('/api/trips/:id/add-day-leg', (req: Request, res: Response) => {
  const { id } = req.params;
  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  const newDayNumber = (trip.duration_days || 4) + 1;
  trip.duration_days = newDayNumber;

  const destName = trip.destination?.name || 'Darjeeling';
  const newItems: any[] = [
    {
      id: `iti-${trip.id}-d${newDayNumber}-1-${Date.now()}`,
      trip_id: trip.id,
      day_number: newDayNumber,
      order_index: 1,
      item_type: 'sightseeing',
      title: `${destName} Scenic Valley Viewpoint & Nature Trail`,
      description: `Serene morning walk through local cedar pines and panoramic alpine vantage points.`,
      start_time: '09:30 AM',
      end_time: '12:00 PM',
      cost: 800,
      status: 'confirmed',
      location: `${destName} Outer Ridge`,
      image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: `iti-${trip.id}-d${newDayNumber}-2-${Date.now()}`,
      trip_id: trip.id,
      day_number: newDayNumber,
      order_index: 2,
      item_type: 'meal',
      title: `Traditional Artisan Lunch & Tea Tasting`,
      description: `Authentic regional cuisine tasting experience paired with estate-fresh brew.`,
      start_time: '12:45 PM',
      end_time: '02:30 PM',
      cost: 1400,
      status: 'confirmed',
      location: `${destName} Town Center`,
      image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: `iti-${trip.id}-d${newDayNumber}-3-${Date.now()}`,
      trip_id: trip.id,
      day_number: newDayNumber,
      order_index: 3,
      item_type: 'leisure',
      title: `Sunset Promenade & Local Handicrafts Market`,
      description: `Relaxed evening browsing local woolens, hand-carved woodwork, and Tibetan souvenirs.`,
      start_time: '04:00 PM',
      end_time: '06:30 PM',
      cost: 600,
      status: 'confirmed',
      location: `${destName} Heritage Lane`,
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    },
  ];

  if (!trip.itinerary) trip.itinerary = [];
  trip.itinerary.push(...newItems);

  // Update accommodation nights
  if (trip.selected_accommodation) {
    trip.selected_accommodation.nights = Math.max(1, trip.duration_days - 1);
    trip.selected_accommodation.total_price = trip.selected_accommodation.price_per_night * trip.selected_accommodation.nights * Math.ceil(trip.traveler_count / 2);
  }

  // Recalculate cost
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'day_leg_added',
      field_changed: 'duration_days',
      new_value: `${newDayNumber} Days`,
      reason: `Extended trip to ${newDayNumber} Days with curated activities.`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Remove Day Leg from Trip
app.post('/api/trips/:id/remove-day-leg', (req: Request, res: Response) => {
  const { id } = req.params;
  const { day_number } = req.body;
  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (trip.duration_days <= 2) {
    return res.status(400).json({ detail: 'Trip cannot have less than 2 days' });
  }

  const targetDay = Number(day_number) || trip.duration_days;
  
  // Remove items on that day
  trip.itinerary = (trip.itinerary || []).filter((i: any) => i.day_number !== targetDay);
  
  // Shift subsequent days down
  trip.itinerary.forEach((i: any) => {
    if (i.day_number > targetDay) {
      i.day_number = i.day_number - 1;
    }
  });

  trip.duration_days = trip.duration_days - 1;

  // Update accommodation nights
  if (trip.selected_accommodation) {
    trip.selected_accommodation.nights = Math.max(1, trip.duration_days - 1);
    trip.selected_accommodation.total_price = trip.selected_accommodation.price_per_night * trip.selected_accommodation.nights * Math.ceil(trip.traveler_count / 2);
  }

  // Recalculate cost
  trip.cost_breakdown = calculateCostBreakdown(
    trip.selected_transport,
    trip.selected_accommodation,
    trip.itinerary,
    trip.traveler_count,
    trip.total_budget
  );
  trip.total_cost = trip.cost_breakdown.total;
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: 'user',
      action: 'day_leg_removed',
      field_changed: 'duration_days',
      new_value: `${trip.duration_days} Days`,
      reason: `Removed Day ${targetDay} leg and shifted schedule.`,
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json(trip);
});

// Dynamic Possible Options Tray Endpoint
app.get('/api/possible-options', (req: Request, res: Response) => {
  const destName = (req.query.destination as string) || 'Darjeeling';
  const options = getPossibleOptionsForDestination(destName);
  res.json(options);
});

// Lock in Booking (Option A: AI Guide booking vs Option B: External self-booking)
app.post('/api/trips/:id/lock-booking', (req: Request, res: Response) => {
  const { id } = req.params;
  const { item_type, item_id, booking_mode, details } = req.body;

  const tripIndex = tripsStore.findIndex((t) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ detail: 'Trip not found' });

  const trip = tripsStore[tripIndex];
  if (!trip.bookings) trip.bookings = [];

  const refPrefix = booking_mode === 'ai_guide' ? 'WFLW-AI' : 'WFLW-EXT';
  const newBooking = {
    id: `bkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trip_id: trip.id,
    booking_reference: `${refPrefix}-${Math.floor(10000 + Math.random() * 90000)}`,
    item_type: item_type || 'service',
    item_id: item_id,
    amount: details?.amount || 0,
    currency: 'INR',
    status: booking_mode === 'ai_guide' ? 'confirmed' : 'pending_external',
    payment_status: booking_mode === 'ai_guide' ? 'paid' : 'unpaid',
    booking_mode: booking_mode || 'ai_guide',
    provider_name: details?.provider || 'WanderFlow Partner Network',
    external_url: details?.external_url,
    title: details?.title || 'Trip Booking Reservation',
    booking_date: new Date().toISOString(),
  };

  trip.bookings.push(newBooking);
  trip.updated_at = new Date().toISOString();

  trip.change_history = [
    {
      id: `chg-${Date.now()}`,
      trip_id: trip.id,
      changed_by: booking_mode === 'ai_guide' ? 'ai' : 'user',
      action: 'booking_locked',
      field_changed: `bookings[${newBooking.booking_reference}]`,
      new_value: `${newBooking.title} (${newBooking.booking_reference})`,
      reason: booking_mode === 'ai_guide' ? 'Locked in via WanderFlow AI Guide Booking Concierge' : 'Saved for direct external booking',
      timestamp: new Date().toISOString(),
    },
    ...(trip.change_history || []),
  ];

  tripsStore[tripIndex] = trip;
  res.json({ success: true, booking: newBooking, trip });
});

// ----------------------------------------------------
// Primary AI Chat & Extraction Endpoint
// ----------------------------------------------------
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, session_context, current_trip, history } = req.body;
    const result = await conciergeService.processChat({
      message: message || '',
      sessionContext: session_context,
      currentTrip: current_trip,
      history,
    });
    res.json(result);
  } catch (err: any) {
    logger.error('Error handling AI chat request', { module: 'server.ts' }, err);
    res.status(500).json({ error: err.message || 'Internal AI chat error' });
  }
});

/* OLD_INLINE_CHAT_DEPRECATED
app.post('/api/ai/chat-legacy', async (req: Request, res: Response) => {
  const { message, session_context, current_trip } = req.body;
  const userText = message || '';

  // Extract structured intent from user message
  const extraction = await extractWithGemini(userText, current_trip || session_context);

  const activeTrip = current_trip || null;
  let modifiedTrip = activeTrip ? JSON.parse(JSON.stringify(activeTrip)) : null;
  let didModifyTrip = false;
  let modSummary = '';

  // Handle in-place live modifications if trip is already generated
  if (activeTrip && modifiedTrip) {
    // 1. Train preferred / switch to train
    if (extraction.modifications?.train_preferred || (extraction.transport_preference === 'train' && modifiedTrip.selected_transport?.mode !== 'train')) {
      const allTransports = [modifiedTrip.selected_transport, ...(modifiedTrip.transport_alternatives || [])].filter(Boolean);
      const trainOpt = allTransports.find((t: any) => t.mode === 'train') || resolveTransportOptions({
        origin: modifiedTrip.origin,
        destination: modifiedTrip.destination?.name || 'Darjeeling',
        startDate: modifiedTrip.start_date,
        travelers: modifiedTrip.traveler_count,
        targetBudget: modifiedTrip.total_budget,
        preference: 'train',
      }).selected;

      modifiedTrip.selected_transport = trainOpt;
      modifiedTrip.transport_alternatives = allTransports.filter((t: any) => t.id !== trainOpt.id);

      const { itinerary } = generateCanonicalItinerary({
        tripId: modifiedTrip.id,
        destName: modifiedTrip.destination?.name || 'Darjeeling',
        durationDays: modifiedTrip.duration_days,
        travelers: modifiedTrip.traveler_count,
        transport: trainOpt,
        accommodation: modifiedTrip.selected_accommodation,
      });
      modifiedTrip.itinerary = itinerary;
      modifiedTrip.cost_breakdown = calculateCostBreakdown(
        trainOpt,
        modifiedTrip.selected_accommodation,
        itinerary,
        modifiedTrip.traveler_count,
        modifiedTrip.total_budget
      );
      modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
      didModifyTrip = true;
      modSummary += `Updated transport to ${trainOpt.operator} train journey and adjusted Day 1 arrival timeline.`;
    }

    // 2. Flight change / alternate flight
    if (extraction.modifications?.change_flight || (extraction.modifications?.flight_preferred && modifiedTrip.selected_transport?.mode !== 'flight')) {
      const allTransports = [modifiedTrip.selected_transport, ...(modifiedTrip.transport_alternatives || [])].filter(Boolean);
      const altFlight = allTransports.find((t: any) => t.mode === 'flight' && t.id !== modifiedTrip.selected_transport?.id) || allTransports.find((t: any) => t.mode === 'flight');

      if (altFlight) {
        modifiedTrip.selected_transport = altFlight;
        modifiedTrip.transport_alternatives = allTransports.filter((t: any) => t.id !== altFlight.id);

        const { itinerary } = generateCanonicalItinerary({
          tripId: modifiedTrip.id,
          destName: modifiedTrip.destination?.name || 'Darjeeling',
          durationDays: modifiedTrip.duration_days,
          travelers: modifiedTrip.traveler_count,
          transport: altFlight,
          accommodation: modifiedTrip.selected_accommodation,
        });
        modifiedTrip.itinerary = itinerary;
        modifiedTrip.cost_breakdown = calculateCostBreakdown(
          altFlight,
          modifiedTrip.selected_accommodation,
          itinerary,
          modifiedTrip.traveler_count,
          modifiedTrip.total_budget
        );
        modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
        didModifyTrip = true;
        modSummary += `Changed flight to ${altFlight.operator} and recalculated Day 1 transfers.`;
      }
    }

    // 3. Cheaper Hotel
    if (extraction.modifications?.cheaper_hotel) {
      const allAccoms = [modifiedTrip.selected_accommodation, ...(modifiedTrip.accommodation_alternatives || [])].filter(Boolean);
      const cheapAcc = allAccoms.find((a: any) => a.badge === 'cheapest') || allAccoms.sort((a: any, b: any) => a.total_price - b.total_price)[0];

      if (cheapAcc && cheapAcc.id !== modifiedTrip.selected_accommodation?.id) {
        modifiedTrip.selected_accommodation = cheapAcc;
        modifiedTrip.accommodation_alternatives = allAccoms.filter((a: any) => a.id !== cheapAcc.id);

        const { itinerary } = generateCanonicalItinerary({
          tripId: modifiedTrip.id,
          destName: modifiedTrip.destination?.name || 'Darjeeling',
          durationDays: modifiedTrip.duration_days,
          travelers: modifiedTrip.traveler_count,
          transport: modifiedTrip.selected_transport,
          accommodation: cheapAcc,
        });
        modifiedTrip.itinerary = itinerary;
        modifiedTrip.cost_breakdown = calculateCostBreakdown(
          modifiedTrip.selected_transport,
          cheapAcc,
          itinerary,
          modifiedTrip.traveler_count,
          modifiedTrip.total_budget
        );
        modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
        didModifyTrip = true;
        modSummary += `Switched to cozy budget stay (${cheapAcc.name}), saving ₹${(modifiedTrip.cost_breakdown.remaining_budget).toLocaleString()} under budget.`;
      }
    }

    // 4. Upgrade Hotel / 4-Star / 5-Star Resort
    if (extraction.modifications?.upgrade_hotel) {
      const allAccoms = [modifiedTrip.selected_accommodation, ...(modifiedTrip.accommodation_alternatives || [])].filter(Boolean);
      const luxAcc = allAccoms.find((a: any) => a.badge === 'luxury' || a.badge === 'best_rated') || allAccoms.sort((a: any, b: any) => b.total_price - a.total_price)[0];

      if (luxAcc && luxAcc.id !== modifiedTrip.selected_accommodation?.id) {
        modifiedTrip.selected_accommodation = luxAcc;
        modifiedTrip.accommodation_alternatives = allAccoms.filter((a: any) => a.id !== luxAcc.id);

        const { itinerary } = generateCanonicalItinerary({
          tripId: modifiedTrip.id,
          destName: modifiedTrip.destination?.name || 'Darjeeling',
          durationDays: modifiedTrip.duration_days,
          travelers: modifiedTrip.traveler_count,
          transport: modifiedTrip.selected_transport,
          accommodation: luxAcc,
        });
        modifiedTrip.itinerary = itinerary;
        modifiedTrip.cost_breakdown = calculateCostBreakdown(
          modifiedTrip.selected_transport,
          luxAcc,
          itinerary,
          modifiedTrip.traveler_count,
          modifiedTrip.total_budget
        );
        modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
        didModifyTrip = true;
        modSummary += `Upgraded accommodation to ${luxAcc.name} with deluxe amenities.`;
      }
    }

    // 5. Overall Cheaper Trip (Transport + Stays)
    if (extraction.modifications?.cheaper && !extraction.modifications?.cheaper_hotel) {
      // Find cheapest transport and cheapest stay
      const allTransports = [modifiedTrip.selected_transport, ...(modifiedTrip.transport_alternatives || [])].filter(Boolean);
      const cheapestTrans = allTransports.find((t: any) => t.badge === 'cheapest') || allTransports.sort((a: any, b: any) => a.total_price - b.total_price)[0];

      const allAccoms = [modifiedTrip.selected_accommodation, ...(modifiedTrip.accommodation_alternatives || [])].filter(Boolean);
      const cheapestAccom = allAccoms.find((a: any) => a.badge === 'cheapest') || allAccoms.sort((a: any, b: any) => a.total_price - b.total_price)[0];

      if (cheapestTrans) {
        modifiedTrip.selected_transport = cheapestTrans;
        modifiedTrip.transport_alternatives = allTransports.filter((t: any) => t.id !== cheapestTrans.id);
      }
      if (cheapestAccom) {
        modifiedTrip.selected_accommodation = cheapestAccom;
        modifiedTrip.accommodation_alternatives = allAccoms.filter((a: any) => a.id !== cheapestAccom.id);
      }

      const { itinerary } = generateCanonicalItinerary({
        tripId: modifiedTrip.id,
        destName: modifiedTrip.destination?.name || 'Darjeeling',
        durationDays: modifiedTrip.duration_days,
        travelers: modifiedTrip.traveler_count,
        transport: modifiedTrip.selected_transport,
        accommodation: modifiedTrip.selected_accommodation,
        totalBudget: modifiedTrip.total_budget,
      });
      modifiedTrip.itinerary = itinerary;
      modifiedTrip.cost_breakdown = calculateCostBreakdown(
        modifiedTrip.selected_transport,
        modifiedTrip.selected_accommodation,
        itinerary,
        modifiedTrip.traveler_count,
        modifiedTrip.total_budget
      );
      modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
      didModifyTrip = true;
      modSummary += `Optimized trip cost down to ₹${modifiedTrip.total_cost.toLocaleString()} (₹${modifiedTrip.cost_breakdown.remaining_budget.toLocaleString()} under your ₹${modifiedTrip.total_budget.toLocaleString()} budget) while keeping destination, dates, and group size.`;
    }

    // 5b. Explicit Budget Target Update
    const explicitBudget = extraction.budget || parseBudget(userText);
    if (explicitBudget && explicitBudget > 0 && explicitBudget !== modifiedTrip.total_budget && !extraction.modifications?.cheaper) {
      modifiedTrip.total_budget = explicitBudget;

      // If current stay exceeds 55% of the new budget, switch to budget option
      if (modifiedTrip.selected_accommodation && modifiedTrip.selected_accommodation.total_price > explicitBudget * 0.55) {
        const { selected: cheaperAccom, alternatives: newAccomAlts } = resolveAccommodationOptions({
          destination: modifiedTrip.destination?.name || 'Darjeeling',
          nights: Math.max(1, modifiedTrip.duration_days - 1),
          travelers: modifiedTrip.traveler_count,
          budgetTier: explicitBudget < 40000 ? 'budget' : 'moderate',
          targetBudget: explicitBudget,
        });
        modifiedTrip.selected_accommodation = cheaperAccom;
        modifiedTrip.accommodation_alternatives = newAccomAlts;
      }

      // If current transport exceeds 45% of new budget, switch to affordable transport
      if (modifiedTrip.selected_transport && modifiedTrip.selected_transport.total_price > explicitBudget * 0.45) {
        const { selected: cheaperTrans, alternatives: newTransAlts } = resolveTransportOptions({
          origin: modifiedTrip.origin,
          destination: modifiedTrip.destination?.name || 'Darjeeling',
          startDate: modifiedTrip.start_date,
          travelers: modifiedTrip.traveler_count,
          targetBudget: explicitBudget,
        });
        modifiedTrip.selected_transport = cheaperTrans;
        modifiedTrip.transport_alternatives = newTransAlts;
      }

      const { itinerary } = generateCanonicalItinerary({
        tripId: modifiedTrip.id,
        destName: modifiedTrip.destination?.name || 'Darjeeling',
        durationDays: modifiedTrip.duration_days,
        travelers: modifiedTrip.traveler_count,
        transport: modifiedTrip.selected_transport,
        accommodation: modifiedTrip.selected_accommodation,
        startDate: modifiedTrip.start_date,
        endDate: modifiedTrip.end_date,
        totalBudget: explicitBudget,
      });
      modifiedTrip.itinerary = itinerary;
      modifiedTrip.cost_breakdown = calculateCostBreakdown(
        modifiedTrip.selected_transport,
        modifiedTrip.selected_accommodation,
        itinerary,
        modifiedTrip.traveler_count,
        explicitBudget
      );
      modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
      modifiedTrip.expenses = [
        { id: 'e1', title: `${modifiedTrip.selected_transport.operator} (${modifiedTrip.selected_transport.mode.toUpperCase()})`, amount: modifiedTrip.selected_transport.total_price, paidBy: `Traveler 1` },
        { id: 'e2', title: `${modifiedTrip.selected_accommodation.name} (${Math.max(1, modifiedTrip.duration_days - 1)} Nights)`, amount: modifiedTrip.selected_accommodation.total_price, paidBy: `Traveler 2` },
        { id: 'e3', title: `Curated Sightseeing & Activities Passes`, amount: modifiedTrip.cost_breakdown.activities, paidBy: `Traveler 1` },
        { id: 'e4', title: `Food, Meals & Incidental Reserve`, amount: modifiedTrip.cost_breakdown.food_and_other, paidBy: `Traveler 2` },
      ];
      didModifyTrip = true;
      modSummary += `Updated trip target budget to ₹${explicitBudget.toLocaleString()} and balanced transport, stays, and activities to keep total cost (₹${modifiedTrip.total_cost.toLocaleString()}) strictly within budget.`;
    }

    // 6. Remove Heavy Walking / Relaxed Pace
    const lowerMsg = userText.toLowerCase();
    if (lowerMsg.includes('walking') || lowerMsg.includes('heavy walk') || lowerMsg.includes('less walk') || lowerMsg.includes('relaxed pace') || lowerMsg.includes('easy pace')) {
      if (modifiedTrip.itinerary) {
        modifiedTrip.itinerary = modifiedTrip.itinerary.map((item: any) => {
          if (item.title?.toLowerCase().includes('trek') || item.title?.toLowerCase().includes('hike') || item.title?.toLowerCase().includes('ridge walk') || item.title?.toLowerCase().includes('rock garden')) {
            return {
              ...item,
              title: `${item.location || 'Scenic'} Tea Garden Balcony & Leisure Tasting`,
              description: 'Comfortable sit-down panoramic vantage point with estate brew, zero steep inclines.',
              cost: Math.min(item.cost, 500),
              walking_intensity: 'none',
              rest_buffer_minutes: 45,
            };
          }
          return {
            ...item,
            walking_intensity: item.walking_intensity === 'high' ? 'light' : item.walking_intensity,
            rest_buffer_minutes: 40,
          };
        });

        modifiedTrip.cost_breakdown = calculateCostBreakdown(
          modifiedTrip.selected_transport,
          modifiedTrip.selected_accommodation,
          modifiedTrip.itinerary,
          modifiedTrip.traveler_count,
          modifiedTrip.total_budget
        );
        modifiedTrip.total_cost = modifiedTrip.cost_breakdown.total;
        didModifyTrip = true;
        modSummary += `Replaced strenuous walking legs with seated tea garden viewpoints and 45-minute rest buffers.`;
      }
    }

    // 7. Add Rest / Relaxation
    if (lowerMsg.includes('rest') || lowerMsg.includes('relax') || lowerMsg.includes('buffer') || lowerMsg.includes('slow down')) {
      if (modifiedTrip.itinerary) {
        modifiedTrip.itinerary.forEach((item: any) => {
          item.rest_buffer_minutes = 45;
        });
        didModifyTrip = true;
        modSummary += `Expanded all daily transition and rest periods with dedicated 45-minute downtime buffers.`;
      }
    }

    if (didModifyTrip) {
      modifiedTrip.updated_at = new Date().toISOString();
      modifiedTrip.change_history = [
        {
          id: `chg-${Date.now()}`,
          trip_id: modifiedTrip.id,
          changed_by: 'ai',
          action: 'trip_modified',
          field_changed: 'itinerary, transport, or accommodation',
          new_value: userText,
          reason: modSummary,
          timestamp: new Date().toISOString(),
        },
        ...(modifiedTrip.change_history || []),
      ];

      const idx = tripsStore.findIndex((t) => t.id === modifiedTrip.id);
      if (idx !== -1) tripsStore[idx] = modifiedTrip;
    }
  }

  // Calculate Checklist State with Strict Destination & Field Validation
  let whereTo = extraction.destination ? toTitleCase(extraction.destination) : null;
  if (!whereTo && session_context?.where_to && !isInvalidDestination(session_context.where_to)) {
    whereTo = toTitleCase(session_context.where_to);
  } else if (!whereTo && activeTrip?.destination?.name && !isInvalidDestination(activeTrip.destination.name)) {
    whereTo = toTitleCase(activeTrip.destination.name);
  }
  // Enforce: where_to can NEVER be an invalid string or month
  if (isInvalidDestination(whereTo)) {
    whereTo = null;
  }

  let whereFrom = extraction.origin ? toTitleCase(extraction.origin) : null;
  if (!whereFrom && session_context?.where_from && !isInvalidDestination(session_context.where_from)) {
    whereFrom = toTitleCase(session_context.where_from);
  } else if (!whereFrom && activeTrip?.origin && !isInvalidDestination(activeTrip.origin)) {
    whereFrom = toTitleCase(activeTrip.origin);
  }
  if (whereFrom && whereTo && whereFrom.toLowerCase().trim() === whereTo.toLowerCase().trim()) {
    whereFrom = null;
  }

  // Dates & Chronological Validity
  const startDate = extraction.start_date || (extraction.is_dates_valid ? null : session_context?.start_date) || (activeTrip ? activeTrip.start_date : null);
  const endDate = extraction.end_date || (extraction.is_dates_valid ? null : session_context?.end_date) || (activeTrip ? activeTrip.end_date : null);
  const travelDates = extraction.formatted_dates || (extraction.is_dates_valid ? null : session_context?.travel_dates) || (activeTrip ? activeTrip.formatted_dates : null);
  const travelMonth = extraction.travel_month || session_context?.travel_month || null;

  const isDatesConfirmed = Boolean(startDate && endDate && travelDates);

  // Duration
  let durationDays = extraction.duration_days;
  if (!durationDays && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      durationDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    }
  }
  if (!durationDays && session_context?.when_you_go) {
    const dMatch = session_context.when_you_go.match(/\d+/);
    if (dMatch) durationDays = parseInt(dMatch[0], 10);
  }
  if (!durationDays && activeTrip?.duration_days) {
    durationDays = activeTrip.duration_days;
  }

  // Travelers
  const travelersCount = extraction.travelers || (session_context?.who_is_coming && /\d+/.test(session_context.who_is_coming) ? parseInt(session_context.who_is_coming.match(/\d+/)![0], 10) : null) || (activeTrip ? activeTrip.traveler_count : null);
  const travelType = extraction.travel_type || (session_context?.who_is_coming?.toLowerCase().includes('couple') ? 'couple' : session_context?.who_is_coming?.toLowerCase().includes('solo') ? 'solo' : session_context?.who_is_coming?.toLowerCase().includes('friends') ? 'friends' : session_context?.who_is_coming?.toLowerCase().includes('family') ? 'family' : null);

  // Budget (STRICT: Never pull from examples or placeholders)
  let budgetVal: number | null = extraction.budget || null;
  if (!budgetVal && session_context?.what_you_are_after && /\d+/.test(session_context.what_you_are_after)) {
    budgetVal = parseInt(session_context.what_you_are_after.replace(/[^0-9]/g, ''), 10);
  } else if (!budgetVal && activeTrip?.total_budget) {
    budgetVal = activeTrip.total_budget;
  }

  // Comprehensive Trip Validation
  const validationResult = validateTripFields({
    destination: whereTo,
    origin: whereFrom,
    start_date: isDatesConfirmed ? startDate : null,
    end_date: isDatesConfirmed ? endDate : null,
    formatted_dates: isDatesConfirmed ? travelDates : null,
    duration_days: durationDays,
    travelers: travelersCount,
    budget: budgetVal,
    travel_month: travelMonth,
  });

  const whoIsComing = travelersCount 
    ? `${travelersCount} Travelers${travelType ? ` (${travelType.charAt(0).toUpperCase() + travelType.slice(1)})` : ''}` 
    : session_context?.who_is_coming || null;

  const whenYouGo = durationDays 
    ? `${durationDays} days` 
    : session_context?.when_you_go || null;

  const whatYouAreAfter = budgetVal 
    ? `Budget ₹${budgetVal.toLocaleString()}` 
    : session_context?.what_you_are_after || null;

  const checklist = {
    where_to: whereTo,
    where_from: whereFrom,
    who_is_coming: whoIsComing,
    when_you_go: whenYouGo,
    what_you_are_after: whatYouAreAfter,
    travel_dates: isDatesConfirmed ? travelDates : null,
    start_date: isDatesConfirmed ? startDate : null,
    end_date: isDatesConfirmed ? endDate : null,
    travel_month: travelMonth,
    travelers: travelersCount,
    budget: budgetVal,
    is_dates_valid: isDatesConfirmed,
    is_ready_to_generate: validationResult.is_ready_to_generate,
  };

  const capturedCount = [
    checklist.where_to,
    checklist.where_from,
    checklist.who_is_coming,
    checklist.when_you_go,
    checklist.what_you_are_after,
    checklist.travel_dates,
  ].filter(Boolean).length;

  const datesRequired = !isDatesConfirmed;

  // Contextual Dynamic Suggestions based on missing fields
  let suggestions: string[] = [];
  if (activeTrip || didModifyTrip) {
    suggestions = [
      'Find me a cheaper hotel',
      'I prefer train instead of flight',
      'Change my flight',
      'Make the trip cheaper',
      'Find a 4-star resort',
    ];
  } else if (!checklist.where_to) {
    suggestions = ['Bali', 'Uttar Pradesh', 'Goa', 'Darjeeling', 'Manali'];
  } else if (!checklist.where_from) {
    suggestions = ['From Mumbai', 'From Delhi', 'From Kolkata', 'From Bangalore'];
  } else if (!checklist.who_is_coming) {
    suggestions = ['2 travelers (Couple)', '4 travelers (Family)', 'Solo traveler', '6 travelers (Friends)'];
  } else if (datesRequired) {
    if (travelMonth) {
      suggestions = [`${travelMonth.slice(0, 3)} 21 to ${travelMonth.slice(0, 3)} 26`, `${travelMonth.slice(0, 3)} 10 to ${travelMonth.slice(0, 3)} 16`, `${travelMonth} 1st week`, 'Choose exact dates'];
    } else {
      suggestions = ['Sep 21 to Sep 26', 'Oct 10 to Oct 15', 'Nov 5 to Nov 11', 'Next week for 6 days'];
    }
  } else if (!checklist.what_you_are_after) {
    suggestions = ['Budget ₹50,000', 'Budget ₹75,000', 'Budget ₹90,000', 'Budget ₹1,20,000'];
  } else {
    suggestions = ['Generate my trip', 'I prefer train', 'Make it cheaper', 'View boutique stays'];
  }

  // Conversational response
  let botReply = '';

  try {
    const prompt = `You are the TourFlow AI intelligent travel concierge.
User text: "${userText}"
Extracted state & Checklist:
- Destination: ${checklist.where_to || 'MISSING (Must be a geographic place)'}
- Origin: ${checklist.where_from || 'MISSING (Departure city)'}
- Travelers: ${checklist.who_is_coming || 'MISSING (Explicit number of travelers)'}
- Travel Dates: ${checklist.travel_dates || (travelMonth ? `Travel period is ${travelMonth}, but exact start & end dates missing` : 'MISSING')}
- Budget: ${checklist.what_you_are_after || 'MISSING (Target budget in INR)'}
- Is Ready to Generate: ${validationResult.is_ready_to_generate}
- Missing Required Fields: ${validationResult.missing_fields.join(', ') || 'None'}
- Clarification Question: ${validationResult.clarification_question || 'None'}
- Did Modify Existing Trip: ${didModifyTrip ? `Yes (${modSummary})` : 'No'}

STRICT PARAMETER EXTRACTION & VERIFICATION RULES:
1. ZERO DEFAULT FALLBACKS:
   - Do NOT assume or auto-fill values unless EXPLICITLY provided by the user.
   - If any required field (destination, origin, travelers, dates, budget) is missing, NEVER state that all parameters are verified.
2. MISSING PARAMETER CLARIFICATION FLOW:
   - If any required parameter is missing, log the parameters provided so far and ask a direct clarification question for the missing one(s).
   - Capitalize place names properly as proper nouns (e.g. "Bali", "Uttar Pradesh", "Mumbai", "Delhi").
   - CRITICAL FORMATTING MANDATE: NEVER use single asterisks around place names (e.g. NEVER write *Bali* or *Goa*). For emphasis or bolding, ALWAYS use standard markdown double asterisks (e.g. **Bali**, **Goa**).
   - NEVER start bullet points with raw asterisks (*). Use standard dashes (-) or bullet points (•).
3. COMPLETION CONFIRMATION:
   - ONLY when all 5 required parameters (destination, origin, travelers, dates, budget) are confirmed and valid (Is Ready to Generate: true), confirm all verified parameters and invite the user to click "Generate My Trip" directly below in their trip checklist.
4. Keep the response friendly, crisp, and conversational (1-2 paragraphs).`;

    const rawReply = await generateGeminiContentWithFallback({
      contents: prompt,
    });

    if (rawReply) {
      botReply = rawReply;
    }
  } catch (e) {
    console.warn('Gemini chat generate error note:', e);
  }

  if (!botReply) {
    if (didModifyTrip) {
      botReply = `Done! I've updated your trip parameters: ${modSummary}\n\nAll schedules, cost breakdowns, and live booking links on the right panel have been updated.`;
    } else if (validationResult.clarification_question) {
      botReply = validationResult.clarification_question;
    } else if (validationResult.is_ready_to_generate) {
      botReply = `Wonderful! I've logged your trip from **${checklist.where_from}** to **${checklist.where_to}** for **${checklist.who_is_coming}** (${checklist.travel_dates}, **${checklist.when_you_go}**) with **${checklist.what_you_are_after}**.\n\nAll parameters are verified. You can now click **"Generate My Trip"** directly below in your trip checklist!`;
    } else {
      botReply = `TourFlow AI is ready to plan your trip. Where would you like to travel, from where, what dates, for how many travelers, and what is your target budget?`;
    }
  }

  // Clean and sanitize any single-asterisks around words/places into double-asterisks bold, strip raw bullet asterisks
  botReply = botReply
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/(^|[^*])\*([A-Za-z0-9\s,–\-]+?)\*([^*]|$)/g, '$1**$2**$3');

  res.json({
    response: botReply,
    suggestions,
    checklist,
    captured_count: capturedCount,
    dates_required: datesRequired,
    extracted_preferences: extraction,
    updated_trip: didModifyTrip ? modifiedTrip : undefined,
  });
});
*/

// ----------------------------------------------------
// Vite Middleware & Static Server
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TourFlow AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
