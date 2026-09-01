/**
 * Enterprise Gemini Service Layer
 * Production-grade integration with the official @google/genai SDK.
 * Features:
 * - Singleton Client Management
 * - Exponential Backoff with Jitter for HTTP 429 / 503 resilience
 * - Model Cascading Fallbacks
 * - Type-Safe Structured Outputs
 * - Non-blocking Async Execution
 */

import { GoogleGenAI, Type } from '@google/genai';
import { geminiConfig, isGeminiConfigured } from '../config/geminiConfig';
import { logger } from '../utils/logger';

export interface GeminiRequestOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string;
  responseSchema?: any;
  systemInstruction?: string;
  timeoutMs?: number;
  requestId?: string;
}

export interface ChatMessagePart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

export class GeminiService {
  private static instance: GeminiService | null = null;
  private client: GoogleGenAI | null = null;

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private initializeClient(): void {
    if (geminiConfig.apiKey) {
      try {
        this.client = new GoogleGenAI({
          apiKey: geminiConfig.apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-tourflow-production',
            },
          },
        });
        logger.info('Gemini Client successfully initialized', {
          module: 'GeminiService',
          primaryModel: geminiConfig.primaryModel,
        });
      } catch (err: any) {
        logger.error('Failed to initialize Gemini Client', { module: 'GeminiService' }, err);
      }
    } else {
      logger.warn('Gemini API Key is not set in environment. Running in passive mode.', {
        module: 'GeminiService',
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.client && isGeminiConfigured());
  }

  /**
   * Helper to sleep for exponential backoff with jitter
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculates exponential backoff with full jitter to avoid thundering herd problem
   */
  private calculateBackoff(attempt: number): number {
    const base = geminiConfig.initialBackoffMs;
    const max = geminiConfig.maxBackoffMs;
    const exponential = Math.min(max, base * Math.pow(2, attempt));
    // Full jitter: random value between 0 and exponential
    return Math.floor(Math.random() * exponential);
  }

  /**
   * Evaluates whether an error is transient and retryable (Rate limit 429, Unavailable 503, Timeout, Network reset)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const status = error.status || error.statusCode || error.response?.status;
    if (status === 429 || status === 503 || status === 504 || status === 500) return true;

    const msg = (error.message || String(error)).toLowerCase();
    if (
      msg.includes('rate limit') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota') ||
      msg.includes('overloaded') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('fetch failed')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Core execution loop with exponential backoff and model cascade
   */
  public async executeWithResilience<T>(
    operation: (model: string) => Promise<T>,
    options?: { requestId?: string; preferredModel?: string }
  ): Promise<T> {
    if (!this.client) {
      this.initializeClient();
      if (!this.client) {
        throw new Error('Gemini API is not configured or unavailable.');
      }
    }

    const modelsToTry = [
      options?.preferredModel || geminiConfig.primaryModel,
      ...geminiConfig.fallbackModels.filter(
        (m) => m !== (options?.preferredModel || geminiConfig.primaryModel)
      ),
    ];

    let lastError: any = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];
      const maxRetries = geminiConfig.maxRetries;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const getDuration = logger.time();
        try {
          logger.debug('Executing Gemini request attempt', {
            module: 'GeminiService',
            model: currentModel,
            attempt: attempt + 1,
            requestId: options?.requestId,
          });

          const result = await operation(currentModel);

          logger.info('Gemini request completed successfully', {
            module: 'GeminiService',
            model: currentModel,
            durationMs: getDuration(),
            attempt: attempt + 1,
            requestId: options?.requestId,
          });

          return result;
        } catch (error: any) {
          lastError = error;
          const durationMs = getDuration();
          const isRetryable = this.isRetryableError(error);

          logger.warn('Gemini request encountered error', {
            module: 'GeminiService',
            model: currentModel,
            attempt: attempt + 1,
            durationMs,
            isRetryable,
            requestId: options?.requestId,
          }, error);

          if (isRetryable && attempt < maxRetries) {
            const backoffMs = this.calculateBackoff(attempt);
            logger.info(`Applying backoff retry in ${backoffMs}ms...`, {
              module: 'GeminiService',
              model: currentModel,
              attempt: attempt + 1,
              backoffMs,
            });
            await this.sleep(backoffMs);
          } else {
            // Break from inner retry loop and cascade to next model
            break;
          }
        }
      }
    }

    logger.error('All Gemini model candidates and retry attempts exhausted', {
      module: 'GeminiService',
      requestId: options?.requestId,
    }, lastError);

    throw lastError || new Error('All Gemini generation attempts failed.');
  }

  /**
   * Generates free-form text with parameters and optional system instruction
   */
  public async generateText(
    prompt: string,
    options?: GeminiRequestOptions
  ): Promise<string> {
    return this.executeWithResilience(
      async (model: string) => {
        if (!this.client) throw new Error('Gemini Client not initialized');

        const config: any = {
          temperature: options?.temperature ?? geminiConfig.defaultTemperature,
          maxOutputTokens: options?.maxOutputTokens ?? geminiConfig.maxOutputTokens,
          topP: options?.topP ?? geminiConfig.topP,
        };

        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error(`Empty response returned from model ${model}`);
        }
        return text;
      },
      { requestId: options?.requestId, preferredModel: options?.model }
    );
  }

  /**
   * Generates multi-turn chat responses
   */
  public async generateChat(
    messages: ChatMessage[],
    options?: GeminiRequestOptions
  ): Promise<string> {
    return this.executeWithResilience(
      async (model: string) => {
        if (!this.client) throw new Error('Gemini Client not initialized');

        const config: any = {
          temperature: options?.temperature ?? geminiConfig.conversationalTemperature,
          maxOutputTokens: options?.maxOutputTokens ?? geminiConfig.maxOutputTokens,
          topP: options?.topP ?? geminiConfig.topP,
        };

        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        const response = await this.client.models.generateContent({
          model,
          contents: messages,
          config,
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error(`Empty chat response from model ${model}`);
        }
        return text;
      },
      { requestId: options?.requestId, preferredModel: options?.model }
    );
  }

  /**
   * Generates type-safe structured JSON responses validated against schema
   */
  public async generateStructured<T>(
    contents: string | ChatMessage[],
    schema: any,
    options?: GeminiRequestOptions
  ): Promise<T> {
    return this.executeWithResilience(
      async (model: string) => {
        if (!this.client) throw new Error('Gemini Client not initialized');

        const config: any = {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: options?.temperature ?? geminiConfig.structuredTemperature,
          maxOutputTokens: options?.maxOutputTokens ?? geminiConfig.maxOutputTokens,
          topP: options?.topP ?? geminiConfig.topP,
        };

        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        const response = await this.client.models.generateContent({
          model,
          contents,
          config,
        });

        const rawText = response.text?.trim();
        if (!rawText) {
          throw new Error(`Empty structured response from model ${model}`);
        }

        let cleaned = rawText;
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

        const parsed = JSON.parse(cleaned.trim()) as T;
        return parsed;
      },
      { requestId: options?.requestId, preferredModel: options?.model }
    );
  }
}

export const geminiService = GeminiService.getInstance();
export { Type };
