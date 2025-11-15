import { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorUtils } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';

/**
 * Global Error Handler Middleware
 * Handles all errors and provides consistent error responses
 */
export const errorHandler = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Log the error
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.context?.requestId
    });

    // Handle known application errors
    if (ErrorUtils.isKnownError(error)) {
      const statusCode = ErrorUtils.getHttpStatus(error);
      const errorResponse = ErrorUtils.createErrorResponse(error);

      // Set response headers
      res.status(statusCode);
      res.setHeader('Content-Type', 'application/json');

      // Add request ID to response if available
      if (req.context?.requestId) {
        res.setHeader('X-Request-ID', req.context.requestId);
      }

      res.json(errorResponse);
      return;
    }

    // Handle validation errors from Zod
    if (error.name === 'ZodError') {
      const validationErrors = (error as any).errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: err.received
      }));

      logger.warn('Validation error', {
        errors: validationErrors,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.context?.requestId
      });

      res.status(400);
      res.setHeader('Content-Type', 'application/json');
      
      if (req.context?.requestId) {
        res.setHeader('X-Request-ID', req.context.requestId);
      }

      res.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { errors: validationErrors },
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId
        }
      });
      return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      logger.warn('JWT validation error', {
        error: error.message,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.context?.requestId
      });

      res.status(401);
      res.setHeader('Content-Type', 'application/json');
      
      if (req.context?.requestId) {
        res.setHeader('X-Request-ID', req.context.requestId);
      }

      res.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId
        }
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('JWT token expired', {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.context?.requestId
      });

      res.status(401);
      res.setHeader('Content-Type', 'application/json');
      
      if (req.context?.requestId) {
        res.setHeader('X-Request-ID', req.context.requestId);
      }

      res.json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId
        }
      });
      return;
    }

    // Handle database errors
    if (error.name === 'QueryFailedError' || error.name === 'EntityNotFoundError') {
      logger.error('Database error', {
        error: error.message,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        requestId: req.context?.requestId
      });

      res.status(500);
      res.setHeader('Content-Type', 'application/json');
      
      if (req.context?.requestId) {
        res.setHeader('X-Request-ID', req.context.requestId);
      }

      res.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
          timestamp: new Date().toISOString(),
          requestId: req.context?.requestId
        }
      });
      return;
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    
    if (req.context?.requestId) {
      res.setHeader('X-Request-ID', req.context.requestId);
    }

    res.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.context?.requestId
      }
    });
  } catch (handlerError) {
    // If error handler itself fails, send a simple error response
    logger.error('Error handler failed', {
      originalError: error.message,
      handlerError: handlerError instanceof Error ? handlerError.message : 'Unknown error'
    });

    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req: AuthenticatedRequest, res: Response): void => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.context?.requestId
  });

  res.status(404);
  res.setHeader('Content-Type', 'application/json');
  
  if (req.context?.requestId) {
    res.setHeader('X-Request-ID', req.context.requestId);
  }

  res.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.context?.requestId
    }
  });
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch unhandled promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request Timeout Handler
 * Handles requests that exceed the timeout limit
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      logger.warn('Request timeout', {
        path: req.path,
        method: req.method,
        timeoutMs,
        userId: req.user?.id,
        requestId: req.context?.requestId
      });

      if (!res.headersSent) {
        res.status(408);
        res.setHeader('Content-Type', 'application/json');
        
        if (req.context?.requestId) {
          res.setHeader('X-Request-ID', req.context.requestId);
        }

        res.json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timestamp: new Date().toISOString(),
            requestId: req.context?.requestId
          }
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Security Error Handler
 * Handles security-related errors and logs them appropriately
 */
export const securityErrorHandler = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Log security events with higher priority
  logger.warn('Security event detected', {
    error: error.message,
    path: req.path,
    method: req.method,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.context?.requestId
  });

  // Continue to the main error handler
  next(error);
};

/**
 * Graceful Shutdown Handler
 * Handles graceful shutdown of the application
 */
export const gracefulShutdown = (server: any) => {
  return (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
}; 