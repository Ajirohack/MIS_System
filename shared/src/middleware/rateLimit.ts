import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: AuthenticatedRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
}>();

/**
 * Rate Limiting Middleware
 * Implements sliding window rate limiting
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    keyGenerator = (req) => req.user?.id || req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get current rate limit info
      const current = rateLimitStore.get(key);
      
      if (current && current.resetTime > now) {
        // Within current window
        if (current.count >= maxRequests) {
          const retryAfter = Math.ceil((current.resetTime - now) / 1000);
          
          logger.warn('Rate limit exceeded', {
            key,
            limit: maxRequests,
            windowMs,
            retryAfter,
            ipAddress: req.ip,
            userId: req.user?.id,
            path: req.path,
            method: req.method
          });

          // Set rate limit headers
          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', current.resetTime);
          res.setHeader('Retry-After', retryAfter);

          const rateLimitError = new RateLimitError(
            message,
            retryAfter,
            req.context?.requestId
          );

          return next(rateLimitError);
        }

        // Increment count
        current.count++;
        rateLimitStore.set(key, current);
      } else {
        // New window or expired window
        const resetTime = now + windowMs;
        rateLimitStore.set(key, {
          count: 1,
          resetTime
        });
      }

      // Set rate limit headers
      const currentInfo = rateLimitStore.get(key)!;
      const remaining = Math.max(0, maxRequests - currentInfo.count);
      
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', currentInfo.resetTime);

      // Handle response
      const originalSend = res.send;
      res.send = function(body) {
        const isSuccess = res.statusCode < 400;
        
        if ((isSuccess && skipSuccessfulRequests) || (!isSuccess && skipFailedRequests)) {
          // Remove from rate limit count
          const current = rateLimitStore.get(key);
          if (current) {
            current.count = Math.max(0, current.count - 1);
            rateLimitStore.set(key, current);
          }
        }

        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });

      // Continue processing even if rate limiting fails
      next();
    }
  };
};

/**
 * User-specific Rate Limiting
 * Rate limits based on authenticated user ID
 */
export const userRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      if (!req.user?.id) {
        return `anonymous:${req.ip}`;
      }
      return `user:${req.user.id}`;
    }
  });
};

/**
 * IP-based Rate Limiting
 * Rate limits based on IP address
 */
export const ipRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => `ip:${req.ip}`
  });
};

/**
 * Endpoint-specific Rate Limiting
 * Rate limits based on endpoint path
 */
export const endpointRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => `endpoint:${req.method}:${req.path}`
  });
};

/**
 * Combined Rate Limiting
 * Rate limits based on multiple factors
 */
export const combinedRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return `combined:${userId}:${req.ip}:${req.method}:${req.path}`;
    }
  });
};

/**
 * Burst Rate Limiting
 * Allows burst requests with a higher limit for short periods
 */
export const burstRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  burstWindowMs: number;
  burstMaxRequests: number;
}) => {
  const {
    windowMs,
    maxRequests,
    burstWindowMs,
    burstMaxRequests
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const key = req.user?.id || req.ip;
      const now = Date.now();
      
      // Check regular rate limit
      const regularKey = `regular:${key}`;
      const regularCurrent = rateLimitStore.get(regularKey);
      const regularWindowStart = now - windowMs;

      if (regularCurrent && regularCurrent.resetTime > now) {
        if (regularCurrent.count >= maxRequests) {
          const retryAfter = Math.ceil((regularCurrent.resetTime - now) / 1000);
          
          logger.warn('Regular rate limit exceeded', {
            key,
            limit: maxRequests,
            windowMs,
            retryAfter
          });

          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', regularCurrent.resetTime);
          res.setHeader('Retry-After', retryAfter);

          return next(new RateLimitError(
            'Rate limit exceeded',
            retryAfter,
            req.context?.requestId
          ));
        }

        regularCurrent.count++;
        rateLimitStore.set(regularKey, regularCurrent);
      } else {
        const resetTime = now + windowMs;
        rateLimitStore.set(regularKey, {
          count: 1,
          resetTime
        });
      }

      // Check burst rate limit
      const burstKey = `burst:${key}`;
      const burstCurrent = rateLimitStore.get(burstKey);
      const burstWindowStart = now - burstWindowMs;

      if (burstCurrent && burstCurrent.resetTime > now) {
        if (burstCurrent.count >= burstMaxRequests) {
          const retryAfter = Math.ceil((burstCurrent.resetTime - now) / 1000);
          
          logger.warn('Burst rate limit exceeded', {
            key,
            limit: burstMaxRequests,
            windowMs: burstWindowMs,
            retryAfter
          });

          res.setHeader('X-BurstLimit-Limit', burstMaxRequests);
          res.setHeader('X-BurstLimit-Remaining', 0);
          res.setHeader('X-BurstLimit-Reset', burstCurrent.resetTime);
          res.setHeader('Retry-After', retryAfter);

          return next(new RateLimitError(
            'Burst rate limit exceeded',
            retryAfter,
            req.context?.requestId
          ));
        }

        burstCurrent.count++;
        rateLimitStore.set(burstKey, burstCurrent);
      } else {
        const resetTime = now + burstWindowMs;
        rateLimitStore.set(burstKey, {
          count: 1,
          resetTime
        });
      }

      // Set headers
      const regularInfo = rateLimitStore.get(regularKey)!;
      const burstInfo = rateLimitStore.get(burstKey)!;
      
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - regularInfo.count));
      res.setHeader('X-RateLimit-Reset', regularInfo.resetTime);
      
      res.setHeader('X-BurstLimit-Limit', burstMaxRequests);
      res.setHeader('X-BurstLimit-Remaining', Math.max(0, burstMaxRequests - burstInfo.count));
      res.setHeader('X-BurstLimit-Reset', burstInfo.resetTime);

      next();
    } catch (error) {
      logger.error('Burst rate limiting error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next();
    }
  };
};

/**
 * Clean up expired rate limit entries
 * Should be called periodically to prevent memory leaks
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
};

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000); 