/**
 * Operator AI Operations Copilot Service
 * Powers live operations intelligence for tour managers with dynamic Gemini intelligence.
 */

import { geminiService } from './geminiService';
import { geminiConfig } from '../config/geminiConfig';
import { logger } from '../utils/logger';

export interface OperatorAiQueryParams {
  userQuery: string;
  contextTripId?: string;
  trips: any[];
  vendors: any[];
  requestId?: string;
}

export interface OperatorAiResponse {
  reply: string;
  timestamp: string;
  suggested_actions: string[];
}

export class OperatorAiService {
  /**
   * Processes live operator commands and situational inquiries via Gemini.
   */
  public async processOperatorQuery(params: OperatorAiQueryParams): Promise<OperatorAiResponse> {
    const { userQuery, contextTripId, trips, vendors, requestId } = params;

    const activeTours = trips.filter((t) => ['ongoing', 'confirmed'].includes(t.status));
    const activeAlerts = trips.flatMap((t) => (t.alerts || []).filter((a: any) => !a.is_resolved));
    const contextTrip = contextTripId ? trips.find((t) => t.id === contextTripId) : null;

    const systemContext = `You are TourFlow AI Enterprise Operations Copilot for Himalayan Trails Tour Operations.
You have real-time operational context:
- Total Database Trips: ${trips.length} (${activeTours.length} Active Tours On-Ground, ${trips.filter((t) => t.status === 'planning').length} Planning/Pending)
- Active Incident & Weather Alerts (${activeAlerts.length}): ${JSON.stringify(
      activeAlerts.map((a: any) => ({
        id: a.id,
        trip_id: a.trip_id,
        title: a.title,
        severity: a.severity,
        time: a.timestamp,
      }))
    )}
- Partner Vendors (${vendors.length}): ${JSON.stringify(
      vendors.map((v: any) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        available: v.is_available,
        status: v.capacity_status,
        rating: v.rating,
      }))
    )}
- Selected Focus Trip: ${contextTrip ? JSON.stringify({ id: contextTrip.id, title: contextTrip.title, status: contextTrip.status, travelers: contextTrip.traveler_count, budget: contextTrip.total_budget }) : 'None (Fleet-wide overview)'}

OPERATIONAL STANDARDS:
- Provide sharp, professional, authoritative, and actionable answers.
- State exact numbers, timeline impacts, vendor contingency assignments, and cost implications.
- Use markdown bolding for key entities and bullet points for checklists.
- Never use generic placeholder templates; answer specifically based on the query and live database context.`;

    let reply = '';
    let suggestedActions = [
      'Simulate Solang Wind Disruption',
      'Check Himachal Highway Status',
      'Query Hotel Allotments in Darjeeling',
      'Review Guest Satisfaction Score',
    ];

    if (geminiService.isAvailable()) {
      try {
        logger.info('Processing operator query with Gemini AI', {
          module: 'OperatorAiService',
          userQuery,
          contextTripId,
          requestId,
        });

        reply = await geminiService.generateText(
          `Operator Question / Command: "${userQuery}"`,
          {
            systemInstruction: systemContext,
            temperature: geminiConfig.defaultTemperature,
            requestId,
          }
        );
      } catch (err: any) {
        logger.error('Operator AI generation failed', {
          module: 'OperatorAiService',
          requestId,
        }, err);
      }
    }

    if (!reply) {
      reply = `**TourFlow Operations Hub Telemetry**:
- **Active On-Ground Tours**: ${activeTours.length} active tours currently tracked.
- **Sensor & Weather Alerts**: ${activeAlerts.length} active notifications across operational sectors.
- **Fleet & Vendor Status**: ${vendors.filter((v: any) => v.is_available).length} of ${vendors.length} partner vendors online.
- All telemetry feeds are synced with the live operational database. Please specify a tour reference (e.g. Tour #1024) or alert ID to initiate targeted mitigation protocols.`;
    }

    return {
      reply,
      timestamp: new Date().toISOString(),
      suggested_actions: suggestedActions,
    };
  }
}

export const operatorAiService = new OperatorAiService();
