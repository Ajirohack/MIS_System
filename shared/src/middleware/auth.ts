import { Request, Response, NextFunction } from 'express';
import { CryptoUtils, JWTPayload } from '../utils/crypto';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';

export interface AuthOptions {
  requireAuth?: boolean;
  permissions?: string[];
  roles?: string[];
  allowPublic?: boolean;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user information
 */
export const authenticateJWT = (options: AuthOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (options.allowPublic) {
          return next();
        }
        throw new AuthenticationError('No authorization header provided');
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        throw new AuthenticationError('Invalid authorization header format');
      }

      // Verify and decode the JWT token
      const payload = CryptoUtils.verifyAccessToken(token);
      
      // Extract user information from token
      const user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions
      };

      // Attach user to request
      req.user = user;

      // Log authentication event
      logger.info('User authenticated', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (options.allowPublic) {
        return next();
      }

      next(new AuthenticationError('Invalid or expired token'));
    }
  };
};

/**
 * Permission-based Authorization Middleware
 * Checks if the authenticated user has required permissions
 */
export const requirePermissions = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasAllPermissions = permissions.every(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        email: req.user.email,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
        path: req.path,
        method: req.method
      });

      return next(new AuthenticationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Role-based Authorization Middleware
 * Checks if the authenticated user has required role
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Role access denied', {
        userId: req.user.id,
        email: req.user.email,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });

      return next(new AuthenticationError('Insufficient role privileges'));
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Authenticates if token is provided, but doesn't require it
 */
export const optionalAuth = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return next();
      }

      // Verify and decode the JWT token
      const payload = CryptoUtils.verifyAccessToken(token);
      
      // Extract user information from token
      const user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions
      };

      // Attach user to request
      req.user = user;

      logger.debug('Optional authentication successful', {
        userId: user.id,
        email: user.email
      });

      next();
    } catch (error) {
      // For optional auth, we just continue without authentication
      logger.debug('Optional authentication failed, continuing as anonymous', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next();
    }
  };
};

/**
 * API Key Authentication Middleware
 * Validates API keys for service-to-service communication
 */
export const authenticateApiKey = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new AuthenticationError('API key required');
      }

      // TODO: Implement API key validation logic
      // This would typically involve:
      // 1. Looking up the API key in the database
      // 2. Validating the key hash
      // 3. Checking if the key is active and not expired
      // 4. Extracting permissions from the API key

      // For now, we'll just validate the format
      if (apiKey.length < 32) {
        throw new AuthenticationError('Invalid API key format');
      }

      // Mock user for API key authentication
      req.user = {
        id: 'api-user',
        email: 'api@membership-platform.com',
        role: 'api',
        permissions: ['api:access']
      };

      logger.info('API key authentication successful', {
        apiKeyId: apiKey.substring(0, 8) + '...',
        ipAddress: req.ip
      });

      next();
    } catch (error) {
      logger.warn('API key authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip
      });

      next(new AuthenticationError('Invalid API key'));
    }
  };
};

/**
 * Session Validation Middleware
 * Validates user sessions and handles session expiry
 */
export const validateSession = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }

      // TODO: Implement session validation logic
      // This would typically involve:
      // 1. Checking if the session exists in Redis/database
      // 2. Validating session expiry
      // 3. Updating last activity timestamp
      // 4. Handling session revocation

      // For now, we'll just log the session validation
      logger.debug('Session validation successful', {
        userId: req.user.id,
        sessionId: req.headers['x-session-id']
      });

      next();
    } catch (error) {
      logger.warn('Session validation failed', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(new AuthenticationError('Invalid session'));
    }
  };
};

/**
 * Rate Limiting Middleware
 * Implements rate limiting based on user authentication
 */
export const rateLimitByUser = (options: { windowMs: number; maxRequests: number }) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.user?.id || req.ip;
      
      // TODO: Implement rate limiting logic
      // This would typically involve:
      // 1. Using Redis to track request counts
      // 2. Implementing sliding window or fixed window rate limiting
      // 3. Setting appropriate headers for rate limit information
      // 4. Handling rate limit exceeded responses

      logger.debug('Rate limit check passed', {
        identifier,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Continue processing even if rate limiting fails
      next();
    }
  };
};

/**
 * Request Context Middleware
 * Adds request context information for logging and tracking
 */
export const addRequestContext = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 
                     req.headers['x-correlation-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    req.context = {
      requestId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.headers['x-session-id'] as string
    };

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}; 