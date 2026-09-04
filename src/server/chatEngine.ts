/**
 * TourFlow AI - Encapsulated Chat & Concierge Engine
 * Handles multi-turn conversations, natural language understanding,
 * parameter verification, live itinerary modifications, and context-aware responses.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  isInvalidDestination,
  parseDateRange,
  parseBudget,
  validateTripFields,
  TripValidationResult,
} from '../utils/validation';
import {
  CONCIERGE_SYSTEM_INSTRUCTION,
  EXTRACTION_SYSTEM_PROMPT,
  buildConciergeContextPrompt,
  generateSmartSuggestions,
} from './prompts/conciergePrompts';
import {
  Trip,
  TransportBookingOption,
  AccommodationOption,
  ItineraryItem,
  CostBreakdown,
} from '../types/tourflow';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot' | 'system' | 'model';
  text: string;
  timestamp?: string;
  suggestions?: string[];
  isTripUpdate?: boolean;
}

export interface ConversationSession {
  id: string;
  stage: 'discovery' | 'planning' | 'customization' | 'modification' | 'booked';
  checklist: {
    where_to?: string | null;
    where_from?: string | null;
    who_is_coming?: string | null;
    when_you_go?: string | null;
    what_you_are_after?: string | null;
    travel_dates?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    travel_month?: string | null;
    travelers?: number | null;
    budget?: number | null;
    is_dates_valid?: boolean;
    is_ready_to_generate?: boolean;
  };
  missing_fields: string[];
  history: ChatMessage[];
  last_activity: string;
}

export interface StructuredTripExtraction {
  destination: string | null;
  origin: string | null;
  travelers: number | null;
  travel_type: 'solo' | 'couple' | 'family' | 'friends' | null;
  start_date: string | null;
  end_date: string | null;
  formatted_dates: string | null;
  travel_month: string | null;
  duration_days: number | null;
  budget: number | null;
  currency: string;
  interests: string[];
  travel_style: string | null;
  accommodation_preference: string | null;
  transport_preference: 'flight' | 'train' | 'bus' | 'road' | null;
  action: 'new_trip' | 'modify_trip' | 'ask_question' | 'general_inquiry' | 'off_topic' | 'chit_chat';
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

export interface ChatEngineParams {
  message: string;
  session_context?: Record<string, any>;
  current_trip?: Trip | null;
  history?: ChatMessage[];
  tripsStore?: Trip[];
  geminiClient?: GoogleGenAI | null;
  generateGeminiContent?: (params: { contents: any; config?: any; models?: string[] }) => Promise<string | null>;
  resolveTransportOptions?: (params: any) => { selected: TransportBookingOption; alternatives: TransportBookingOption[] };
  resolveAccommodationOptions?: (params: any) => { selected: AccommodationOption; alternatives: AccommodationOption[] };
  generateCanonicalItinerary?: (params: any) => { itinerary: ItineraryItem[] };
  calculateCostBreakdown?: (
    selectedTransport: TransportBookingOption | undefined,
    selectedAccommodation: AccommodationOption | undefined,
    itinerary: ItineraryItem[],
    travelers: number,
    totalBudget: number
  ) => CostBreakdown;
}

export interface ChatEngineResult {
  response: string;
  suggestions: string[];
  checklist: ConversationSession['checklist'];
  captured_count: number;
  dates_required: boolean;
  extracted_preferences: StructuredTripExtraction;
  updated_trip?: Trip;
  session_stage?: ConversationSession['stage'];
}

function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Fallback Rule-Based Intent & Parameter Extractor
 */
export function ruleBasedExtract(text: string, currentContext?: any): StructuredTripExtraction {
  const clean = text.trim();

  // Detect off-topic queries (coding, math, general non-travel trivia)
  const isOffTopic = /\b(write (?:a )?(?:code|script|program|function|poem|story)|python|javascript|typescript|react|html|css|debug|syntax error|calculate|equation|derivative|integral|who is the president|quantum physics|capital of france)\b/i.test(clean);

  // Detect pure greetings / chit-chat / pleasantries
  const isChitChat = /^(?:hi|hello|hey|good morning|good evening|good afternoon|howdy|hola|namaste|what's up|how are you|who are you|thanks|thank you|awesome|great job|cool|ok|okay)[!.? ]*$/i.test(clean);

  if (isOffTopic) {
    return {
      destination: null,
      origin: null,
      travelers: null,
      travel_type: null,
      start_date: null,
      end_date: null,
      formatted_dates: null,
      travel_month: null,
      duration_days: null,
      budget: null,
      currency: 'INR',
      interests: [],
      travel_style: null,
      accommodation_preference: null,
      transport_preference: null,
      action: 'off_topic',
      is_dates_valid: false,
    };
  }

  if (isChitChat) {
    return {
      destination: null,
      origin: null,
      travelers: null,
      travel_type: null,
      start_date: null,
      end_date: null,
      formatted_dates: null,
      travel_month: null,
      duration_days: null,
      budget: null,
      currency: 'INR',
      interests: [],
      travel_style: null,
      accommodation_preference: null,
      transport_preference: null,
      action: 'chit_chat',
      is_dates_valid: false,
    };
  }

  let destination: string | null = null;
  const destMatches = [
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
    { name: 'Uttar Pradesh', regex: /\b(?:uttar pradesh|varanasi|kashi|ayodhya|mathura|lucknow|agra|vrindavan|prayagraj|sarnath)\b/i },
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
    { name: 'Pune', regex: /\bpune\b/i },
    { name: 'Ahmedabad', regex: /\bahmedabad\b/i },
  ];

  for (const item of destMatches) {
    if (item.regex.test(clean)) {
      destination = item.name;
      break;
    }
  }

  if (!destination) {
    const sanitizeCand = (rawCand: string): string | null => {
      if (!rawCand) return null;
      let cand = rawCand.trim();
      cand = cand.replace(/^(?:to|go|visit|travel|explore|the|a|an|for|in|at|on|from|our|my|into)\s+/i, '').trim();
      cand = cand.replace(/\s+(?:for\s+\d+.*|with\s+\d+.*|from\s+.*|in\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-z]+).*|under\s+\d+.*|on\s+\d+.*|trip|tour|vacation|holiday|days?|nights?)$/i, '').trim();
      if (!isInvalidDestination(cand) && cand.length >= 2) {
        return toTitleCase(cand);
      }
      return null;
    };

    const nlpPatterns = [
      /^(?:i\s+want\s+to\s+(?:go\s+to|visit)|plan\s+a\s+trip\s+to|plan\s+a\s+visit\s+to|trip\s+to|tour\s+to|travel\s+to|destination\s*(?:is|:))\s+([A-Za-z\s]{2,30})$/i,
      /(?:(?:want|would like|wish|plan|planning|hope|looking)\s+to\s+)?(?:go\s+to|travel\s+to|visit|head\s+to|fly\s+to|explore)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /(?:trip|tour|vacation|holiday|travel|journey|flight)\s+(?:to|for|in|around)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /(?:destination|dest|place|city|location|country)(?:\s+is|\s*:|\s+to|\s+as)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /(?:\d+\s*(?:day|days|night|nights|week|weeks))\s+(?:in|at|to|around|trip\s+to|tour\s+to)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    ];

    for (const pattern of nlpPatterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        const sanitized = sanitizeCand(match[1]);
        if (sanitized && !isInvalidDestination(sanitized)) {
          destination = sanitized;
          break;
        }
      }
    }
  }

  if (isInvalidDestination(destination)) {
    destination = null;
  }

  const dateParsed = parseDateRange(clean);
  const budget: number | null = parseBudget(clean);

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

  let travelers: number | null = null;
  let travel_type: 'solo' | 'couple' | 'family' | 'friends' | null = null;

  const peopleMatch = clean.match(/(\d+)\s*(?:people|persons|travelers|pax|members|adults|guests)/i);
  if (peopleMatch) {
    travelers = parseInt(peopleMatch[1], 10);
  }

  if (/family/i.test(clean)) {
    travel_type = 'family';
  } else if (/couple|honeymoon|partner|husband|wife/i.test(clean)) {
    travel_type = 'couple';
    if (!travelers) travelers = 2;
  } else if (/friends|gang|buddies|group/i.test(clean)) {
    travel_type = 'friends';
  } else if (/solo|myself|alone/i.test(clean)) {
    travel_type = 'solo';
    if (!travelers) travelers = 1;
  }

  let origin: string | null = null;
  const fromMatch = clean.match(/(?:from|starting from|departing from|leaving from|out of)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (fromMatch) {
    let cand = fromMatch[1].trim().replace(/\s+(?:to|in|for|with|on|during|and|or)\s*.*$/i, '').trim();
    cand = cand.replace(/^(?:from|to|in|at)\s+/i, '').trim();
    if (!isInvalidDestination(cand)) {
      origin = toTitleCase(cand);
    }
  }
  if (origin && destination && origin.toLowerCase() === destination.toLowerCase()) {
    origin = null;
  }

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

  // Detect general travel advisory questions vs planning actions
  const isGeneralInquiry = /\b(when is the best time|what is the difference|is it safe|what to pack|how is the weather|tell me about|recommendations for|things to do in|food in|places to eat|culture|visa)\b/i.test(clean);

  let action: 'new_trip' | 'modify_trip' | 'ask_question' | 'general_inquiry' | 'off_topic' | 'chit_chat' = 'new_trip';
  if (isGeneralInquiry) {
    action = 'general_inquiry';
  } else if (currentContext && (
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

/**
 * Multi-Turn Structured Intent & Parameter Extraction using Gemini
 */
export async function extractIntentWithGemini(
  userMessage: string,
  currentContext: any,
  generateGeminiContent?: (params: any) => Promise<string | null>
): Promise<StructuredTripExtraction> {
  const ruleExtraction = ruleBasedExtract(userMessage, currentContext);

  // If rule engine definitively classified pure chit-chat or off-topic, bypass extraction model
  if (ruleExtraction.action === 'chit_chat' || ruleExtraction.action === 'off_topic') {
    return ruleExtraction;
  }

  if (!generateGeminiContent) {
    return ruleExtraction;
  }

  try {
    const prompt = `${EXTRACTION_SYSTEM_PROMPT}

Analyze user input: "${userMessage}"
Active Context State: ${JSON.stringify(currentContext || {})}`;

    const rawText = await generateGeminiContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    });

    if (!rawText) return ruleExtraction;

    const parsed = JSON.parse(rawText || '{}');

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

/**
 * Master Concierge Chat Handler
 * Main entry point for the encapsulated chatbot module.
 */
export async function handleConciergeChat(params: ChatEngineParams): Promise<ChatEngineResult> {
  const {
    message,
    session_context,
    current_trip,
    history = [],
    tripsStore = [],
    generateGeminiContent,
    resolveTransportOptions,
    resolveAccommodationOptions,
    generateCanonicalItinerary,
    calculateCostBreakdown,
  } = params;

  const userText = message || '';

  // 1. Extract Structured Intent & Parameters
  const extraction = await extractIntentWithGemini(userText, current_trip || session_context, generateGeminiContent);

  const activeTrip = current_trip || null;
  let modifiedTrip = activeTrip ? JSON.parse(JSON.stringify(activeTrip)) : null;
  let didModifyTrip = false;
  let modSummary = '';

  // 2. Handle In-Place Live Modifications
  if (activeTrip && modifiedTrip && generateCanonicalItinerary && calculateCostBreakdown) {
    // 2a. Train preferred / switch to train
    if (extraction.modifications?.train_preferred || (extraction.transport_preference === 'train' && modifiedTrip.selected_transport?.mode !== 'train')) {
      const allTransports = [modifiedTrip.selected_transport, ...(modifiedTrip.transport_alternatives || [])].filter(Boolean);
      const trainOpt = allTransports.find((t: any) => t.mode === 'train') || (resolveTransportOptions ? resolveTransportOptions({
        origin: modifiedTrip.origin,
        destination: modifiedTrip.destination?.name || 'Darjeeling',
        startDate: modifiedTrip.start_date,
        travelers: modifiedTrip.traveler_count,
        targetBudget: modifiedTrip.total_budget,
        preference: 'train',
      }).selected : modifiedTrip.selected_transport);

      if (trainOpt) {
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
    }

    // 2b. Flight change / alternate flight
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

    // 2c. Cheaper Hotel
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

    // 2d. Upgrade Hotel / 4-Star / 5-Star Resort
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

    // 2e. Overall Cheaper Trip
    if (extraction.modifications?.cheaper && !extraction.modifications?.cheaper_hotel) {
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
      modSummary += `Optimized trip cost down to ₹${modifiedTrip.total_cost.toLocaleString()} while preserving your core itinerary.`;
    }

    // 2f. Explicit Budget Target Update
    const explicitBudget = extraction.budget || parseBudget(userText);
    if (explicitBudget && explicitBudget > 0 && explicitBudget !== modifiedTrip.total_budget && !extraction.modifications?.cheaper) {
      modifiedTrip.total_budget = explicitBudget;

      if (modifiedTrip.selected_accommodation && modifiedTrip.selected_accommodation.total_price > explicitBudget * 0.55 && resolveAccommodationOptions) {
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

      if (modifiedTrip.selected_transport && modifiedTrip.selected_transport.total_price > explicitBudget * 0.45 && resolveTransportOptions) {
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
      didModifyTrip = true;
      modSummary += `Updated trip target budget to ₹${explicitBudget.toLocaleString()} and balanced transport, stays, and activities.`;
    }

    // 2g. Relaxed Pace & Walking Buffers
    const lowerMsg = userText.toLowerCase();
    if (lowerMsg.includes('walking') || lowerMsg.includes('heavy walk') || lowerMsg.includes('relaxed pace') || lowerMsg.includes('easy pace')) {
      if (modifiedTrip.itinerary) {
        modifiedTrip.itinerary = modifiedTrip.itinerary.map((item: any) => {
          if (item.title?.toLowerCase().includes('trek') || item.title?.toLowerCase().includes('hike') || item.title?.toLowerCase().includes('ridge walk')) {
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

  // 3. Compute Verified Checklist State
  let whereTo = extraction.destination ? toTitleCase(extraction.destination) : null;
  if (!whereTo && session_context?.where_to && !isInvalidDestination(session_context.where_to)) {
    whereTo = toTitleCase(session_context.where_to);
  } else if (!whereTo && activeTrip?.destination?.name && !isInvalidDestination(activeTrip.destination.name)) {
    whereTo = toTitleCase(activeTrip.destination.name);
  }
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

  const startDate = extraction.start_date || (extraction.is_dates_valid ? null : session_context?.start_date) || (activeTrip ? activeTrip.start_date : null);
  const endDate = extraction.end_date || (extraction.is_dates_valid ? null : session_context?.end_date) || (activeTrip ? activeTrip.end_date : null);
  const travelDates = extraction.formatted_dates || (extraction.is_dates_valid ? null : session_context?.travel_dates) || (activeTrip ? activeTrip.formatted_dates : null);
  const travelMonth = extraction.travel_month || session_context?.travel_month || null;

  const isDatesConfirmed = Boolean(startDate && endDate && travelDates);

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

  const travelersCount = extraction.travelers || (session_context?.who_is_coming && /\d+/.test(session_context.who_is_coming) ? parseInt(session_context.who_is_coming.match(/\d+/)![0], 10) : null) || (activeTrip ? activeTrip.traveler_count : null);
  const travelType = extraction.travel_type || (session_context?.who_is_coming?.toLowerCase().includes('couple') ? 'couple' : session_context?.who_is_coming?.toLowerCase().includes('solo') ? 'solo' : session_context?.who_is_coming?.toLowerCase().includes('friends') ? 'friends' : session_context?.who_is_coming?.toLowerCase().includes('family') ? 'family' : null);

  let budgetVal: number | null = extraction.budget || null;
  if (!budgetVal && session_context?.what_you_are_after && /\d+/.test(session_context.what_you_are_after)) {
    budgetVal = parseInt(session_context.what_you_are_after.replace(/[^0-9]/g, ''), 10);
  } else if (!budgetVal && activeTrip?.total_budget) {
    budgetVal = activeTrip.total_budget;
  }

  const validationResult: TripValidationResult = validateTripFields({
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

  const checklist: ConversationSession['checklist'] = {
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

  // 4. Generate Conversational AI Reply with Multi-Turn History
  let botReply = '';
  const intentType: 'off_topic' | 'chit_chat' | 'general_inquiry' | 'plan_trip' | 'modify_trip' = 
    extraction.action === 'off_topic' ? 'off_topic' :
    extraction.action === 'chit_chat' ? 'chit_chat' :
    extraction.action === 'general_inquiry' ? 'general_inquiry' :
    didModifyTrip ? 'modify_trip' : 'plan_trip';

  if (generateGeminiContent) {
    try {
      const contextPrompt = buildConciergeContextPrompt({
        userMessage: userText,
        checklist: {
          where_to: checklist.where_to || null,
          where_from: checklist.where_from || null,
          who_is_coming: checklist.who_is_coming || null,
          when_you_go: checklist.when_you_go || null,
          what_you_are_after: checklist.what_you_are_after || null,
          travel_dates: checklist.travel_dates || null,
          travel_month: checklist.travel_month || null,
          is_ready_to_generate: Boolean(checklist.is_ready_to_generate),
        },
        missingFields: validationResult.missing_fields,
        clarificationQuestion: validationResult.clarification_question,
        didModifyTrip,
        modSummary,
        hasActiveTrip: Boolean(activeTrip),
        activeTripSummary: activeTrip ? `${activeTrip.destination?.name || 'Trip'} (${activeTrip.formatted_dates || `${activeTrip.duration_days} days`})` : undefined,
        intentType,
      });

      // Clean and normalize multi-turn conversation messages for Gemini
      const normalizedHistory: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          const h = item as any;
          const rawText = h.content || h.text || '';
          if (!rawText || typeof rawText !== 'string' || !rawText.trim()) continue;

          const rawRole = h.role || (h.sender === 'user' ? 'user' : 'model');
          const geminiRole: 'user' | 'model' = (rawRole === 'user') ? 'user' : 'model';

          if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === geminiRole) {
            normalizedHistory[normalizedHistory.length - 1].parts[0].text += `\n${rawText.trim()}`;
          } else {
            normalizedHistory.push({
              role: geminiRole,
              parts: [{ text: rawText.trim() }],
            });
          }
        }
      }

      // Ensure history starts with 'user'
      while (normalizedHistory.length > 0 && normalizedHistory[0].role !== 'user') {
        normalizedHistory.shift();
      }

      // Take the most recent turns (up to 6)
      const slicedHistory = normalizedHistory.slice(-6);
      while (slicedHistory.length > 0 && slicedHistory[0].role !== 'user') {
        slicedHistory.shift();
      }

      // Build valid alternating contents payload
      const contentsPayload: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
      if (slicedHistory.length > 0) {
        const lastTurn = slicedHistory[slicedHistory.length - 1];
        if (lastTurn.role === 'user') {
          slicedHistory.pop();
          contentsPayload.push(...slicedHistory);
          contentsPayload.push({
            role: 'user',
            parts: [{ text: contextPrompt }],
          });
        } else {
          contentsPayload.push(...slicedHistory);
          contentsPayload.push({
            role: 'user',
            parts: [{ text: contextPrompt }],
          });
        }
      } else {
        contentsPayload.push({
          role: 'user',
          parts: [{ text: contextPrompt }],
        });
      }

      const rawReply = await generateGeminiContent({
        contents: contentsPayload,
        config: {
          systemInstruction: CONCIERGE_SYSTEM_INSTRUCTION,
        },
      });

      if (rawReply && rawReply.trim()) {
        botReply = rawReply.trim();
      }
    } catch (e: any) {
      console.warn('Gemini chat generate error in chatEngine:', e?.message || e);
    }
  }

  // Fallback Response Generation if Gemini is offline or did not reply
  if (!botReply) {
    if (intentType === 'off_topic') {
      botReply = `I am **TourFlow AI**, your dedicated personal travel concierge! While I'd love to chat about everything under the sun, my true superpower is curating extraordinary trips, booking routes, and budget itineraries.\n\nWhere would you like to escape to next?`;
    } else if (intentType === 'chit_chat') {
      botReply = `Hello there! It's wonderful to connect with you. I'm **TourFlow AI**, your personal travel concierge.\n\nAre you dreaming of a mountain retreat, a sun-drenched beach vacation, or a cultural heritage getaway? Tell me where you'd like to explore!`;
    } else if (didModifyTrip) {
      botReply = `Done! I've updated your trip parameters: ${modSummary}\n\nAll schedules, cost breakdowns, and live booking links on the right panel have been updated.`;
    } else if (intentType === 'general_inquiry') {
      botReply = `TourFlow AI is delighted to assist with your travel questions. Feel free to share your destination, preferred dates, traveler group, and target budget whenever you'd like us to craft a personalized itinerary!`;
    } else if (validationResult.clarification_question) {
      botReply = validationResult.clarification_question;
    } else if (validationResult.is_ready_to_generate) {
      botReply = `Wonderful! I've logged your trip from **${checklist.where_from}** to **${checklist.where_to}** for **${checklist.who_is_coming}** (${checklist.travel_dates}, **${checklist.when_you_go}**) with **${checklist.what_you_are_after}**.\n\nAll parameters are verified. You can now click **"Generate My Trip"** directly below in your trip checklist!`;
    } else {
      botReply = `TourFlow AI is ready to plan your trip. Where would you like to travel, from where, what dates, for how many travelers, and what is your target budget?`;
    }
  }

  // 5. Post-Process & Polish Markdown Aesthetics
  botReply = botReply
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/(^|[^*])\*([A-Za-z0-9\s,–\-]+?)\*([^*]|$)/g, '$1**$2**$3');

  // 6. Generate Contextual Smart Suggestions
  const suggestions = generateSmartSuggestions({
    checklist: {
      where_to: checklist.where_to || null,
      where_from: checklist.where_from || null,
      who_is_coming: checklist.who_is_coming || null,
      when_you_go: checklist.when_you_go || null,
      what_you_are_after: checklist.what_you_are_after || null,
      travel_dates: checklist.travel_dates || null,
      travel_month: checklist.travel_month || null,
      is_ready_to_generate: Boolean(checklist.is_ready_to_generate),
    },
    hasActiveTrip: Boolean(activeTrip),
    didModifyTrip,
    intentType,
  });

  const sessionStage: ConversationSession['stage'] = activeTrip
    ? 'customization'
    : checklist.is_ready_to_generate
    ? 'planning'
    : 'discovery';

  return {
    response: botReply,
    suggestions,
    checklist,
    captured_count: capturedCount,
    dates_required: datesRequired,
    extracted_preferences: extraction,
    updated_trip: didModifyTrip ? modifiedTrip : undefined,
    session_stage: sessionStage,
  };
}
