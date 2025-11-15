import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { OAuthController } from './controllers/oauth.controller';
import { ProviderController } from './controllers/provider.controller';
import { HealthController } from './controllers/health.controller';
import { OAuthStrategy } from './strategies/oauth.strategy';
import { config } from './config';

// Load environment variables
dotenv.config();

class OAuthService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private oauthStrategy: OAuthStrategy;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.oauthStrategy = new OAuthStrategy(this.databaseService);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing OAuth Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();

      // Setup middleware
      this.setupMiddleware();

      // Setup Passport
      this.setupPassport();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start server
      await this.startServer();

      logger.info('OAuth Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OAuth Service', {
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

    // Session configuration
    this.app.use(session({
      store: this.redisService.getSessionStore(),
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.environment === 'production',
        httpOnly: true,
        maxAge: config.session.maxAge
      }
    }));

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

  private setupPassport(): void {
    // Initialize Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Configure OAuth strategies
    this.oauthStrategy.configureStrategies();

    // Serialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.databaseService.getUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    const healthController = new HealthController();
    this.app.use('/health', healthController.router);

    // API routes
    this.app.use('/api/v1', (req, res, next) => {
      logger.info('OAuth API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // OAuth routes
    const oauthController = new OAuthController(
      this.databaseService,
      this.redisService,
      this.oauthStrategy
    );
    this.app.use('/api/v1/oauth', oauthController.router);

    // Provider management routes
    const providerController = new ProviderController(
      this.databaseService
    );
    this.app.use('/api/v1/providers', providerController.router);

    // OAuth callback routes
    this.app.get('/auth/:provider', (req, res, next) => {
      const provider = req.params.provider;
      const state = req.query.state as string;
      
      // Store state for CSRF protection
      if (state) {
        req.session.oauthState = state;
      }

      passport.authenticate(provider, {
        scope: config.providers[provider]?.scopes || ['profile', 'email']
      })(req, res, next);
    });

    this.app.get('/auth/:provider/callback', 
      (req, res, next) => {
        const provider = req.params.provider;
        passport.authenticate(provider, { session: false })(req, res, next);
      },
      async (req, res) => {
        try {
          const user = req.user as any;
          const provider = req.params.provider;
          
          // Handle OAuth callback
          const result = await oauthController.handleCallback(user, provider, req);
          
          // Redirect to frontend with tokens
          const redirectUrl = `${config.frontendUrl}/oauth/callback?` + 
            `access_token=${result.accessToken}&` +
            `refresh_token=${result.refreshToken}&` +
            `provider=${provider}`;
          
          res.redirect(redirectUrl);
        } catch (error) {
          logger.error('OAuth callback error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            provider: req.params.provider
          });
          
          const errorUrl = `${config.frontendUrl}/oauth/error?` +
            `provider=${req.params.provider}&` +
            `error=${encodeURIComponent('Authentication failed')}`;
          
          res.redirect(errorUrl);
        }
      }
    );

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'OAuth Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          oauth: '/api/v1/oauth',
          providers: '/api/v1/providers',
          auth: '/auth/:provider',
          callback: '/auth/:provider/callback'
        }
      });
    });
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
        logger.info(`OAuth Service listening on port ${config.port}`, {
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
      logger.info('Shutting down OAuth Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('OAuth Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const oauthService = new OAuthService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(oauthService.server);
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
oauthService.initialize().catch((error) => {
  logger.error('Failed to start OAuth Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default oauthService; 