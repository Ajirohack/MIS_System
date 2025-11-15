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
import { VerificationController } from './controllers/verification.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApprovalController } from './controllers/approval.controller';
import { HealthController } from './controllers/health.controller';
import { VerificationProcessor } from './services/verification.processor';
import { WorkflowEngine } from './services/workflow.engine';
import { NotificationService } from './services/notification.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class VerificationService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private verificationProcessor: VerificationProcessor;
  private workflowEngine: WorkflowEngine;
  private notificationService: NotificationService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.verificationProcessor = new VerificationProcessor(this.databaseService);
    this.workflowEngine = new WorkflowEngine(this.databaseService, this.redisService);
    this.notificationService = new NotificationService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Verification Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.workflowEngine.initialize();
      await this.notificationService.initialize();

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

      logger.info('Verification Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Verification Service', {
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
      logger.info('Verification API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Verification routes
    const verificationController = new VerificationController(
      this.databaseService,
      this.verificationProcessor,
      this.workflowEngine
    );
    this.app.use('/api/v1/verifications', verificationController.router);

    // Workflow routes
    const workflowController = new WorkflowController(
      this.databaseService,
      this.workflowEngine
    );
    this.app.use('/api/v1/workflows', workflowController.router);

    // Approval routes
    const approvalController = new ApprovalController(
      this.databaseService,
      this.verificationProcessor,
      this.notificationService
    );
    this.app.use('/api/v1/approvals', approvalController.router);

    // Webhook endpoint for external verification services
    this.app.post('/webhooks/verification', async (req, res) => {
      try {
        const { provider, event, data } = req.body;
        
        if (!provider || !event || !data) {
          return res.status(400).json({
            error: 'Missing required fields: provider, event, data'
          });
        }

        await this.verificationProcessor.handleExternalVerification(provider, event, data);
        
        res.json({
          message: 'Verification webhook processed successfully',
          provider,
          event
        });
      } catch (error) {
        logger.error('Verification webhook error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
          error: 'Failed to process verification webhook'
        });
      }
    });

    // Dashboard endpoints
    this.app.get('/api/v1/dashboard/stats', async (req, res) => {
      try {
        const stats = await this.databaseService.getVerificationStats();
        res.json(stats);
      } catch (error) {
        logger.error('Dashboard stats error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get dashboard stats' });
      }
    });

    this.app.get('/api/v1/dashboard/pending', async (req, res) => {
      try {
        const { page = 1, limit = 20, type } = req.query;
        
        const pending = await this.databaseService.getPendingVerifications({
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          type: type as string
        });
        
        res.json(pending);
      } catch (error) {
        logger.error('Pending verifications error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get pending verifications' });
      }
    });

    // Bulk operations
    this.app.post('/api/v1/verifications/bulk', async (req, res) => {
      try {
        const { operation, verificationIds, options } = req.body;

        switch (operation) {
          case 'approve':
            await this.verificationProcessor.bulkApprove(verificationIds, options);
            break;
          case 'reject':
            await this.verificationProcessor.bulkReject(verificationIds, options);
            break;
          case 'assign':
            await this.verificationProcessor.bulkAssign(verificationIds, options.assigneeId);
            break;
          default:
            return res.status(400).json({ error: 'Invalid operation' });
        }

        res.json({ message: 'Bulk operation completed successfully' });
      } catch (error) {
        logger.error('Bulk operation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Bulk operation failed' });
      }
    });

    // Export endpoints
    this.app.get('/api/v1/verifications/export', async (req, res) => {
      try {
        const { format = 'csv', filters } = req.query;
        
        const exportData = await this.verificationProcessor.exportVerifications({
          format: format as string,
          filters: filters ? JSON.parse(filters as string) : {}
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=verifications.csv');
        res.send(exportData);
      } catch (error) {
        logger.error('Export error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Export failed' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Verification Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          verifications: '/api/v1/verifications',
          workflows: '/api/v1/workflows',
          approvals: '/api/v1/approvals',
          webhooks: '/webhooks/verification',
          dashboard: '/api/v1/dashboard',
          bulk: '/api/v1/verifications/bulk',
          export: '/api/v1/verifications/export'
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
    // Process expired verifications every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Processing expired verifications...');
        await this.verificationProcessor.processExpiredVerifications();
      } catch (error) {
        logger.error('Error processing expired verifications', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Send reminder notifications every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Sending reminder notifications...');
        await this.notificationService.sendReminders();
      } catch (error) {
        logger.error('Error sending reminder notifications', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Clean up old verification data daily
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Cleaning up old verification data...');
        await this.verificationProcessor.cleanupOldData();
      } catch (error) {
        logger.error('Error cleaning up old verification data', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Generate verification reports weekly
    cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Generating verification reports...');
        await this.verificationProcessor.generateReports();
      } catch (error) {
        logger.error('Error generating verification reports', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, () => {
        logger.info(`Verification Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Verification Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close workflow engine
      await this.workflowEngine.shutdown();

      // Close notification service
      await this.notificationService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Verification Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const verificationService = new VerificationService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(verificationService.server);
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
verificationService.initialize().catch((error) => {
  logger.error('Failed to start Verification Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default verificationService; 