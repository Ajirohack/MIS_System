import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { extractTenant, validateTenantAccess, enforceIsolation, tenantRateLimit } from '@shared/middleware/tenant';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { SessionController } from './controllers/session.controller';
import { HealthController } from './controllers/health.controller';
import { AuthProcessor } from './services/auth.processor';
import { UserService } from './services/user.service';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class AuthService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private authProcessor: AuthProcessor;
  private userService: UserService;
  private sessionService: SessionService;
  private emailService: EmailService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.authProcessor = new AuthProcessor(this.databaseService, this.redisService);
    this.userService = new UserService(this.databaseService);
    this.sessionService = new SessionService(this.redisService);
    this.emailService = new EmailService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Auth Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.authProcessor.initialize();
      await this.userService.initialize();
      await this.sessionService.initialize();
      await this.emailService.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start server
      await this.startServer();

      logger.info('Auth Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Auth Service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request context
    this.app.use(addRequestContext());

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
      message: config.rateLimit.message,
      statusCode: config.rateLimit.statusCode
    }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check (no tenant required)
    const healthController = new HealthController();
    this.app.use('/health', healthController.router);

    // Public routes (no tenant required)
    this.app.post('/api/v1/auth/login', async (req, res) => {
      try {
        const { email, password, tenantSlug } = req.body;

        if (!email || !password || !tenantSlug) {
          return res.status(400).json({
            error: 'Missing required fields: email, password, tenantSlug'
          });
        }

        // Get tenant context first
        const tenant = await this.getTenantBySlug(tenantSlug);
        if (!tenant) {
          return res.status(404).json({
            error: 'Tenant not found',
            message: 'The specified tenant does not exist'
          });
        }

        // Add tenant context to request
        req.tenant = tenant;

        const result = await this.authProcessor.login(email, password, tenant.id);

        res.json({
          success: true,
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            plan: tenant.plan
          }
        });
      } catch (error) {
        logger.error('Login error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });

    this.app.post('/api/v1/auth/register', async (req, res) => {
      try {
        const { email, password, firstName, lastName, tenantSlug, invitationCode } = req.body;

        if (!email || !password || !firstName || !lastName || !tenantSlug) {
          return res.status(400).json({
            error: 'Missing required fields: email, password, firstName, lastName, tenantSlug'
          });
        }

        // Get tenant context first
        const tenant = await this.getTenantBySlug(tenantSlug);
        if (!tenant) {
          return res.status(404).json({
            error: 'Tenant not found',
            message: 'The specified tenant does not exist'
          });
        }

        // Add tenant context to request
        req.tenant = tenant;

        const result = await this.authProcessor.register({
          email,
          password,
          firstName,
          lastName,
          tenantId: tenant.id,
          invitationCode
        });

        res.json({
          success: true,
          message: 'Registration successful',
          userId: result.userId,
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name
          }
        });
      } catch (error) {
        logger.error('Registration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(400).json({ error: 'Registration failed' });
      }
    });

    // Tenant-aware routes (require tenant context)
    this.app.use('/api/v1', extractTenant, validateTenantAccess, enforceIsolation);

    // Apply tenant-specific rate limiting
    this.app.use('/api/v1', tenantRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }));

    // Auth routes
    const authController = new AuthController(
      this.databaseService,
      this.authProcessor
    );
    this.app.use('/api/v1/auth', authController.router);

    // User routes
    const userController = new UserController(
      this.databaseService,
      this.userService
    );
    this.app.use('/api/v1/users', userController.router);

    // Session routes
    const sessionController = new SessionController(
      this.databaseService,
      this.sessionService
    );
    this.app.use('/api/v1/sessions', sessionController.router);

    // Password reset (tenant-aware)
    this.app.post('/api/v1/auth/password-reset', async (req, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            error: 'Missing required field: email'
          });
        }

        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context required'
          });
        }

        await this.authProcessor.requestPasswordReset(email, req.tenant.id);

        res.json({
          success: true,
          message: 'Password reset email sent'
        });
      } catch (error) {
        logger.error('Password reset error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Password reset failed' });
      }
    });

    this.app.post('/api/v1/auth/password-reset/confirm', async (req, res) => {
      try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
          return res.status(400).json({
            error: 'Missing required fields: token, newPassword'
          });
        }

        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context required'
          });
        }

        await this.authProcessor.resetPassword(token, newPassword, req.tenant.id);

        res.json({
          success: true,
          message: 'Password reset successful'
        });
      } catch (error) {
        logger.error('Password reset confirmation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(400).json({ error: 'Password reset failed' });
      }
    });

    // Email verification (tenant-aware)
    this.app.post('/api/v1/auth/verify-email', async (req, res) => {
      try {
        const { token } = req.body;

        if (!token) {
          return res.status(400).json({
            error: 'Missing required field: token'
          });
        }

        if (!req.tenant) {
          return res.status(400).json({
            error: 'Tenant context required'
          });
        }

        await this.authProcessor.verifyEmail(token, req.tenant.id);

        res.json({
          success: true,
          message: 'Email verified successfully'
        });
      } catch (error) {
        logger.error('Email verification error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(400).json({ error: 'Email verification failed' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Auth Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          login: '/api/v1/auth/login',
          register: '/api/v1/auth/register',
          logout: '/api/v1/auth/logout',
          refresh: '/api/v1/auth/refresh',
          passwordReset: '/api/v1/auth/password-reset',
          passwordResetConfirm: '/api/v1/auth/password-reset/confirm',
          verifyEmail: '/api/v1/auth/verify-email',
          users: '/api/v1/users',
          sessions: '/api/v1/sessions'
        }
      });
    });
  }

  private async getTenantBySlug(slug: string): Promise<any> {
    try {
      // This would typically call the tenant service
      // For now, we'll implement a simple database query
      const result = await this.databaseService.getPool().query(
        'SELECT * FROM tenants WHERE slug = $1 AND status = $2',
        [slug, 'active']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = result.rows[0];
      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantDomain: tenant.domain,
        tenantSubdomain: tenant.subdomain,
        tenantPlan: tenant.plan,
        tenantFeatures: tenant.features || {},
        tenantSettings: tenant.settings || {}
      };
    } catch (error) {
      logger.error('Error getting tenant by slug', {
        error: error instanceof Error ? error.message : 'Unknown error',
        slug
      });
      return null;
    }
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, () => {
        logger.info(`Auth Service listening on port ${config.port}`, {
          port: config.port,
          environment: config.environment,
          baseUrl: config.baseUrl
        });
        resolve();
      });

      this.server.on('error', (error: Error) => {
        logger.error('Server error', {
          error: error.message
        });
        reject(error);
      });
    });
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Auth Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close service connections
      await this.authProcessor.shutdown();
      await this.userService.shutdown();
      await this.sessionService.shutdown();
      await this.emailService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Auth Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const authService = new AuthService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(authService.server);
process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    promise: promise.toString()
  });
  process.exit(1);
});

// Initialize the service
authService.initialize().catch((error) => {
  logger.error('Failed to start Auth Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default authService; 