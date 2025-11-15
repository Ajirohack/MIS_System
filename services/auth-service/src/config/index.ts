import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  environment: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',
  baseUrl: process.env.AUTH_SERVICE_BASE_URL || 'http://localhost:3001',
  apiPrefix: '/api/v1',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434', 10),
    database: process.env.DB_NAME || 'misdb',
    username: process.env.DB_USER || 'misuser',
    password: process.env.DB_PASSWORD || 'mispassword',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6381', 10),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'auth:'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'membership-platform',
    audience: process.env.JWT_AUDIENCE || 'membership-users'
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    username: process.env.EMAIL_USERNAME || '',
    password: process.env.EMAIL_PASSWORD || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@membership-platform.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Membership Platform'
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later',
    statusCode: parseInt(process.env.RATE_LIMIT_STATUS_CODE || '429', 10)
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID'
    ]
  },

  // Logging configuration
  log: {
    level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    format: (process.env.LOG_FORMAT || 'json') as 'json' | 'simple',
    filename: process.env.LOG_FILENAME,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10), // 24 hours
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '86400000', 10), // 24 hours
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600000', 10) // 1 hour
  },

  // External services
  services: {
    invitationService: {
      url: process.env.INVITATION_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.INVITATION_SERVICE_TIMEOUT || '5000', 10)
    },
    memberService: {
      url: process.env.MEMBER_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.MEMBER_SERVICE_TIMEOUT || '5000', 10)
    },
    auditService: {
      url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.AUDIT_SERVICE_TIMEOUT || '5000', 10)
    }
  },

  // Feature flags
  features: {
    enableOAuth: process.env.ENABLE_OAUTH === 'true',
    enableTwoFactor: process.env.ENABLE_TWO_FACTOR === 'true',
    enableApiKeys: process.env.ENABLE_API_KEYS === 'true',
    enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true'
  }
};

// Validate required configuration
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate email configuration if email verification is enabled
  if (config.security.requireEmailVerification) {
    const requiredEmailVars = ['EMAIL_USERNAME', 'EMAIL_PASSWORD'];
    const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);

    if (missingEmailVars.length > 0) {
      throw new Error(`Email verification is enabled but missing required email configuration: ${missingEmailVars.join(', ')}`);
    }
  }
};

// Export configuration types
export type Config = typeof config;
export type DatabaseConfig = typeof config.database;
export type RedisConfig = typeof config.redis;
export type JWTConfig = typeof config.jwt;
export type EmailConfig = typeof config.email;
export type RateLimitConfig = typeof config.rateLimit;
export type CorsConfig = typeof config.cors;
export type LogConfig = typeof config.log;
export type SecurityConfig = typeof config.security; 