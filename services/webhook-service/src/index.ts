import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { WebhookController } from './controllers/webhook.controller';
import { EventController } from './controllers/event.controller';
import { HealthController } from './controllers/health.controller';
import { WebhookProcessor } from './services/webhook.processor';
import { EventQueue } from './services/event.queue';
import { config } from './config';

// Load environment variables
dotenv.config();

class WebhookService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private webhookProcessor: WebhookProcessor;
  private eventQueue: EventQueue;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.webhookProcessor = new WebhookProcessor(this.databaseService, this.redisService);
    this.eventQueue = new EventQueue(this.redisService, this.webhookProcessor);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Webhook Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.eventQueue.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup scheduled tasks
      this.setupScheduledTasks();

      // Start server
      await this.startServer();

      logger.info('Webhook Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Webhook Service', {
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
    // Health check
    const healthController = new HealthController();
    this.app.use('/health', healthController.router);

    // API routes
    this.app.use('/api/v1', (req, res, next) => {
      logger.info('Webhook API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Webhook management routes
    const webhookController = new WebhookController(
      this.databaseService,
      this.webhookProcessor
    );
    this.app.use('/api/v1/webhooks', webhookController.router);

    // Event management routes
    const eventController = new EventController(
      this.databaseService,
      this.eventQueue
    );
    this.app.use('/api/v1/events', eventController.router);

    // Webhook delivery endpoint (for testing)
    this.app.post('/webhook/test', async (req, res) => {
      try {
        const { event, payload, webhookId } = req.body;
        
        if (!event || !payload || !webhookId) {
          return res.status(400).json({
            error: 'Missing required fields: event, payload, webhookId'
          });
        }

        await this.webhookProcessor.processWebhookEvent(webhookId, event, payload);
        
        res.json({
          message: 'Webhook event processed successfully',
          event,
          webhookId
        });
      } catch (error) {
        logger.error('Test webhook error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
          error: 'Failed to process webhook event'
        });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Webhook Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          webhooks: '/api/v1/webhooks',
          events: '/api/v1/events',
          test: '/webhook/test'
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

  private setupScheduledTasks(): void {
    // Process failed webhook events every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Processing failed webhook events...');
        await this.webhookProcessor.processFailedEvents();
      } catch (error) {
        logger.error('Error processing failed webhook events', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Clean up old webhook events every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Cleaning up old webhook events...');
        await this.webhookProcessor.cleanupOldEvents();
      } catch (error) {
        logger.error('Error cleaning up old webhook events', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Health check for webhook endpoints every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Checking webhook endpoint health...');
        await this.webhookProcessor.checkEndpointHealth();
      } catch (error) {
        logger.error('Error checking webhook endpoint health', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, () => {
        logger.info(`Webhook Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Webhook Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close event queue
      await this.eventQueue.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Webhook Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const webhookService = new WebhookService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(webhookService.server);
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
webhookService.initialize().catch((error) => {
  logger.error('Failed to start Webhook Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default webhookService; 