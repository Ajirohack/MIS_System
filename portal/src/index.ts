import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { PortalController } from './controllers/portal.controller';
import { DocumentationController } from './controllers/documentation.controller';
import { SDKController } from './controllers/sdk.controller';
import { ApplicationController } from './controllers/application.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { config } from './config';

// Load environment variables
dotenv.config();

class DeveloperPortal {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Developer Portal...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start server
      await this.startServer();

      logger.info('Developer Portal initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Developer Portal', {
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
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
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

    // Static files
    this.app.use('/static', express.static(path.join(__dirname, '../public')));
    this.app.use('/assets', express.static(path.join(__dirname, '../assets')));

    // View engine
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));

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
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'developer-portal',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Portal routes
    const portalController = new PortalController(this.databaseService);
    this.app.use('/', portalController.router);

    // Documentation routes
    const documentationController = new DocumentationController();
    this.app.use('/docs', documentationController.router);

    // SDK routes
    const sdkController = new SDKController();
    this.app.use('/sdk', sdkController.router);

    // Application management routes
    const applicationController = new ApplicationController(
      this.databaseService,
      this.redisService
    );
    this.app.use('/api/v1/applications', applicationController.router);

    // Analytics routes
    const analyticsController = new AnalyticsController(this.databaseService);
    this.app.use('/api/v1/analytics', analyticsController.router);

    // API documentation (Swagger)
    this.app.use('/api-docs', (req, res) => {
      res.render('api-docs', {
        title: 'API Documentation',
        baseUrl: config.baseUrl,
        apiVersion: 'v1'
      });
    });

    // Interactive API playground
    this.app.get('/playground', (req, res) => {
      res.render('playground', {
        title: 'API Playground',
        baseUrl: config.baseUrl,
        apiKey: req.query.apiKey || ''
      });
    });

    // SDK download page
    this.app.get('/downloads', (req, res) => {
      res.render('downloads', {
        title: 'SDK Downloads',
        sdks: [
          {
            name: 'JavaScript',
            version: '1.0.0',
            description: 'Official JavaScript SDK for Node.js and browsers',
            downloadUrl: '/sdk/javascript/download',
            documentationUrl: '/docs/javascript',
            githubUrl: 'https://github.com/membership-platform/sdk-javascript'
          },
          {
            name: 'Python',
            version: '1.0.0',
            description: 'Official Python SDK with async support',
            downloadUrl: '/sdk/python/download',
            documentationUrl: '/docs/python',
            githubUrl: 'https://github.com/membership-platform/sdk-python'
          },
          {
            name: 'PHP',
            version: '1.0.0',
            description: 'Official PHP SDK with Laravel integration',
            downloadUrl: '/sdk/php/download',
            documentationUrl: '/docs/php',
            githubUrl: 'https://github.com/membership-platform/sdk-php'
          }
        ]
      });
    });

    // Integration examples
    this.app.get('/examples', (req, res) => {
      res.render('examples', {
        title: 'Integration Examples',
        examples: [
          {
            name: 'User Authentication',
            language: 'javascript',
            description: 'Complete authentication flow with OAuth',
            code: `
const sdk = new MembershipSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://api.membership-platform.com'
});

// Login with email/password
const tokens = await sdk.login('user@example.com', 'password');

// Or login with OAuth
const oauthUrl = await sdk.getOAuthUrl('google', 'https://yourapp.com/callback');
// Redirect user to oauthUrl, then handle callback
const tokens = await sdk.loginWithOAuth('google', code, state);
            `,
            tags: ['authentication', 'oauth', 'javascript']
          },
          {
            name: 'Webhook Integration',
            language: 'javascript',
            description: 'Set up webhooks to receive real-time events',
            code: `
// Create a webhook
const webhook = await sdk.createWebhook({
  name: 'User Events',
  url: 'https://yourapp.com/webhooks/membership',
  events: ['user.created', 'user.updated', 'invitation.accepted']
});

// Verify webhook signature in your endpoint
app.post('/webhooks/membership', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = sdk.verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    webhookSecret
  );
  
  if (isValid) {
    // Process webhook event
    console.log('Webhook received:', req.body);
  }
  
  res.status(200).send('OK');
});
            `,
            tags: ['webhooks', 'events', 'javascript']
          }
        ]
      });
    });

    // Community and support
    this.app.get('/community', (req, res) => {
      res.render('community', {
        title: 'Community & Support',
        resources: [
          {
            name: 'GitHub',
            url: 'https://github.com/membership-platform',
            description: 'Source code, issues, and discussions'
          },
          {
            name: 'Discord',
            url: 'https://discord.gg/membership-platform',
            description: 'Real-time chat and community support'
          },
          {
            name: 'Stack Overflow',
            url: 'https://stackoverflow.com/questions/tagged/membership-platform',
            description: 'Q&A and technical discussions'
          },
          {
            name: 'Blog',
            url: '/blog',
            description: 'Updates, tutorials, and best practices'
          }
        ]
      });
    });

    // Pricing and plans
    this.app.get('/pricing', (req, res) => {
      res.render('pricing', {
        title: 'Pricing & Plans',
        plans: [
          {
            name: 'Developer',
            price: 0,
            features: [
          '1,000 API calls/month',
          'Basic OAuth providers',
          'Email support',
          'SDK access',
          'Documentation'
        ],
            popular: false
          },
          {
            name: 'Professional',
            price: 29,
            features: [
          '50,000 API calls/month',
          'All OAuth providers',
          'Webhook support',
          'Priority support',
          'Analytics dashboard',
          'Custom branding'
        ],
            popular: true
          },
          {
            name: 'Enterprise',
            price: 99,
            features: [
          'Unlimited API calls',
          'Custom integrations',
          'Dedicated support',
          'SLA guarantee',
          'On-premise deployment',
          'Custom development'
        ],
            popular: false
          }
        ]
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
        logger.info(`Developer Portal listening on port ${config.port}`, {
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
      logger.info('Shutting down Developer Portal...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Developer Portal shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the portal
const developerPortal = new DeveloperPortal();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(developerPortal.server);
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

// Initialize the portal
developerPortal.initialize().catch((error) => {
  logger.error('Failed to start Developer Portal', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default developerPortal; 