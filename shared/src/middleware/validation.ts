import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';

export interface ValidationSchema {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Request Validation Middleware
 * Validates request body, query parameters, and URL parameters using Zod schemas
 */
export const validateRequest = (schema: ValidationSchema) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate URL parameters
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.received
        }));

        logger.warn('Request validation failed', {
          errors: validationErrors,
          path: req.path,
          method: req.method,
          userId: req.user?.id,
          ipAddress: req.ip
        });

        const validationError = new ValidationError(
          'Request validation failed',
          { errors: validationErrors },
          undefined,
          req.context?.requestId
        );

        return next(validationError);
      }

      next(error);
    }
  };
};

/**
 * Sanitize Request Middleware
 * Sanitizes and cleans request data
 */
export const sanitizeRequest = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      logger.error('Request sanitization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize string values
 */
function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit string length
}

/**
 * Validate File Upload Middleware
 * Validates file uploads and their metadata
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      
      if (!files || files.length === 0) {
        return next(new ValidationError('No files uploaded'));
      }

      // Check number of files
      if (options.maxFiles && files.length > options.maxFiles) {
        return next(new ValidationError(`Maximum ${options.maxFiles} files allowed`));
      }

      // Validate each file
      for (const file of files) {
        // Check file size
        if (options.maxSize && file.size > options.maxSize) {
          return next(new ValidationError(`File ${file.originalname} exceeds maximum size`));
        }

        // Check file type
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          return next(new ValidationError(`File type ${file.mimetype} not allowed`));
        }

        // Check for malicious file extensions
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
        
        if (extension && dangerousExtensions.includes(extension)) {
          return next(new ValidationError(`File extension .${extension} not allowed`));
        }
      }

      next();
    } catch (error) {
      logger.error('File validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

/**
 * Validate Pagination Parameters Middleware
 * Validates and normalizes pagination parameters
 */
export const validatePagination = (defaultLimit = 10, maxLimit = 100) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || defaultLimit;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      // Validate page
      if (page < 1) {
        return next(new ValidationError('Page must be greater than 0'));
      }

      // Validate limit
      if (limit < 1) {
        return next(new ValidationError('Limit must be greater than 0'));
      }

      if (limit > maxLimit) {
        return next(new ValidationError(`Limit cannot exceed ${maxLimit}`));
      }

      // Validate sort order
      if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
        return next(new ValidationError('Sort order must be "asc" or "desc"'));
      }

      // Normalize pagination parameters
      req.query.page = page.toString();
      req.query.limit = limit.toString();
      req.query.sortOrder = sortOrder;

      next();
    } catch (error) {
      logger.error('Pagination validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

/**
 * Validate Search Parameters Middleware
 * Validates search query parameters
 */
export const validateSearch = (options: {
  maxQueryLength?: number;
  allowedFields?: string[];
}) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return next();
      }

      // Check query length
      if (options.maxQueryLength && query.length > options.maxQueryLength) {
        return next(new ValidationError(`Search query too long (max ${options.maxQueryLength} characters)`));
      }

      // Sanitize search query
      req.query.q = sanitizeString(query);

      next();
    } catch (error) {
      logger.error('Search validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

/**
 * Validate Date Range Middleware
 * Validates date range parameters
 */
export const validateDateRange = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return next(new ValidationError('Invalid start date format'));
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return next(new ValidationError('Invalid end date format'));
        }
      }

      // Check if start date is before end date
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
          return next(new ValidationError('Start date must be before end date'));
        }
      }

      next();
    } catch (error) {
      logger.error('Date range validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

/**
 * Validate UUID Parameters Middleware
 * Validates UUID format in URL parameters
 */
export const validateUUID = (paramNames: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      for (const paramName of paramNames) {
        const value = req.params[paramName];
        
        if (value && !uuidRegex.test(value)) {
          return next(new ValidationError(`Invalid UUID format for parameter: ${paramName}`));
        }
      }

      next();
    } catch (error) {
      logger.error('UUID validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      next(error);
    }
  };
}; 