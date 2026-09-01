/**
 * AI Replanning & Disruption Mitigation Service
 * Uses Gemini Structured Output to rank alternative experiences and generate impact assessments.
 */

import { geminiService, Type } from './geminiService';
import { 
  ReplanAlternative, 
  ImpactAnalysisResult, 
  computeImpactAnalysis 
} from '../operatorEngine';
import { logger } from '../utils/logger';

export interface RankReplanParams {
  trip: any;
  disruption: { title: string; description: string };
  candidates: ReplanAlternative[];
  requestId?: string;
}

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

export class ReplanService {
  /**
   * Evaluates and dynamically ranks candidate experiences in response to a live disruption.
   */
  public async rankAlternatives(params: RankReplanParams): Promise<ReplanAlternative[]> {
    const { trip, disruption, candidates, requestId } = params;

    if (!candidates || candidates.length === 0) return [];

    if (!geminiService.isAvailable()) {
      return candidates;
    }

    try {
      const prompt = `You are the lead AI Tour Operations Specialist for Himalayan Trails.
A high-priority operational disruption occurred:
- Disruption: "${disruption.title}" - ${disruption.description}
- Trip: "${trip.title}" (${trip.traveler_count || 4} travelers, ${trip.travel_type || 'friends/group'}, total budget ₹${(trip.total_budget || 50000).toLocaleString()})
- Interests: ${JSON.stringify(trip.preferences?.interests || ['adventure', 'nature', 'mountains'])}

Here are the verified inventory candidates in the local area that are available:
${JSON.stringify(candidates, null, 2)}

TASK:
1. Rank these alternatives based on safety during the disruption, traveler profile alignment, weather resilience, and zero operational friction.
2. Provide a sharp, concise 2-sentence operator justification for why the candidate is ranked as such.
3. Assign a match_score between 50 and 99 for each option.`;

      logger.info('Ranking replan alternatives with Gemini AI', {
        module: 'ReplanService',
        tripId: trip.id,
        candidateCount: candidates.length,
        requestId,
      });

      const parsed = await geminiService.generateStructured<Array<{ id: string; match_score: number; ai_rationale: string }>>(
        prompt,
        rankingSchema,
        {
          systemInstruction: 'You are TourFlow AI operational resilience officer. Evaluate disruption recovery alternatives and return structured ranking JSON.',
          requestId,
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
      logger.warn('Gemini ranking encountered an error, falling back to heuristic score ordering', {
        module: 'ReplanService',
        tripId: trip.id,
        requestId,
      }, err);
    }

    return candidates;
  }

  /**
   * Generates dynamic impact analysis for an in-flight trip.
   */
  public generateImpactAnalysis(trip: any, disruption: { title: string; description: string }): ImpactAnalysisResult {
    return computeImpactAnalysis(trip, disruption);
  }
}

export const replanService = new ReplanService();
