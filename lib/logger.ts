/**
 * Structured Logging System
 * Air-gapped compliant: no external logging services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  correlationId?: string;
  [key: string]: any;
}

class Logger {
  private service: string;
  private logLevel: LogLevel;
  private logFormat: 'json' | 'text';

  constructor(service: string = 'munin') {
    this.service = service;
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.logFormat = (process.env.LOG_FORMAT as 'json' | 'text') || 'text';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    if (this.logFormat === 'json') {
      return JSON.stringify(entry);
    }
    
    // Text format
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    const extras = Object.entries(entry)
      .filter(([key]) => !['timestamp', 'level', 'message', 'service'].includes(key))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');
    
    return `[${timestamp}] ${level} ${message}${extras ? ' ' + extras : ''}`;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...meta,
    };

    const formatted = this.formatLog(entry);
    
    // Output to console (in production, would write to file/log aggregation)
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | Record<string, any>) {
    const meta: Record<string, any> = {};
    
    if (error instanceof Error) {
      meta.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    } else if (error) {
      Object.assign(meta, error);
    }
    
    this.log('error', message, meta);
  }

  // Create child logger with correlation ID
  child(correlationId: string): Logger {
    const childLogger = new Logger(this.service);
    childLogger.log = (level: LogLevel, message: string, meta?: Record<string, any>) => {
      this.log(level, message, { ...meta, correlationId });
    };
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating custom loggers
export { Logger };
