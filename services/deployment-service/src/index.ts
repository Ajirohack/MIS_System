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
import { DeploymentController } from './controllers/deployment.controller';
import { LoadBalancerController } from './controllers/load.balancer.controller';
import { InfrastructureController } from './controllers/infrastructure.controller';
import { HealthController } from './controllers/health.controller';
import { DeploymentService } from './services/deployment.service';
import { LoadBalancerService } from './services/load.balancer.service';
import { InfrastructureService } from './services/infrastructure.service';
import { MonitoringService } from './services/monitoring.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class DeploymentService {
  private app: express.Application;
  private server: any;
  private io: Server;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private deploymentService: DeploymentService;
  private loadBalancerService: LoadBalancerService;
  private infrastructureService: InfrastructureService;
  private monitoringService: MonitoringService;

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
    this.deploymentService = new DeploymentService();
    this.loadBalancerService = new LoadBalancerService();
    this.infrastructureService = new InfrastructureService();
    this.monitoringService = new MonitoringService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Deployment Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.deploymentService.initialize();
      await this.loadBalancerService.initialize();
      await this.infrastructureService.initialize();
      await this.monitoringService.initialize();

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

      logger.info('Deployment Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Deployment Service', {
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
      logger.info('Deployment API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Deployment routes
    const deploymentController = new DeploymentController(
      this.databaseService,
      this.deploymentService
    );
    this.app.use('/api/v1/deployments', deploymentController.router);

    // Load balancer routes
    const loadBalancerController = new LoadBalancerController(
      this.databaseService,
      this.loadBalancerService
    );
    this.app.use('/api/v1/loadbalancer', loadBalancerController.router);

    // Infrastructure routes
    const infrastructureController = new InfrastructureController(
      this.databaseService,
      this.infrastructureService
    );
    this.app.use('/api/v1/infrastructure', infrastructureController.router);

    // Multi-region deployment
    this.app.post('/api/v1/deploy/global', async (req, res) => {
      try {
        const { service, regions, version, configuration } = req.body;

        if (!service || !regions || !version) {
          return res.status(400).json({
            error: 'Missing required fields: service, regions, version'
          });
        }

        const deployment = await this.deploymentService.deployToRegions(
          service,
          regions,
          version,
          configuration
        );

        res.json({
          success: true,
          deploymentId: deployment.id,
          status: deployment.status,
          regions: deployment.regions
        });
      } catch (error) {
        logger.error('Global deployment error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Deployment failed' });
      }
    });

    // Load balancer configuration
    this.app.post('/api/v1/loadbalancer/configure', async (req, res) => {
      try {
        const { regions, algorithm, healthChecks, ssl } = req.body;

        if (!regions || !algorithm) {
          return res.status(400).json({
            error: 'Missing required fields: regions, algorithm'
          });
        }

        const config = await this.loadBalancerService.configureLoadBalancer({
          regions,
          algorithm,
          healthChecks,
          ssl
        });

        res.json({
          success: true,
          configId: config.id,
          status: config.status
        });
      } catch (error) {
        logger.error('Load balancer configuration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Configuration failed' });
      }
    });

    // Infrastructure provisioning
    this.app.post('/api/v1/infrastructure/provision', async (req, res) => {
      try {
        const { region, resources, configuration } = req.body;

        if (!region || !resources) {
          return res.status(400).json({
            error: 'Missing required fields: region, resources'
          });
        }

        const infrastructure = await this.infrastructureService.provisionInfrastructure(
          region,
          resources,
          configuration
        );

        res.json({
          success: true,
          infrastructureId: infrastructure.id,
          status: infrastructure.status,
          resources: infrastructure.resources
        });
      } catch (error) {
        logger.error('Infrastructure provisioning error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Provisioning failed' });
      }
    });

    // Service discovery
    this.app.get('/api/v1/discovery/:service', async (req, res) => {
      try {
        const { service } = req.params;
        const { region } = req.query;

        const endpoints = await this.deploymentService.discoverService(
          service,
          region as string
        );

        res.json(endpoints);
      } catch (error) {
        logger.error('Service discovery error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Service discovery failed' });
      }
    });

    // Health monitoring
    this.app.get('/api/v1/health/global', async (req, res) => {
      try {
        const { regions } = req.query;

        const healthStatus = await this.monitoringService.getGlobalHealth(
          regions ? (regions as string).split(',') : undefined
        );

        res.json(healthStatus);
      } catch (error) {
        logger.error('Global health check error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Health check failed' });
      }
    });

    // Auto-scaling configuration
    this.app.post('/api/v1/autoscaling/configure', async (req, res) => {
      try {
        const { service, region, minInstances, maxInstances, metrics } = req.body;

        if (!service || !region || !minInstances || !maxInstances) {
          return res.status(400).json({
            error: 'Missing required fields: service, region, minInstances, maxInstances'
          });
        }

        const scalingConfig = await this.infrastructureService.configureAutoScaling({
          service,
          region,
          minInstances,
          maxInstances,
          metrics
        });

        res.json({
          success: true,
          configId: scalingConfig.id,
          status: scalingConfig.status
        });
      } catch (error) {
        logger.error('Auto-scaling configuration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Auto-scaling configuration failed' });
      }
    });

    // Disaster recovery
    this.app.post('/api/v1/disaster-recovery/failover', async (req, res) => {
      try {
        const { primaryRegion, backupRegion, services } = req.body;

        if (!primaryRegion || !backupRegion || !services) {
          return res.status(400).json({
            error: 'Missing required fields: primaryRegion, backupRegion, services'
          });
        }

        const failover = await this.deploymentService.initiateFailover(
          primaryRegion,
          backupRegion,
          services
        );

        res.json({
          success: true,
          failoverId: failover.id,
          status: failover.status,
          estimatedTime: failover.estimatedTime
        });
      } catch (error) {
        logger.error('Disaster recovery error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failover failed' });
      }
    });

    // Performance monitoring
    this.app.get('/api/v1/performance/:region', async (req, res) => {
      try {
        const { region } = req.params;
        const { timeRange = '1h' } = req.query;

        const performance = await this.monitoringService.getPerformanceMetrics(
          region,
          timeRange as string
        );

        res.json(performance);
      } catch (error) {
        logger.error('Performance monitoring error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get performance metrics' });
      }
    });

    // Cost optimization
    this.app.get('/api/v1/costs/optimization', async (req, res) => {
      try {
        const { regions, timeRange = '30d' } = req.query;

        const optimization = await this.infrastructureService.getCostOptimization(
          regions ? (regions as string).split(',') : undefined,
          timeRange as string
        );

        res.json(optimization);
      } catch (error) {
        logger.error('Cost optimization error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get cost optimization' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Deployment Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          deployments: '/api/v1/deployments',
          loadbalancer: '/api/v1/loadbalancer',
          infrastructure: '/api/v1/infrastructure',
          global: '/api/v1/deploy/global',
          configure: '/api/v1/loadbalancer/configure',
          provision: '/api/v1/infrastructure/provision',
          discovery: '/api/v1/discovery/:service',
          health: '/api/v1/health/global',
          autoscaling: '/api/v1/autoscaling/configure',
          failover: '/api/v1/disaster-recovery/failover',
          performance: '/api/v1/performance/:region',
          costs: '/api/v1/costs/optimization'
        }
      });
    });
  }

  private setupWebSocketEvents(): void {
    this.io.on('connection', (socket) => {
      logger.info('Deployment client connected', {
        socketId: socket.id
      });

      // Handle deployment status updates
      socket.on('subscribeDeployment', (data) => {
        const { deploymentId, regions } = data;
        this.deploymentService.subscribeToDeployment(socket, deploymentId, regions);
      });

      // Handle infrastructure monitoring
      socket.on('subscribeInfrastructure', (data) => {
        const { region, resources } = data;
        this.infrastructureService.subscribeToInfrastructure(socket, region, resources);
      });

      // Handle load balancer events
      socket.on('subscribeLoadBalancer', (data) => {
        const { loadBalancerId } = data;
        this.loadBalancerService.subscribeToLoadBalancer(socket, loadBalancerId);
      });

      socket.on('disconnect', () => {
        logger.info('Deployment client disconnected', {
          socketId: socket.id
        });
        this.deploymentService.unsubscribeFromDeployment(socket);
        this.infrastructureService.unsubscribeFromInfrastructure(socket);
        this.loadBalancerService.unsubscribeFromLoadBalancer(socket);
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
    // Health checks for all regions
    cron.schedule('*/2 * * * *', async () => {
      try {
        logger.info('Running global health checks...');
        await this.monitoringService.runGlobalHealthChecks();
      } catch (error) {
        logger.error('Error running health checks', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Auto-scaling evaluation
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Evaluating auto-scaling policies...');
        await this.infrastructureService.evaluateAutoScaling();
      } catch (error) {
        logger.error('Error evaluating auto-scaling', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Cost optimization analysis
    cron.schedule('0 1 * * *', async () => {
      try {
        logger.info('Running cost optimization analysis...');
        await this.infrastructureService.analyzeCostOptimization();
      } catch (error) {
        logger.error('Error analyzing cost optimization', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Infrastructure cleanup
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Cleaning up unused infrastructure...');
        await this.infrastructureService.cleanupUnusedResources();
      } catch (error) {
        logger.error('Error cleaning up infrastructure', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(config.port, () => {
        logger.info(`Deployment Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Deployment Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close WebSocket connections
      this.io.close();

      // Close service connections
      await this.deploymentService.shutdown();
      await this.loadBalancerService.shutdown();
      await this.infrastructureService.shutdown();
      await this.monitoringService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Deployment Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const deploymentService = new DeploymentService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(deploymentService.server);
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
deploymentService.initialize().catch((error) => {
  logger.error('Failed to start Deployment Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default deploymentService; 