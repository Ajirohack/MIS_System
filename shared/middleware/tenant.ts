import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/utils/logger';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantDomain?: string;
  tenantSubdomain?: string;
  tenantPlan: string;
  tenantFeatures: Record<string, any>;
  tenantSettings: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export class TenantMiddleware {
  /**
   * Extract tenant information from request headers, subdomain, or custom header
   */
  static extractTenant() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = this.getTenantFromRequest(req);
        
        if (!tenantId) {
          return res.status(400).json({
            error: 'Tenant identifier not found',
            message: 'Please provide a valid tenant identifier'
          });
        }

        // Get tenant context from cache or database
        const tenantContext = await this.getTenantContext(tenantId);
        
        if (!tenantContext) {
          return res.status(404).json({
            error: 'Tenant not found',
            message: 'The specified tenant does not exist or is inactive'
          });
        }

        // Check tenant status
        if (tenantContext.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant inactive',
            message: `Tenant is currently ${tenantContext.status}`
          });
        }

        // Attach tenant context to request
        req.tenant = tenantContext;

        logger.debug('Tenant context attached', {
          tenantId: tenantContext.tenantId,
          tenantSlug: tenantContext.tenantSlug,
          path: req.path
        });

        next();
      } catch (error) {
        logger.error('Error extracting tenant', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path
        });
        res.status(500).json({
          error: 'Tenant extraction failed',
          message: 'Unable to process tenant request'
        });
      }
    };
  }

  /**
   * Validate tenant access and permissions
   */
  static validateTenantAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context missing',
            message: 'Tenant context is required for this operation'
          });
        }

        // Check if tenant has access to the requested feature
        const requiredFeature = this.getRequiredFeature(req.path, req.method);
        
        if (requiredFeature && !req.tenant.tenantFeatures[requiredFeature]) {
          return res.status(403).json({
            error: 'Feature not available',
            message: `Feature '${requiredFeature}' is not available for your plan`
          });
        }

        // Check tenant usage limits
        const usageCheck = await this.checkTenantUsage(req.tenant.tenantId, req.path);
        
        if (!usageCheck.allowed) {
          return res.status(429).json({
            error: 'Usage limit exceeded',
            message: usageCheck.message,
            limit: usageCheck.limit,
            current: usageCheck.current
          });
        }

        next();
      } catch (error) {
        logger.error('Error validating tenant access', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tenantId: req.tenant?.tenantId,
          path: req.path
        });
        res.status(500).json({
          error: 'Access validation failed',
          message: 'Unable to validate tenant access'
        });
      }
    };
  }

  /**
   * Enforce tenant data isolation
   */
  static enforceIsolation() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context missing',
            message: 'Tenant context is required for data isolation'
          });
        }

        // Add tenant filter to query parameters
        if (req.method === 'GET' && req.query) {
          req.query.tenantId = req.tenant.tenantId;
        }

        // Add tenant context to request body for mutations
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
          req.body.tenantId = req.tenant.tenantId;
        }

        // Add tenant headers for downstream services
        req.headers['x-tenant-id'] = req.tenant.tenantId;
        req.headers['x-tenant-slug'] = req.tenant.tenantSlug;
        req.headers['x-tenant-plan'] = req.tenant.tenantPlan;

        next();
      } catch (error) {
        logger.error('Error enforcing tenant isolation', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tenantId: req.tenant?.tenantId,
          path: req.path
        });
        res.status(500).json({
          error: 'Isolation enforcement failed',
          message: 'Unable to enforce tenant data isolation'
        });
      }
    };
  }

  /**
   * Rate limiting per tenant
   */
  static tenantRateLimit(options: {
    windowMs: number;
    maxRequests: number;
    message?: string;
  }) {
    const { windowMs, maxRequests, message = 'Rate limit exceeded for tenant' } = options;
    
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context missing',
            message: 'Tenant context is required for rate limiting'
          });
        }

        const key = `rate_limit:tenant:${req.tenant.tenantId}:${req.path}`;
        const current = await this.getRateLimitCount(key, windowMs);
        
        if (current >= maxRequests) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message,
            retryAfter: windowMs / 1000
          });
        }

        await this.incrementRateLimitCount(key, windowMs);
        next();
      } catch (error) {
        logger.error('Error in tenant rate limiting', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tenantId: req.tenant?.tenantId,
          path: req.path
        });
        next(); // Continue on error
      }
    };
  }

  /**
   * Audit tenant actions
   */
  static auditTenantAction(action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.tenant) {
          return next();
        }

        // Log tenant action for audit
        await this.logTenantAction({
          tenantId: req.tenant.tenantId,
          userId: req.user?.id,
          action,
          resource: req.path,
          method: req.method,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            requestId: req.headers['x-request-id'],
            sessionId: req.headers['x-session-id']
          }
        });

        next();
      } catch (error) {
        logger.error('Error auditing tenant action', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tenantId: req.tenant?.tenantId,
          action
        });
        next(); // Continue on error
      }
    };
  }

  // Private helper methods

  private static getTenantFromRequest(req: Request): string | null {
    // Check custom header first
    const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];
    if (tenantHeader) {
      return Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;
    }

    // Check subdomain
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    // Check query parameter
    const tenantQuery = req.query.tenant as string;
    if (tenantQuery) {
      return tenantQuery;
    }

    // Check JWT token for tenant claim
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = this.decodeJWT(token);
        return decoded.tenantId || decoded.tenant_slug;
      } catch (error) {
        // Token decode failed, continue with other methods
      }
    }

    return null;
  }

  private static async getTenantContext(tenantId: string): Promise<TenantContext | null> {
    // Implementation would fetch from cache or database
    // For now, return a mock implementation
    return {
      tenantId,
      tenantSlug: tenantId,
      tenantPlan: 'basic',
      tenantFeatures: {
        biometric_auth: true,
        ai_verification: false,
        advanced_analytics: false
      },
      tenantSettings: {
        max_file_size: 10485760, // 10MB
        allowed_file_types: ['jpg', 'png', 'pdf'],
        session_timeout: 3600
      }
    };
  }

  private static getRequiredFeature(path: string, method: string): string | null {
    // Map paths to required features
    const featureMap: Record<string, string> = {
      '/api/v1/biometrics': 'biometric_auth',
      '/api/v1/ai-verification': 'ai_verification',
      '/api/v1/analytics': 'advanced_analytics'
    };

    for (const [pattern, feature] of Object.entries(featureMap)) {
      if (path.startsWith(pattern)) {
        return feature;
      }
    }

    return null;
  }

  private static async checkTenantUsage(tenantId: string, path: string): Promise<{
    allowed: boolean;
    message?: string;
    limit?: number;
    current?: number;
  }> {
    // Implementation would check usage limits
    // For now, return allowed
    return { allowed: true };
  }

  private static async getRateLimitCount(key: string, windowMs: number): Promise<number> {
    // Implementation would get from Redis
    return 0;
  }

  private static async incrementRateLimitCount(key: string, windowMs: number): Promise<void> {
    // Implementation would increment in Redis
  }

  private static decodeJWT(token: string): any {
    // Implementation would decode JWT
    return {};
  }

  private static async logTenantAction(data: {
    tenantId: string;
    userId?: string;
    action: string;
    resource: string;
    method: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Implementation would log to audit system
    logger.info('Tenant action logged', data);
  }
}

// Export convenience functions
export const extractTenant = TenantMiddleware.extractTenant();
export const validateTenantAccess = TenantMiddleware.validateTenantAccess();
export const enforceIsolation = TenantMiddleware.enforceIsolation();
export const tenantRateLimit = TenantMiddleware.tenantRateLimit.bind(TenantMiddleware);
export const auditTenantAction = TenantMiddleware.auditTenantAction.bind(TenantMiddleware); 