/**
 * Gemini Service Configuration Management
 * Strictly abstracts API keys, model designations, and hyperparameter tuning into environment variables.
 */

import dotenv from 'dotenv';
dotenv.config();

export interface GeminiConfig {
  apiKey: string | undefined;
  primaryModel: string;
  fallbackModels: string[];
  defaultTemperature: number;
  conversationalTemperature: number;
  structuredTemperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  timeoutMs: number;
}

function parseEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvFloat(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvArray(key: string, defaultValue: string[]): string[] {
  const val = process.env[key];
  if (!val) return defaultValue;
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const geminiConfig: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  primaryModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  fallbackModels: parseEnvArray('GEMINI_FALLBACK_MODELS', [
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ]),
  defaultTemperature: parseEnvFloat('GEMINI_TEMPERATURE', 1.0),
  conversationalTemperature: parseEnvFloat('GEMINI_CONVERSATIONAL_TEMPERATURE', 1.0),
  structuredTemperature: parseEnvFloat('GEMINI_STRUCTURED_TEMPERATURE', 1.0),
  maxOutputTokens: parseEnvInt('GEMINI_MAX_OUTPUT_TOKENS', 4096),
  topP: parseEnvFloat('GEMINI_TOP_P', 0.95),
  topK: parseEnvInt('GEMINI_TOP_K', 40),
  maxRetries: parseEnvInt('GEMINI_MAX_RETRIES', 3),
  initialBackoffMs: parseEnvInt('GEMINI_INITIAL_BACKOFF_MS', 1000),
  maxBackoffMs: parseEnvInt('GEMINI_MAX_BACKOFF_MS', 10000),
  timeoutMs: parseEnvInt('GEMINI_TIMEOUT_MS', 30000),
};

export function isGeminiConfigured(): boolean {
  return Boolean(geminiConfig.apiKey && geminiConfig.apiKey.trim().length > 0);
}
