import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { TenantController } from './controllers/tenant.controller';
import { TenantConfigController } from './controllers/tenant.config.controller';
import { TenantBillingController } from './controllers/tenant.billing.controller';
import { HealthController } from './controllers/health.controller';
import { TenantService } from './services/tenant.service';
import { TenantConfigService } from './services/tenant.config.service';
import { TenantBillingService } from './services/tenant.billing.service';
import { TenantIsolationService } from './services/tenant.isolation.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class TenantManagementService {
  private app: express.Application;
  private server: any;
  private io: Server;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private tenantService: TenantService;
  private tenantConfigService: TenantConfigService;
  private tenantBillingService: TenantBillingService;
  private tenantIsolationService: TenantIsolationService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST']
      }
    });
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.tenantService = new TenantService();
    this.tenantConfigService = new TenantConfigService();
    this.tenantBillingService = new TenantBillingService();
    this.tenantIsolationService = new TenantIsolationService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Tenant Management Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.tenantService.initialize();
      await this.tenantConfigService.initialize();
      await this.tenantBillingService.initialize();
      await this.tenantIsolationService.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup WebSocket events
      this.setupWebSocketEvents();

      // Setup error handling
      this.setupErrorHandling();

      // Setup scheduled tasks
      this.setupScheduledTasks();

      // Start server
      await this.startServer();

      logger.info('Tenant Management Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tenant Management Service', {
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
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
      logger.info('Tenant API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Tenant management routes
    const tenantController = new TenantController(
      this.databaseService,
      this.tenantService
    );
    this.app.use('/api/v1/tenants', tenantController.router);

    // Tenant configuration routes
    const tenantConfigController = new TenantConfigController(
      this.databaseService,
      this.tenantConfigService
    );
    this.app.use('/api/v1/tenant-configs', tenantConfigController.router);

    // Tenant billing routes
    const tenantBillingController = new TenantBillingController(
      this.databaseService,
      this.tenantBillingService
    );
    this.app.use('/api/v1/tenant-billing', tenantBillingController.router);

    // Tenant creation endpoint
    this.app.post('/api/v1/tenants/create', async (req, res) => {
      try {
        const { name, slug, domain, subdomain, plan, maxUsers, maxStorage, features, settings } = req.body;

        if (!name || !slug) {
          return res.status(400).json({
            error: 'Missing required fields: name, slug'
          });
        }

        const tenant = await this.tenantService.createTenant({
          name,
          slug,
          domain,
          subdomain,
          plan: plan || 'basic',
          maxUsers: maxUsers || 100,
          maxStorage: maxStorage || 10,
          features: features || {},
          settings: settings || {}
        });

        res.json({
          success: true,
          tenantId: tenant.id,
          slug: tenant.slug,
          status: tenant.status
        });
      } catch (error) {
        logger.error('Tenant creation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Tenant creation failed' });
      }
    });

    // Tenant isolation check
    this.app.get('/api/v1/tenants/:tenantId/isolation', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const isolationStatus = await this.tenantIsolationService.checkIsolation(tenantId);

        res.json(isolationStatus);
      } catch (error) {
        logger.error('Tenant isolation check error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to check tenant isolation' });
      }
    });

    // Tenant configuration management
    this.app.post('/api/v1/tenants/:tenantId/config', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { configKey, configValue, isEncrypted } = req.body;

        if (!configKey || configValue === undefined) {
          return res.status(400).json({
            error: 'Missing required fields: configKey, configValue'
          });
        }

        const config = await this.tenantConfigService.setConfiguration(
          tenantId,
          configKey,
          configValue,
          isEncrypted || false
        );

        res.json({
          success: true,
          configId: config.id,
          configKey: config.configKey
        });
      } catch (error) {
        logger.error('Tenant configuration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Configuration update failed' });
      }
    });

    // Tenant usage analytics
    this.app.get('/api/v1/tenants/:tenantId/usage', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { timeRange = '30d' } = req.query;

        const usage = await this.tenantService.getTenantUsage(
          tenantId,
          timeRange as string
        );

        res.json(usage);
      } catch (error) {
        logger.error('Tenant usage error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get tenant usage' });
      }
    });

    // Tenant billing and subscription
    this.app.post('/api/v1/tenants/:tenantId/billing/subscription', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { plan, billingCycle, paymentMethod } = req.body;

        if (!plan || !billingCycle) {
          return res.status(400).json({
            error: 'Missing required fields: plan, billingCycle'
          });
        }

        const subscription = await this.tenantBillingService.createSubscription(
          tenantId,
          plan,
          billingCycle,
          paymentMethod
        );

        res.json({
          success: true,
          subscriptionId: subscription.id,
          plan: subscription.plan,
          status: subscription.status
        });
      } catch (error) {
        logger.error('Tenant billing error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Billing operation failed' });
      }
    });

    // Tenant data export
    this.app.post('/api/v1/tenants/:tenantId/export', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { dataTypes, format } = req.body;

        if (!dataTypes || !Array.isArray(dataTypes)) {
          return res.status(400).json({
            error: 'Missing required field: dataTypes (array)'
          });
        }

        const exportResult = await this.tenantService.exportTenantData(
          tenantId,
          dataTypes,
          format || 'json'
        );

        res.setHeader('Content-Type', exportResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.send(exportResult.data);
      } catch (error) {
        logger.error('Tenant export error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Export failed' });
      }
    });

    // Tenant migration
    this.app.post('/api/v1/tenants/:tenantId/migrate', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { targetPlan, migrationOptions } = req.body;

        if (!targetPlan) {
          return res.status(400).json({
            error: 'Missing required field: targetPlan'
          });
        }

        const migration = await this.tenantService.migrateTenant(
          tenantId,
          targetPlan,
          migrationOptions
        );

        res.json({
          success: true,
          migrationId: migration.id,
          status: migration.status,
          estimatedTime: migration.estimatedTime
        });
      } catch (error) {
        logger.error('Tenant migration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Migration failed' });
      }
    });

    // Tenant health check
    this.app.get('/api/v1/tenants/:tenantId/health', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const health = await this.tenantService.getTenantHealth(tenantId);

        res.json(health);
      } catch (error) {
        logger.error('Tenant health check error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Health check failed' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Tenant Management Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          tenants: '/api/v1/tenants',
          configs: '/api/v1/tenant-configs',
          billing: '/api/v1/tenant-billing',
          create: '/api/v1/tenants/create',
          isolation: '/api/v1/tenants/:tenantId/isolation',
          config: '/api/v1/tenants/:tenantId/config',
          usage: '/api/v1/tenants/:tenantId/usage',
          subscription: '/api/v1/tenants/:tenantId/billing/subscription',
          export: '/api/v1/tenants/:tenantId/export',
          migrate: '/api/v1/tenants/:tenantId/migrate',
          health: '/api/v1/tenants/:tenantId/health'
        }
      });
    });
  }

  private setupWebSocketEvents(): void {
    this.io.on('connection', (socket) => {
      logger.info('Tenant client connected', {
        socketId: socket.id
      });

      // Handle tenant status updates
      socket.on('subscribeTenant', (data) => {
        const { tenantId } = data;
        this.tenantService.subscribeToTenant(socket, tenantId);
      });

      // Handle tenant configuration changes
      socket.on('subscribeConfig', (data) => {
        const { tenantId } = data;
        this.tenantConfigService.subscribeToConfig(socket, tenantId);
      });

      // Handle tenant billing updates
      socket.on('subscribeBilling', (data) => {
        const { tenantId } = data;
        this.tenantBillingService.subscribeToBilling(socket, tenantId);
      });

      socket.on('disconnect', () => {
        logger.info('Tenant client disconnected', {
          socketId: socket.id
        });
        this.tenantService.unsubscribeFromTenant(socket);
        this.tenantConfigService.unsubscribeFromConfig(socket);
        this.tenantBillingService.unsubscribeFromBilling(socket);
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
    // Tenant health monitoring
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running tenant health checks...');
        await this.tenantService.runHealthChecks();
      } catch (error) {
        logger.error('Error running tenant health checks', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Tenant usage monitoring
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Monitoring tenant usage...');
        await this.tenantService.monitorUsage();
      } catch (error) {
        logger.error('Error monitoring tenant usage', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Tenant billing processing
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Processing tenant billing...');
        await this.tenantBillingService.processBilling();
      } catch (error) {
        logger.error('Error processing tenant billing', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Tenant isolation verification
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Verifying tenant isolation...');
        await this.tenantIsolationService.verifyIsolation();
      } catch (error) {
        logger.error('Error verifying tenant isolation', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(config.port, () => {
        logger.info(`Tenant Management Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Tenant Management Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close WebSocket connections
      this.io.close();

      // Close service connections
      await this.tenantService.shutdown();
      await this.tenantConfigService.shutdown();
      await this.tenantBillingService.shutdown();
      await this.tenantIsolationService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Tenant Management Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const tenantManagementService = new TenantManagementService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(tenantManagementService.server);
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
tenantManagementService.initialize().catch((error) => {
  logger.error('Failed to start Tenant Management Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default tenantManagementService; 