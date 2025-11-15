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
import { PushNotificationController } from './controllers/push.notification.controller';
import { OfflineSyncController } from './controllers/offline.sync.controller';
import { MobileAuthController } from './controllers/mobile.auth.controller';
import { HealthController } from './controllers/health.controller';
import { PushNotificationService } from './services/push.notification.service';
import { OfflineSyncService } from './services/offline.sync.service';
import { MobileAuthService } from './services/mobile.auth.service';
import { DeviceManagementService } from './services/device.management.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class MobileService {
  private app: express.Application;
  private server: any;
  private io: Server;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private pushNotificationService: PushNotificationService;
  private offlineSyncService: OfflineSyncService;
  private mobileAuthService: MobileAuthService;
  private deviceManagementService: DeviceManagementService;

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
    this.pushNotificationService = new PushNotificationService();
    this.offlineSyncService = new OfflineSyncService();
    this.mobileAuthService = new MobileAuthService();
    this.deviceManagementService = new DeviceManagementService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Mobile Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.pushNotificationService.initialize();
      await this.offlineSyncService.initialize();
      await this.mobileAuthService.initialize();
      await this.deviceManagementService.initialize();

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

      logger.info('Mobile Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Mobile Service', {
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
      logger.info('Mobile API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Push notification routes
    const pushNotificationController = new PushNotificationController(
      this.databaseService,
      this.pushNotificationService
    );
    this.app.use('/api/v1/push', pushNotificationController.router);

    // Offline sync routes
    const offlineSyncController = new OfflineSyncController(
      this.databaseService,
      this.offlineSyncService
    );
    this.app.use('/api/v1/sync', offlineSyncController.router);

    // Mobile auth routes
    const mobileAuthController = new MobileAuthController(
      this.databaseService,
      this.mobileAuthService
    );
    this.app.use('/api/v1/auth', mobileAuthController.router);

    // Device registration
    this.app.post('/api/v1/devices/register', async (req, res) => {
      try {
        const { userId, deviceToken, platform, appVersion, deviceInfo } = req.body;

        if (!userId || !deviceToken || !platform) {
          return res.status(400).json({
            error: 'Missing required fields: userId, deviceToken, platform'
          });
        }

        const device = await this.deviceManagementService.registerDevice({
          userId,
          deviceToken,
          platform,
          appVersion,
          deviceInfo
        });

        res.json({
          success: true,
          deviceId: device.id,
          status: device.status
        });
      } catch (error) {
        logger.error('Device registration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Device registration failed' });
      }
    });

    // Device unregistration
    this.app.delete('/api/v1/devices/:deviceId', async (req, res) => {
      try {
        const { deviceId } = req.params;
        await this.deviceManagementService.unregisterDevice(deviceId);

        res.json({ success: true, message: 'Device unregistered successfully' });
      } catch (error) {
        logger.error('Device unregistration error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Device unregistration failed' });
      }
    });

    // Send push notification
    this.app.post('/api/v1/notifications/send', async (req, res) => {
      try {
        const { userIds, title, body, data, priority = 'normal' } = req.body;

        if (!userIds || !title || !body) {
          return res.status(400).json({
            error: 'Missing required fields: userIds, title, body'
          });
        }

        const result = await this.pushNotificationService.sendNotification({
          userIds: Array.isArray(userIds) ? userIds : [userIds],
          title,
          body,
          data,
          priority
        });

        res.json({
          success: true,
          sent: result.sent,
          failed: result.failed,
          total: result.total
        });
      } catch (error) {
        logger.error('Push notification error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to send notification' });
      }
    });

    // Offline data sync
    this.app.post('/api/v1/sync/data', async (req, res) => {
      try {
        const { userId, data, lastSyncTimestamp } = req.body;

        if (!userId || !data) {
          return res.status(400).json({
            error: 'Missing required fields: userId, data'
          });
        }

        const syncResult = await this.offlineSyncService.syncData(
          userId,
          data,
          lastSyncTimestamp
        );

        res.json({
          success: true,
          synced: syncResult.synced,
          conflicts: syncResult.conflicts,
          newData: syncResult.newData
        });
      } catch (error) {
        logger.error('Data sync error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Data sync failed' });
      }
    });

    // Get offline data
    this.app.get('/api/v1/sync/data/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { lastSyncTimestamp } = req.query;

        const offlineData = await this.offlineSyncService.getOfflineData(
          userId,
          lastSyncTimestamp as string
        );

        res.json(offlineData);
      } catch (error) {
        logger.error('Get offline data error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get offline data' });
      }
    });

    // Mobile authentication
    this.app.post('/api/v1/auth/mobile', async (req, res) => {
      try {
        const { deviceId, biometricData, pinCode } = req.body;

        if (!deviceId) {
          return res.status(400).json({
            error: 'Missing required field: deviceId'
          });
        }

        const authResult = await this.mobileAuthService.authenticateDevice(
          deviceId,
          { biometricData, pinCode }
        );

        res.json({
          success: authResult.success,
          token: authResult.token,
          user: authResult.user
        });
      } catch (error) {
        logger.error('Mobile authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Mobile app configuration
    this.app.get('/api/v1/config/:platform', async (req, res) => {
      try {
        const { platform } = req.params;
        const { version } = req.query;

        const config = await this.getMobileConfig(platform, version as string);

        res.json(config);
      } catch (error) {
        logger.error('Mobile config error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get configuration' });
      }
    });

    // App update check
    this.app.get('/api/v1/updates/:platform', async (req, res) => {
      try {
        const { platform } = req.params;
        const { currentVersion } = req.query;

        const updateInfo = await this.checkForUpdates(platform, currentVersion as string);

        res.json(updateInfo);
      } catch (error) {
        logger.error('Update check error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to check for updates' });
      }
    });

    // Mobile analytics
    this.app.post('/api/v1/analytics', async (req, res) => {
      try {
        const { userId, events, sessionData } = req.body;

        if (!userId || !events) {
          return res.status(400).json({
            error: 'Missing required fields: userId, events'
          });
        }

        await this.trackMobileAnalytics(userId, events, sessionData);

        res.json({ success: true });
      } catch (error) {
        logger.error('Mobile analytics error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to track analytics' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Mobile Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          push: '/api/v1/push',
          sync: '/api/v1/sync',
          auth: '/api/v1/auth',
          devices: '/api/v1/devices',
          notifications: '/api/v1/notifications',
          config: '/api/v1/config/:platform',
          updates: '/api/v1/updates/:platform',
          analytics: '/api/v1/analytics'
        }
      });
    });
  }

  private setupWebSocketEvents(): void {
    this.io.on('connection', (socket) => {
      logger.info('Mobile client connected', {
        socketId: socket.id
      });

      // Handle real-time notifications
      socket.on('subscribe', (data) => {
        const { userId, channels } = data;
        this.pushNotificationService.subscribeToChannels(socket, userId, channels);
      });

      // Handle offline sync status
      socket.on('syncStatus', (data) => {
        const { userId, status } = data;
        this.offlineSyncService.updateSyncStatus(userId, status);
      });

      // Handle device status updates
      socket.on('deviceStatus', (data) => {
        const { deviceId, status, battery, network } = data;
        this.deviceManagementService.updateDeviceStatus(deviceId, {
          status,
          battery,
          network
        });
      });

      socket.on('disconnect', () => {
        logger.info('Mobile client disconnected', {
          socketId: socket.id
        });
        this.pushNotificationService.unsubscribeFromChannels(socket);
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
    // Clean up inactive devices
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Cleaning up inactive devices...');
        await this.deviceManagementService.cleanupInactiveDevices();
      } catch (error) {
        logger.error('Error cleaning up devices', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Send scheduled notifications
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Processing scheduled notifications...');
        await this.pushNotificationService.processScheduledNotifications();
      } catch (error) {
        logger.error('Error processing scheduled notifications', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Sync offline data
    cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Processing offline sync...');
        await this.offlineSyncService.processOfflineSync();
      } catch (error) {
        logger.error('Error processing offline sync', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async getMobileConfig(platform: string, version?: string): Promise<any> {
    const baseConfig = {
      apiVersion: '1.0.0',
      features: {
        pushNotifications: true,
        offlineSync: true,
        biometricAuth: true,
        darkMode: true
      },
      endpoints: {
        api: config.baseUrl,
        websocket: config.baseUrl.replace('http', 'ws')
      }
    };

    const platformConfig = await this.databaseService.getPlatformConfig(platform, version);
    return { ...baseConfig, ...platformConfig };
  }

  private async checkForUpdates(platform: string, currentVersion: string): Promise<any> {
    const latestVersion = await this.databaseService.getLatestVersion(platform);
    
    if (latestVersion.version > currentVersion) {
      return {
        updateAvailable: true,
        latestVersion: latestVersion.version,
        downloadUrl: latestVersion.downloadUrl,
        changelog: latestVersion.changelog,
        forceUpdate: latestVersion.forceUpdate
      };
    }

    return { updateAvailable: false };
  }

  private async trackMobileAnalytics(userId: string, events: any[], sessionData?: any): Promise<void> {
    await this.databaseService.trackMobileEvents(userId, events, sessionData);
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(config.port, () => {
        logger.info(`Mobile Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Mobile Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close WebSocket connections
      this.io.close();

      // Close service connections
      await this.pushNotificationService.shutdown();
      await this.offlineSyncService.shutdown();
      await this.mobileAuthService.shutdown();
      await this.deviceManagementService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Mobile Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const mobileService = new MobileService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(mobileService.server);
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
mobileService.initialize().catch((error) => {
  logger.error('Failed to start Mobile Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default mobileService; 