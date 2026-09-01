/**
 * Conversational Concierge Service
 * Manages multi-turn travel planning conversations and dynamic extraction using Gemini AI.
 */

import { geminiService } from './geminiService';
import { handleConciergeChat, ChatEngineResult } from '../chatEngine';
import { logger } from '../utils/logger';

export interface ProcessChatParams {
  message: string;
  history?: any[];
  sessionContext?: any;
  currentTrip?: any;
  requestId?: string;
}

export class ConciergeService {
  /**
   * Processes conversational queries through multi-turn Gemini extraction and response orchestration.
   */
  public async processChat(params: ProcessChatParams): Promise<ChatEngineResult> {
    const { message, history = [], sessionContext, currentTrip, requestId } = params;

    logger.info('Processing concierge chat message', {
      module: 'ConciergeService',
      messageLength: message.length,
      historyTurns: history.length,
      hasCurrentTrip: Boolean(currentTrip),
      requestId,
    });

    const generateAdapter = async (payload: { contents: any; config?: any; models?: string[] }) => {
      try {
        if (payload.config?.responseSchema) {
          const structured = await geminiService.generateStructured<any>(
            payload.contents,
            payload.config.responseSchema,
            {
              systemInstruction: payload.config.systemInstruction,
              temperature: payload.config.temperature,
              requestId,
            }
          );
          return JSON.stringify(structured);
        } else if (Array.isArray(payload.contents) && payload.contents.length > 0 && payload.contents[0].role) {
          return await geminiService.generateChat(payload.contents, {
            systemInstruction: payload.config?.systemInstruction,
            temperature: payload.config?.temperature,
            requestId,
          });
        } else {
          const textPrompt = typeof payload.contents === 'string' 
            ? payload.contents 
            : JSON.stringify(payload.contents);
          return await geminiService.generateText(textPrompt, {
            systemInstruction: payload.config?.systemInstruction,
            temperature: payload.config?.temperature,
            requestId,
          });
        }
      } catch (err: any) {
        logger.warn('Concierge Gemini generation adapter caught error', {
          module: 'ConciergeService',
          requestId,
        }, err);
        return null;
      }
    };

    return handleConciergeChat({
      message,
      history,
      session_context: sessionContext,
      current_trip: currentTrip,
      geminiClient: (geminiService as any).client,
      generateGeminiContent: generateAdapter,
    });
  }
}

export const conciergeService = new ConciergeService();
