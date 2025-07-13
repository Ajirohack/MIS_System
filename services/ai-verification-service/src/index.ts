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
import { FraudDetectionController } from './controllers/fraud.detection.controller';
import { DocumentVerificationController } from './controllers/document.verification.controller';
import { BehavioralAnalysisController } from './controllers/behavioral.analysis.controller';
import { HealthController } from './controllers/health.controller';
import { FraudDetectionService } from './services/fraud.detection.service';
import { DocumentVerificationService } from './services/document.verification.service';
import { BehavioralAnalysisService } from './services/behavioral.analysis.service';
import { MLModelService } from './services/ml.model.service';
import { config } from './config';

// Load environment variables
dotenv.config();

class AIVerificationService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private fraudDetectionService: FraudDetectionService;
  private documentVerificationService: DocumentVerificationService;
  private behavioralAnalysisService: BehavioralAnalysisService;
  private mlModelService: MLModelService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.fraudDetectionService = new FraudDetectionService();
    this.documentVerificationService = new DocumentVerificationService();
    this.behavioralAnalysisService = new BehavioralAnalysisService();
    this.mlModelService = new MLModelService();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AI Verification Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.fraudDetectionService.initialize();
      await this.documentVerificationService.initialize();
      await this.behavioralAnalysisService.initialize();
      await this.mlModelService.initialize();

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

      logger.info('AI Verification Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Verification Service', {
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
      logger.info('AI Verification API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Fraud detection routes
    const fraudDetectionController = new FraudDetectionController(
      this.databaseService,
      this.fraudDetectionService
    );
    this.app.use('/api/v1/fraud', fraudDetectionController.router);

    // Document verification routes
    const documentVerificationController = new DocumentVerificationController(
      this.databaseService,
      this.documentVerificationService
    );
    this.app.use('/api/v1/documents', documentVerificationController.router);

    // Behavioral analysis routes
    const behavioralAnalysisController = new BehavioralAnalysisController(
      this.databaseService,
      this.behavioralAnalysisService
    );
    this.app.use('/api/v1/behavior', behavioralAnalysisController.router);

    // Comprehensive verification endpoint
    this.app.post('/api/v1/verify/comprehensive', async (req, res) => {
      try {
        const { userId, data, verificationType } = req.body;
        
        if (!userId || !data || !verificationType) {
          return res.status(400).json({
            error: 'Missing required fields: userId, data, verificationType'
          });
        }

        const result = await this.performComprehensiveVerification(
          userId,
          data,
          verificationType
        );
        
        res.json({
          success: result.success,
          score: result.score,
          riskLevel: result.riskLevel,
          details: result.details,
          recommendations: result.recommendations
        });
      } catch (error) {
        logger.error('Comprehensive verification error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Risk assessment endpoint
    this.app.post('/api/v1/risk/assess', async (req, res) => {
      try {
        const { userId, activity, context } = req.body;
        
        if (!userId || !activity) {
          return res.status(400).json({
            error: 'Missing required fields: userId, activity'
          });
        }

        const riskAssessment = await this.fraudDetectionService.assessRisk(
          userId,
          activity,
          context
        );
        
        res.json({
          riskScore: riskAssessment.score,
          riskLevel: riskAssessment.level,
          factors: riskAssessment.factors,
          recommendations: riskAssessment.recommendations
        });
      } catch (error) {
        logger.error('Risk assessment error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Risk assessment failed' });
      }
    });

    // Document OCR and verification
    this.app.post('/api/v1/documents/ocr', async (req, res) => {
      try {
        const { documentType, imageData, expectedFields } = req.body;
        
        if (!documentType || !imageData) {
          return res.status(400).json({
            error: 'Missing required fields: documentType, imageData'
          });
        }

        const ocrResult = await this.documentVerificationService.performOCR(
          documentType,
          imageData,
          expectedFields
        );
        
        res.json({
          success: ocrResult.success,
          extractedData: ocrResult.data,
          confidence: ocrResult.confidence,
          validation: ocrResult.validation
        });
      } catch (error) {
        logger.error('OCR processing error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'OCR processing failed' });
      }
    });

    // Behavioral pattern analysis
    this.app.post('/api/v1/behavior/analyze', async (req, res) => {
      try {
        const { userId, behaviorData, timeRange } = req.body;
        
        if (!userId || !behaviorData) {
          return res.status(400).json({
            error: 'Missing required fields: userId, behaviorData'
          });
        }

        const analysis = await this.behavioralAnalysisService.analyzePatterns(
          userId,
          behaviorData,
          timeRange
        );
        
        res.json({
          patterns: analysis.patterns,
          anomalies: analysis.anomalies,
          riskIndicators: analysis.riskIndicators,
          recommendations: analysis.recommendations
        });
      } catch (error) {
        logger.error('Behavioral analysis error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Behavioral analysis failed' });
      }
    });

    // Model training and updates
    this.app.post('/api/v1/models/train', async (req, res) => {
      try {
        const { modelType, trainingData, parameters } = req.body;
        
        if (!modelType || !trainingData) {
          return res.status(400).json({
            error: 'Missing required fields: modelType, trainingData'
          });
        }

        const trainingResult = await this.mlModelService.trainModel(
          modelType,
          trainingData,
          parameters
        );
        
        res.json({
          success: trainingResult.success,
          modelId: trainingResult.modelId,
          accuracy: trainingResult.accuracy,
          trainingTime: trainingResult.trainingTime
        });
      } catch (error) {
        logger.error('Model training error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Model training failed' });
      }
    });

    // Model performance metrics
    this.app.get('/api/v1/models/performance', async (req, res) => {
      try {
        const { modelType, timeRange } = req.query;
        
        const performance = await this.mlModelService.getModelPerformance(
          modelType as string,
          timeRange as string
        );
        
        res.json(performance);
      } catch (error) {
        logger.error('Model performance error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to get model performance' });
      }
    });

    // AI insights and recommendations
    this.app.get('/api/v1/insights/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { type, timeRange } = req.query;
        
        const insights = await this.generateAIInsights(
          userId,
          type as string,
          timeRange as string
        );
        
        res.json(insights);
      } catch (error) {
        logger.error('AI insights error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Failed to generate insights' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'AI Verification Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          fraud: '/api/v1/fraud',
          documents: '/api/v1/documents',
          behavior: '/api/v1/behavior',
          comprehensive: '/api/v1/verify/comprehensive',
          risk: '/api/v1/risk/assess',
          ocr: '/api/v1/documents/ocr',
          analyze: '/api/v1/behavior/analyze',
          models: '/api/v1/models',
          insights: '/api/v1/insights/:userId'
        }
      });
    });
  }

  private async performComprehensiveVerification(
    userId: string,
    data: any,
    verificationType: string
  ): Promise<any> {
    const results = {
      fraud: await this.fraudDetectionService.detectFraud(userId, data),
      document: await this.documentVerificationService.verifyDocument(data),
      behavior: await this.behavioralAnalysisService.analyzeBehavior(userId, data)
    };

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(results);
    const riskLevel = this.determineRiskLevel(riskScore);

    return {
      success: riskScore < 0.7, // 70% threshold
      score: riskScore,
      riskLevel,
      details: results,
      recommendations: this.generateRecommendations(results, riskLevel)
    };
  }

  private calculateRiskScore(results: any): number {
    const weights = {
      fraud: 0.4,
      document: 0.3,
      behavior: 0.3
    };

    return (
      results.fraud.riskScore * weights.fraud +
      results.document.riskScore * weights.document +
      results.behavior.riskScore * weights.behavior
    );
  }

  private determineRiskLevel(score: number): string {
    if (score < 0.3) return 'low';
    if (score < 0.7) return 'medium';
    return 'high';
  }

  private generateRecommendations(results: any, riskLevel: string): string[] {
    const recommendations = [];

    if (results.fraud.riskScore > 0.5) {
      recommendations.push('Additional fraud verification required');
    }

    if (results.document.riskScore > 0.5) {
      recommendations.push('Document verification needs manual review');
    }

    if (results.behavior.riskScore > 0.5) {
      recommendations.push('Behavioral pattern requires investigation');
    }

    if (riskLevel === 'high') {
      recommendations.push('Immediate manual review recommended');
    }

    return recommendations;
  }

  private async generateAIInsights(
    userId: string,
    type: string,
    timeRange: string
  ): Promise<any> {
    const insights = {
      fraud: await this.fraudDetectionService.getInsights(userId, timeRange),
      behavior: await this.behavioralAnalysisService.getInsights(userId, timeRange),
      patterns: await this.behavioralAnalysisService.getPatterns(userId, timeRange)
    };

    return {
      userId,
      type,
      timeRange,
      insights,
      summary: this.generateInsightSummary(insights)
    };
  }

  private generateInsightSummary(insights: any): string {
    // Generate natural language summary of insights
    const summary = [];
    
    if (insights.fraud.riskTrend === 'increasing') {
      summary.push('Fraud risk has been increasing over time');
    }
    
    if (insights.behavior.anomalies.length > 0) {
      summary.push(`Detected ${insights.behavior.anomalies.length} behavioral anomalies`);
    }
    
    if (insights.patterns.regularity > 0.8) {
      summary.push('User shows consistent behavioral patterns');
    }

    return summary.join('. ') || 'No significant insights detected';
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupScheduledTasks(): void {
    // Retrain models weekly
    cron.schedule('0 2 * * 0', async () => {
      try {
        logger.info('Retraining AI models...');
        await this.mlModelService.retrainModels();
      } catch (error) {
        logger.error('Error retraining models', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Update fraud patterns daily
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Updating fraud detection patterns...');
        await this.fraudDetectionService.updatePatterns();
      } catch (error) {
        logger.error('Error updating fraud patterns', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Generate insights daily
    cron.schedule('0 4 * * *', async () => {
      try {
        logger.info('Generating AI insights...');
        await this.generateDailyInsights();
      } catch (error) {
        logger.error('Error generating insights', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Scheduled tasks configured');
  }

  private async generateDailyInsights(): Promise<void> {
    // Generate daily insights for all active users
    const activeUsers = await this.databaseService.getActiveUsers();
    
    for (const user of activeUsers) {
      try {
        await this.generateAIInsights(user.id, 'daily', '24h');
      } catch (error) {
        logger.error('Error generating insights for user', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, () => {
        logger.info(`AI Verification Service listening on port ${config.port}`, {
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
      logger.info('Shutting down AI Verification Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close service connections
      await this.fraudDetectionService.shutdown();
      await this.documentVerificationService.shutdown();
      await this.behavioralAnalysisService.shutdown();
      await this.mlModelService.shutdown();

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      logger.info('AI Verification Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const aiVerificationService = new AIVerificationService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(aiVerificationService.server);
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
aiVerificationService.initialize().catch((error) => {
  logger.error('Failed to start AI Verification Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default aiVerificationService; 