import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  service?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private logger: winston.Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || LogLevel.INFO;
    const isDevelopment = process.env.NODE_ENV === 'development';

    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format,
      defaultMeta: { service: 'membership-platform' },
      transports: [
        new winston.transports.Console({
          format: isDevelopment ? consoleFormat : format
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: LogLevel.ERROR,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Log API request
   */
  logRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `${method} ${url} - ${statusCode} (${duration}ms)`, {
      ...context,
      method,
      url,
      statusCode,
      duration
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(event: string, userId: string, success: boolean, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Auth event: ${event}`, {
      ...context,
      userId,
      success,
      event
    });
  }

  /**
   * Log database operation
   */
  logDbOperation(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table} (${duration}ms)`, {
      ...context,
      operation,
      table,
      duration
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for creating child loggers
export { Logger }; 