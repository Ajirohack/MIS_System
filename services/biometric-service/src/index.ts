import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from '@shared/utils/logger';
import { errorHandler, notFoundHandler, gracefulShutdown } from '@shared/middleware/errorHandler';
import { addRequestContext } from '@shared/middleware/auth';
import { rateLimit } from '@shared/middleware/rateLimit';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { BiometricController } from './controllers/biometric.controller';
import { FaceRecognitionController } from './controllers/face.recognition.controller';
import { FingerprintController } from './controllers/fingerprint.controller';
import { VoiceController } from './controllers/voice.controller';
import { HealthController } from './controllers/health.controller';
import { BiometricProcessor } from './services/biometric.processor';
import { FaceRecognitionService } from './services/face.recognition.service';
import { FingerprintService } from './services/fingerprint.service';
import { VoiceService } from './services/voice.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class BiometricService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private biometricProcessor: BiometricProcessor;
  private faceRecognitionService: FaceRecognitionService;
  private fingerprintService: FingerprintService;
  private voiceService: VoiceService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.biometricProcessor = new BiometricProcessor(this.databaseService);
    this.faceRecognitionService = new FaceRecognitionService();
    this.fingerprintService = new FingerprintService();
    this.voiceService = new VoiceService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Biometric Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.faceRecognitionService.initialize();
      await this.fingerprintService.initialize();
      await this.voiceService.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start server
      await this.startServer();

      logger.info('Biometric Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Biometric Service', {
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
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          mediaSrc: ["'self'", "data:", "https:", "blob:"],
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
      logger.info('Biometric API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Biometric management routes
    const biometricController = new BiometricController(
      this.databaseService,
      this.biometricProcessor
    );
    this.app.use('/api/v1/biometrics', biometricController.router);

    // Face recognition routes
    const faceRecognitionController = new FaceRecognitionController(
      this.databaseService,
      this.faceRecognitionService
    );
    this.app.use('/api/v1/face', faceRecognitionController.router);

    // Fingerprint routes
    const fingerprintController = new FingerprintController(
      this.databaseService,
      this.fingerprintService
    );
    this.app.use('/api/v1/fingerprint', fingerprintController.router);

    // Voice authentication routes
    const voiceController = new VoiceController(
      this.databaseService,
      this.voiceService
    );
    this.app.use('/api/v1/voice', voiceController.router);

    // Multi-factor biometric authentication
    this.app.post('/api/v1/auth/multi-factor', async (req, res) => {
      try {
        const { userId, biometricData, factors } = req.body;
        
        if (!userId || !biometricData || !factors) {
          return res.status(400).json({
            error: 'Missing required fields: userId, biometricData, factors'
          });
        }

        const result = await this.biometricProcessor.authenticateMultiFactor(
          userId,
          biometricData,
          factors
        );
        
        res.json({
          success: result.success,
          confidence: result.confidence,
          factors: result.factors,
          token: result.token
        });
      } catch (error) {
        logger.error('Multi-factor authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Biometric enrollment
    this.app.post('/api/v1/enroll', async (req, res) => {
      try {
        const { userId, biometricType, data, metadata } = req.body;
        
        if (!userId || !biometricType || !data) {
          return res.status(400).json({
            error: 'Missing required fields: userId, biometricType, data'
          });
        }

        const enrollment = await this.biometricProcessor.enrollBiometric(
          userId,
          biometricType,
          data,
          metadata
        );
        
        res.json({
          success: true,
          enrollmentId: enrollment.id,
          biometricType,
          confidence: enrollment.confidence
        });
      } catch (error) {
        logger.error('Biometric enrollment error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Enrollment failed' });
      }
    });

    // Biometric verification
    this.app.post('/api/v1/verify', async (req, res) => {
      try {
        const { userId, biometricType, data, threshold } = req.body;
        
        if (!userId || !biometricType || !data) {
          return res.status(400).json({
            error: 'Missing required fields: userId, biometricType, data'
          });
        }

        const verification = await this.biometricProcessor.verifyBiometric(
          userId,
          biometricType,
          data,
          threshold
        );
        
        res.json({
          success: verification.success,
          confidence: verification.confidence,
          threshold: verification.threshold,
          match: verification.match
        });
      } catch (error) {
        logger.error('Biometric verification error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Biometric template management
    this.app.get('/api/v1/templates/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const templates = await this.databaseService.getBiometricTemplates(userId);
        
        res.json({
          userId,
          templates: templates.map(t => ({
            id: t.id,
            type: t.type,
            createdAt: t.createdAt,
            lastUsed: t.lastUsed,
            confidence: t.confidence
          }))
        });
      } catch (error) {
        logger.error('Template retrieval error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to retrieve templates' });
      }
    });

    this.app.delete('/api/v1/templates/:templateId', async (req, res) => {
      try {
        const { templateId } = req.params;
        await this.databaseService.deleteBiometricTemplate(templateId);
        
        res.json({ success: true, message: 'Template deleted successfully' });
      } catch (error) {
        logger.error('Template deletion error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to delete template' });
      }
    });

    // Biometric analytics
    this.app.get('/api/v1/analytics', async (req, res) => {
      try {
        const { period = '30d', type } = req.query;
        
        const analytics = await this.biometricProcessor.getAnalytics({
          period: period as string,
          type: type as string
        });
        
        res.json(analytics);
      } catch (error) {
        logger.error('Analytics error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get analytics' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Biometric Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          biometrics: '/api/v1/biometrics',
          face: '/api/v1/face',
          fingerprint: '/api/v1/fingerprint',
          voice: '/api/v1/voice',
          multiFactor: '/api/v1/auth/multi-factor',
          enroll: '/api/v1/enroll',
          verify: '/api/v1/verify',
          templates: '/api/v1/templates/:userId',
          analytics: '/api/v1/analytics'
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
        logger.info(`Biometric Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Biometric Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close service connections
      await this.faceRecognitionService.shutdown();
      await this.fingerprintService.shutdown();
      await this.voiceService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('Biometric Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const biometricService = new BiometricService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(biometricService.server);
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
biometricService.initialize().catch((error) => {
  logger.error('Failed to start Biometric Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default biometricService; 