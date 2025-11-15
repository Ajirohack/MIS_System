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
import { AnalyticsController } from './controllers/analytics.controller';
import { ReportingController } from './controllers/reporting.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { HealthController } from './controllers/health.controller';
import { AnalyticsProcessor } from './services/analytics.processor';
import { ReportingService } from './services/reporting.service';
import { DashboardService } from './services/dashboard.service';
import { RealTimeService } from './services/realtime.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class AnalyticsService {
  private app: express.Application;
  private server: any;
  private io: Server;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private analyticsProcessor: AnalyticsProcessor;
  private reportingService: ReportingService;
  private dashboardService: DashboardService;
  private realTimeService: RealTimeService;

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
    this.analyticsProcessor = new AnalyticsProcessor(this.databaseService);
    this.reportingService = new ReportingService();
    this.dashboardService = new DashboardService();
    this.realTimeService = new RealTimeService(this.io, this.redisService);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Analytics Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.analyticsProcessor.initialize();
      await this.reportingService.initialize();
      await this.dashboardService.initialize();
      await this.realTimeService.initialize();

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

      logger.info('Analytics Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Analytics Service', {
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
      logger.info('Analytics API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Analytics routes
    const analyticsController = new AnalyticsController(
      this.databaseService,
      this.analyticsProcessor
    );
    this.app.use('/api/v1/analytics', analyticsController.router);

    // Reporting routes
    const reportingController = new ReportingController(
      this.databaseService,
      this.reportingService
    );
    this.app.use('/api/v1/reports', reportingController.router);

    // Dashboard routes
    const dashboardController = new DashboardController(
      this.databaseService,
      this.dashboardService
    );
    this.app.use('/api/v1/dashboard', dashboardController.router);

    // Real-time analytics endpoint
    this.app.get('/api/v1/realtime/:metric', async (req, res) => {
      try {
        const { metric } = req.params;
        const { timeRange = '1h' } = req.query;

        const realTimeData = await this.analyticsProcessor.getRealTimeData(
          metric,
          timeRange as string
        );

        res.json(realTimeData);
      } catch (error) {
        logger.error('Real-time analytics error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get real-time data' });
      }
    });

    // Custom analytics query
    this.app.post('/api/v1/query', async (req, res) => {
      try {
        const { query, parameters, format = 'json' } = req.body;

        if (!query) {
          return res.status(400).json({
            error: 'Missing required field: query'
          });
        }

        const result = await this.analyticsProcessor.executeQuery(
          query,
          parameters,
          format
        );

        res.json(result);
      } catch (error) {
        logger.error('Custom query error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Query execution failed' });
      }
    });

    // Export analytics data
    this.app.post('/api/v1/export', async (req, res) => {
      try {
        const { data, format, filename } = req.body;

        if (!data || !format) {
          return res.status(400).json({
            error: 'Missing required fields: data, format'
          });
        }

        const exportResult = await this.reportingService.exportData(
          data,
          format,
          filename
        );

        res.setHeader('Content-Type', exportResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.send(exportResult.data);
      } catch (error) {
        logger.error('Export error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Export failed' });
      }
    });

    // Dashboard widgets
    this.app.get('/api/v1/widgets/:widgetType', async (req, res) => {
      try {
        const { widgetType } = req.params;
        const { parameters } = req.query;

        const widgetData = await this.dashboardService.getWidgetData(
          widgetType,
          parameters ? JSON.parse(parameters as string) : {}
        );

        res.json(widgetData);
      } catch (error) {
        logger.error('Widget data error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get widget data' });
      }
    });

    // KPI tracking
    this.app.get('/api/v1/kpis', async (req, res) => {
      try {
        const { timeRange = '30d' } = req.query;

        const kpis = await this.analyticsProcessor.getKPIs(timeRange as string);

        res.json(kpis);
      } catch (error) {
        logger.error('KPI error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get KPIs' });
      }
    });

    // Trend analysis
    this.app.get('/api/v1/trends/:metric', async (req, res) => {
      try {
        const { metric } = req.params;
        const { timeRange = '90d', granularity = 'day' } = req.query;

        const trends = await this.analyticsProcessor.analyzeTrends(
          metric,
          timeRange as string,
          granularity as string
        );

        res.json(trends);
      } catch (error) {
        logger.error('Trend analysis error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to analyze trends' });
      }
    });

    // Predictive analytics
    this.app.post('/api/v1/predict', async (req, res) => {
      try {
        const { metric, timeHorizon, parameters } = req.body;

        if (!metric || !timeHorizon) {
          return res.status(400).json({
            error: 'Missing required fields: metric, timeHorizon'
          });
        }

        const prediction = await this.analyticsProcessor.generatePrediction(
          metric,
          timeHorizon,
          parameters
        );

        res.json(prediction);
      } catch (error) {
        logger.error('Prediction error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Prediction failed' });
      }
    });

    // Alert management
    this.app.get('/api/v1/alerts', async (req, res) => {
      try {
        const { status, severity } = req.query;

        const alerts = await this.analyticsProcessor.getAlerts({
          status: status as string,
          severity: severity as string
        });

        res.json(alerts);
      } catch (error) {
        logger.error('Alerts error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get alerts' });
      }
    });

    this.app.post('/api/v1/alerts', async (req, res) => {
      try {
        const { metric, threshold, condition, notification } = req.body;

        if (!metric || !threshold || !condition) {
          return res.status(400).json({
            error: 'Missing required fields: metric, threshold, condition'
          });
        }

        const alert = await this.analyticsProcessor.createAlert({
          metric,
          threshold,
          condition,
          notification
        });

        res.json(alert);
      } catch (error) {
        logger.error('Alert creation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to create alert' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Analytics Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          analytics: '/api/v1/analytics',
          reports: '/api/v1/reports',
          dashboard: '/api/v1/dashboard',
          realtime: '/api/v1/realtime/:metric',
          query: '/api/v1/query',
          export: '/api/v1/export',
          widgets: '/api/v1/widgets/:widgetType',
          kpis: '/api/v1/kpis',
          trends: '/api/v1/trends/:metric',
          predict: '/api/v1/predict',
          alerts: '/api/v1/alerts'
        }
      });
    });
  }

  private setupWebSocketEvents(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to analytics', {
        socketId: socket.id
      });

      // Subscribe to real-time metrics
      socket.on('subscribe', (data) => {
        const { metrics, userId } = data;
        this.realTimeService.subscribe(socket, metrics, userId);
      });

      // Unsubscribe from metrics
      socket.on('unsubscribe', (data) => {
        const { metrics } = data;
        this.realTimeService.unsubscribe(socket, metrics);
      });

      // Request historical data
      socket.on('getHistoricalData', async (data) => {
        try {
          const { metric, timeRange } = data;
          const historicalData = await this.analyticsProcessor.getHistoricalData(
            metric,
            timeRange
          );
          socket.emit('historicalData', historicalData);
        } catch (error) {
          socket.emit('error', { message: 'Failed to get historical data' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from analytics', {
          socketId: socket.id
        });
        this.realTimeService.unsubscribeAll(socket);
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
    // Generate daily reports
    cron.schedule('0 1 * * *', async () => {
      try {
        logger.info('Generating daily reports...');
        await this.reportingService.generateDailyReports();
      } catch (error) {
        logger.error('Error generating daily reports', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Update analytics cache
    cron.schedule('*/15 * * * *', async () => {
      try {
        logger.info('Updating analytics cache...');
        await this.analyticsProcessor.updateCache();
      } catch (error) {
        logger.error('Error updating analytics cache', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Check alerts
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Checking alerts...');
        await this.analyticsProcessor.checkAlerts();
      } catch (error) {
        logger.error('Error checking alerts', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Generate weekly insights
    cron.schedule('0 2 * * 0', async () => {
      try {
        logger.info('Generating weekly insights...');
        await this.analyticsProcessor.generateWeeklyInsights();
      } catch (error) {
        logger.error('Error generating weekly insights', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(config.port, () => {
        logger.info(`Analytics Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Analytics Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close WebSocket connections
      this.io.close();

      // Close service connections
      await this.analyticsProcessor.shutdown();
      await this.reportingService.shutdown();
      await this.dashboardService.shutdown();
      await this.realTimeService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Analytics Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const analyticsService = new AnalyticsService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(analyticsService.server);
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
analyticsService.initialize().catch((error) => {
  logger.error('Failed to start Analytics Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default analyticsService; 