/**
 * Centralized logging utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  userId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  info(message: string, data?: any) {
    const entry = this.formatMessage('info', message, data);
    console.log(`[INFO] ${entry.timestamp}:`, message, data || '');
    this.sendToServer(entry);
  }

  warn(message: string, data?: any) {
    const entry = this.formatMessage('warn', message, data);
    console.warn(`[WARN] ${entry.timestamp}:`, message, data || '');
    this.sendToServer(entry);
  }

  error(message: string, error?: Error | any) {
    const entry = this.formatMessage('error', message, {
      error: error?.message || error,
      stack: error?.stack,
    });
    console.error(`[ERROR] ${entry.timestamp}:`, message, error);
    this.sendToServer(entry);
  }

  debug(message: string, data?: any) {
    if (!this.isDevelopment) return;
    const entry = this.formatMessage('debug', message, data);
    console.debug(`[DEBUG] ${entry.timestamp}:`, message, data || '');
  }

  private async sendToServer(entry: LogEntry) {
    // Only send errors and warnings to server in production
    if (this.isDevelopment || (entry.level !== 'error' && entry.level !== 'warn')) {
      return;
    }

    try {
      // Send to your logging service (e.g., Sentry, LogRocket, etc.)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Silently fail if logging endpoint is not available
      });
    } catch {
      // Don't let logging errors break the app
    }
  }

  /**
   * Track user actions for analytics
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (this.isDevelopment) {
      console.log(`[EVENT] ${eventName}:`, properties);
      return;
    }

    try {
      // Send to analytics service
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          properties,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}
  }
}

export const logger = new Logger();

/**
 * Error boundary helper
 */
export function logError(error: Error, errorInfo?: any) {
  logger.error('React Error Boundary', {
    error: error.message,
    stack: error.stack,
    errorInfo,
  });
}
