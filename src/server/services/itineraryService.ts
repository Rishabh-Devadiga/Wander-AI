/**
 * Itinerary Synthesis Service
 * Utilizes Gemini Structured Output to generate authentic, non-repetitive, budget-compliant daily itineraries.
 */

import { geminiService, Type } from './geminiService';
import { 
  validateAndEnforceItinerary, 
  RawDayPlanItem 
} from '../itineraryEngine';
import { 
  ItineraryItem, 
  TransportBookingOption, 
  AccommodationOption 
} from '../../types/tourflow';
import { logger } from '../utils/logger';

export interface GenerateItineraryParams {
  tripId: string;
  destName: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  travelerCount: number;
  travelType: string;
  totalBudget: number;
  origin: string;
  transport: TransportBookingOption;
  accommodation: AccommodationOption;
  dailyAccommodations?: Array<{ day_number: number; hotel: AccommodationOption }>;
  interests?: string[];
  budgetTier?: 'budget' | 'moderate' | 'luxury';
  requestId?: string;
}

const itineraryItemSchema = {
  type: Type.OBJECT,
  properties: {
    day: { type: Type.INTEGER },
    title: { type: Type.STRING },
    type: { 
      type: Type.STRING,
      enum: ['activity', 'sightseeing', 'meal', 'leisure', 'transport', 'hotel']
    },
    location: { type: Type.STRING },
    startTime: { type: Type.STRING },
    endTime: { type: Type.STRING },
    duration: { type: Type.STRING },
    estimatedCost: { type: Type.INTEGER },
    description: { type: Type.STRING },
  },
  required: ['day', 'title', 'type', 'location', 'startTime', 'endTime', 'estimatedCost', 'description'],
};

const itineraryListSchema = {
  type: Type.ARRAY,
  items: itineraryItemSchema,
};

export class ItineraryService {
  /**
   * Generates a complete, structured day-by-day itinerary using the Gemini API.
   */
  public async generateItinerary(params: GenerateItineraryParams): Promise<ItineraryItem[]> {
    const {
      tripId,
      destName,
      durationDays,
      startDate,
      endDate,
      travelerCount,
      travelType,
      totalBudget,
      origin,
      transport,
      accommodation,
      dailyAccommodations,
      interests = ['sightseeing', 'culture', 'nature', 'scenic_views'],
      budgetTier = 'moderate',
      requestId,
    } = params;

    const remainingActivityBudget = Math.max(
      1000,
      Math.round(totalBudget - (transport.total_price || 0) - (accommodation.total_price || 0))
    );

    const prompt = `You are the master travel itinerary architect for TourFlow AI.
Generate a structured, complete, realistic, and strictly NON-REPETITIVE day-by-day itinerary for:
- Destination: "${destName}"
- EXACT Requested Duration: ${durationDays} days (Day 1 through Day ${durationDays})
- Origin: ${origin}
- Dates: ${startDate || 'Sep 21, 2026'} to ${endDate || 'Sep 26, 2026'}
- Travelers: ${travelerCount} (${travelType})
- Total Target Budget: ₹${totalBudget.toLocaleString()} (Transport: ₹${(transport.total_price || 0).toLocaleString()}, Hotel: ₹${(accommodation.total_price || 0).toLocaleString()})
- Interests: ${interests.join(', ')}
- Transport Mode: ${transport.mode} (${transport.operator}, arrives at destination hub ${transport.transit_hub} at ${transport.arrival_time})
- Hotel: ${accommodation.name} (${accommodation.location})

STRICT MANDATES:
1. STRICT BUDGET ADHERENCE: All activity and experience costs combined MUST be economical and stay strictly within the remaining budget pool (approx ₹${remainingActivityBudget.toLocaleString()}). Each individual activity estimatedCost should be between ₹200 and ₹1200 for ${travelerCount} travelers.
2. FULL DURATION: You MUST generate 3 to 4 distinct items for every single day from Day 1 to Day ${durationDays}.
3. ZERO REPETITION: Do NOT repeat the same attraction, activity, viewpoint, temple, tea estate, or restaurant across different days. Every day must feature completely different, authentic attractions of ${destName}.
4. GEOGRAPHICAL CLUSTERING: Group attractions on the same day that are geographically close to each other. Do not zigzag across the city.
5. LOGICAL PROGRESSION:
   - Day 1: Arrival, transit to hotel, check-in, leisure stroll nearby (e.g. Mall Road / beach sunset), and welcome dinner.
   - Middle Days (Day 2 to Day ${durationDays - 1}): Clustered thematic day trips (e.g., sunrise/monuments, tea gardens/plantations, adventure/nature trails, waterfalls/lake excursions, heritage arts).
   - Final Day (Day ${durationDays}): Morning botanical gardens or artisan market shopping, checkout, and homeward transit.
6. REALISTIC NON-OVERLAPPING TIME SLOTS:
   - Provide realistic "startTime" and "endTime" (e.g. "09:00 AM", "12:30 PM").
   - Include realistic durations and realistic estimated costs in INR for ${travelerCount} people.`;

    let rawItems: RawDayPlanItem[] = [];

    if (geminiService.isAvailable()) {
      try {
        logger.info('Generating AI structured itinerary with Gemini', {
          module: 'ItineraryService',
          destName,
          durationDays,
          tripId,
          requestId,
        });

        rawItems = await geminiService.generateStructured<RawDayPlanItem[]>(
          prompt,
          itineraryListSchema,
          {
            systemInstruction: 'You are TourFlow AI master itinerary generator. Return only a validated JSON array of structured day items conforming strictly to schema.',
            requestId,
          }
        );
      } catch (err: any) {
        logger.warn('Gemini structured generation fallback to validated knowledge base engine', {
          module: 'ItineraryService',
          tripId,
          requestId,
        }, err);
      }
    }

    // Enforce consistency, deduplication, photo curation, and buffer validations
    return validateAndEnforceItinerary({
      tripId,
      destName,
      durationDays,
      startDate,
      endDate,
      transport,
      accommodation,
      dailyAccommodations,
      rawItems,
      travelerCount,
      budgetTier,
      totalBudget,
    });
  }
}

export const itineraryService = new ItineraryService();
