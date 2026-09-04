/**
 * Enterprise Structured Logger
 * Provides ISO timestamped, leveled, context-enriched logging with timing metrics.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  module?: string;
  requestId?: string;
  tripId?: string;
  model?: string;
  durationMs?: number;
  attempt?: number;
  [key: string]: any;
}

class StructuredLogger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: any): string {
    const timestamp = new Date().toISOString();
    const entry: Record<string, any> = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (error) {
      entry.error = {
        name: error.name || 'Error',
        message: error.message || String(error),
        status: error.status,
        statusCode: error.statusCode,
        code: error.code,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    return JSON.stringify(entry);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug' || this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: LogContext, error?: any): void {
    console.warn(this.formatMessage('WARN', message, context, error));
  }

  error(message: string, context?: LogContext, error?: any): void {
    console.error(this.formatMessage('ERROR', message, context, error));
  }

  time(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

export const logger = new StructuredLogger();
