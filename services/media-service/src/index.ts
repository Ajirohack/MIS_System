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
import { StorageService } from './services/storage.service';
import { MediaController } from './controllers/media.controller';
import { UploadController } from './controllers/upload.controller';
import { HealthController } from './controllers/health.controller';
import { ImageProcessor } from './services/image.processor';
import { config } from './config';

// Load environment variables
dotenv.config();

class MediaService {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private storageService: StorageService;
  private imageProcessor: ImageProcessor;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.storageService = new StorageService();
    this.imageProcessor = new ImageProcessor();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Media Service...');

      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.storageService.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start server
      await this.startServer();

      logger.info('Media Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Media Service', {
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
      logger.info('Media API request', {
        method: req.method,
        path: req.path,
        ipAddress: req.ip
      });
      next();
    });

    // Media management routes
    const mediaController = new MediaController(
      this.databaseService,
      this.storageService,
      this.imageProcessor
    );
    this.app.use('/api/v1/media', mediaController.router);

    // Upload routes
    const uploadController = new UploadController(
      this.databaseService,
      this.storageService,
      this.imageProcessor
    );
    this.app.use('/api/v1/upload', uploadController.router);

    // File serving routes (for public files)
    this.app.get('/files/:fileId', async (req, res) => {
      try {
        const { fileId } = req.params;
        const { width, height, quality, format } = req.query;

        // Get file metadata from database
        const file = await this.databaseService.getMediaFile(fileId);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Check if file is public or user has access
        if (!file.isPublic) {
          // TODO: Add authentication check
          return res.status(403).json({ error: 'Access denied' });
        }

        let fileBuffer: Buffer;
        let contentType: string;

        // Process image if parameters are provided
        if (width || height || quality || format) {
          const processedImage = await this.imageProcessor.processImage(
            file.storagePath,
            {
              width: width ? parseInt(width as string) : undefined,
              height: height ? parseInt(height as string) : undefined,
              quality: quality ? parseInt(quality as string) : undefined,
              format: format as string || 'webp'
            }
          );
          fileBuffer = processedImage.buffer;
          contentType = processedImage.contentType;
        } else {
          // Serve original file
          fileBuffer = await this.storageService.getFile(file.storagePath);
          contentType = file.mimeType;
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('ETag', `"${file.hash}"`);

        // Send file
        res.send(fileBuffer);
      } catch (error) {
        logger.error('Error serving file', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileId: req.params.fileId
        });
        res.status(500).json({ error: 'Failed to serve file' });
      }
    });

    // Thumbnail generation endpoint
    this.app.get('/thumbnails/:fileId', async (req, res) => {
      try {
        const { fileId } = req.params;
        const { width = 200, height = 200, quality = 80 } = req.query;

        // Get file metadata
        const file = await this.databaseService.getMediaFile(fileId);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Check if it's an image
        if (!file.mimeType.startsWith('image/')) {
          return res.status(400).json({ error: 'File is not an image' });
        }

        // Generate thumbnail
        const thumbnail = await this.imageProcessor.generateThumbnail(
          file.storagePath,
          {
            width: parseInt(width as string),
            height: parseInt(height as string),
            quality: parseInt(quality as string)
          }
        );

        // Set headers
        res.setHeader('Content-Type', thumbnail.contentType);
        res.setHeader('Content-Length', thumbnail.buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        // Send thumbnail
        res.send(thumbnail.buffer);
      } catch (error) {
        logger.error('Error generating thumbnail', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileId: req.params.fileId
        });
        res.status(500).json({ error: 'Failed to generate thumbnail' });
      }
    });

    // Batch operations
    this.app.post('/api/v1/media/batch', async (req, res) => {
      try {
        const { operation, fileIds, options } = req.body;

        switch (operation) {
          case 'delete':
            await this.mediaController.batchDelete(fileIds);
            break;
          case 'update':
            await this.mediaController.batchUpdate(fileIds, options);
            break;
          case 'move':
            await this.mediaController.batchMove(fileIds, options.folder);
            break;
          default:
            return res.status(400).json({ error: 'Invalid operation' });
        }

        res.json({ message: 'Batch operation completed successfully' });
      } catch (error) {
        logger.error('Batch operation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Batch operation failed' });
      }
    });

    // Search and filtering
    this.app.get('/api/v1/media/search', async (req, res) => {
      try {
        const { q, type, tags, userId, page = 1, limit = 20 } = req.query;

        const results = await this.databaseService.searchMediaFiles({
          query: q as string,
          type: type as string,
          tags: tags ? (tags as string).split(',') : undefined,
          userId: userId as string,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        });

        res.json(results);
      } catch (error) {
        logger.error('Media search error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ error: 'Search failed' });
      }
    });

    // API documentation
    this.app.use('/api-docs', (req, res) => {
      res.json({
        message: 'Media Service API Documentation',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          media: '/api/v1/media',
          upload: '/api/v1/upload',
          files: '/files/:fileId',
          thumbnails: '/thumbnails/:fileId',
          batch: '/api/v1/media/batch',
          search: '/api/v1/media/search'
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
        logger.info(`Media Service listening on port ${config.port}`, {
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
      logger.info('Shutting down Media Service...');

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Close database connections
      await this.databaseService.disconnect();

      // Close Redis connections
      await this.redisService.disconnect();

      // Close storage connections
      await this.storageService.disconnect();

      logger.info('Media Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and start the service
const mediaService = new MediaService();

// Handle graceful shutdown
const shutdownHandler = gracefulShutdown(mediaService.server);
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
mediaService.initialize().catch((error) => {
  logger.error('Failed to start Media Service', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default mediaService; 