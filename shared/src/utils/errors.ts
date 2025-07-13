export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Invitation errors
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  INVITATION_INVALID = 'INVITATION_INVALID',
  INVITATION_ALREADY_USED = 'INVITATION_ALREADY_USED',
  INVITATION_LIMIT_EXCEEDED = 'INVITATION_LIMIT_EXCEEDED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: Error;
  timestamp: Date;
  requestId?: string;
  userId?: string;
}

export abstract class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {},
    cause?: Error,
    requestId?: string,
    userId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.userId = userId;

    if (cause) {
      this.cause = cause;
    }

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      cause: this.cause,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId
    };
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error, requestId?: string, userId?: string) {
    super(ErrorCode.UNAUTHORIZED, message, details, cause, requestId, userId);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error, requestId?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, details, cause, requestId);
  }
}

export class ResourceNotFoundError extends BaseError {
  constructor(resource: string, id: string, requestId?: string) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} with id ${id} not found`,
      { resource, id },
      undefined,
      requestId
    );
  }
}

export class ResourceConflictError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, requestId?: string) {
    super(ErrorCode.RESOURCE_CONFLICT, message, details, undefined, requestId);
  }
}

export class InvitationError extends BaseError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>, requestId?: string) {
    super(code, message, details, undefined, requestId);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, retryAfter?: number, requestId?: string) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      { retryAfter },
      undefined,
      requestId
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error, requestId?: string) {
    super(ErrorCode.DATABASE_ERROR, message, details, cause, requestId);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(service: string, message: string, details?: Record<string, unknown>, cause?: Error, requestId?: string) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service} service error: ${message}`,
      { service, ...details },
      cause,
      requestId
    );
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error, requestId?: string) {
    super(ErrorCode.INTERNAL_SERVER_ERROR, message, details, cause, requestId);
  }
}

// Error utility functions
export class ErrorUtils {
  /**
   * Check if an error is a known application error
   */
  static isKnownError(error: unknown): error is BaseError {
    return error instanceof BaseError;
  }

  /**
   * Get HTTP status code for error
   */
  static getHttpStatus(error: BaseError): number {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_CREDENTIALS:
      case ErrorCode.TOKEN_EXPIRED:
      case ErrorCode.INVALID_TOKEN:
        return 401;
      case ErrorCode.INSUFFICIENT_PERMISSIONS:
        return 403;
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
        return 400;
      case ErrorCode.RESOURCE_NOT_FOUND:
        return 404;
      case ErrorCode.RESOURCE_ALREADY_EXISTS:
      case ErrorCode.RESOURCE_CONFLICT:
        return 409;
      case ErrorCode.INVITATION_EXPIRED:
      case ErrorCode.INVITATION_INVALID:
      case ErrorCode.INVITATION_ALREADY_USED:
      case ErrorCode.INVITATION_LIMIT_EXCEEDED:
        return 400;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503;
      case ErrorCode.EXTERNAL_SERVICE_ERROR:
      case ErrorCode.EMAIL_SERVICE_ERROR:
        return 502;
      case ErrorCode.INTERNAL_SERVER_ERROR:
      case ErrorCode.DATABASE_ERROR:
      default:
        return 500;
    }
  }

  /**
   * Create a safe error response for API
   */
  static createErrorResponse(error: BaseError): Record<string, unknown> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(isDevelopment && { details: error.details, stack: error.stack })
      },
      timestamp: error.timestamp.toISOString(),
      requestId: error.requestId
    };
  }

  /**
   * Log error with context
   */
  static logError(error: BaseError, context?: Record<string, unknown>): void {
    // This will be implemented when we have the logger
    console.error('Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId,
      userId: error.userId,
      ...context
    });
  }
} 