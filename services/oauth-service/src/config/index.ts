import dotenv from 'dotenv';

dotenv.config();

export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.OAUTH_SERVICE_PORT || '3002', 10),
  baseUrl: process.env.OAUTH_SERVICE_BASE_URL || 'http://localhost:3002',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434', 10),
    database: process.env.DB_NAME || 'misdb',
    username: process.env.DB_USER || 'misuser',
    password: process.env.DB_PASSWORD || 'mispassword',
    ssl: process.env.NODE_ENV === 'production',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6381', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'oauth:',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    name: 'oauth.sid',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'membership-platform',
    audience: process.env.JWT_AUDIENCE || 'membership-platform-users',
  },

  // OAuth providers configuration
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['profile', 'email'],
      isEnabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      userInfoURL: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
      isEnabled: process.env.GITHUB_OAUTH_ENABLED === 'true',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/me',
      scopes: ['r_liteprofile', 'r_emailaddress'],
      isEnabled: process.env.LINKEDIN_OAUTH_ENABLED === 'true',
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      authorizationURL: 'https://twitter.com/i/oauth2/authorize',
      tokenURL: 'https://api.twitter.com/2/oauth2/token',
      userInfoURL: 'https://api.twitter.com/2/users/me',
      scopes: ['tweet.read', 'users.read'],
      isEnabled: process.env.TWITTER_OAUTH_ENABLED === 'true',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      authorizationURL: 'https://www.facebook.com/v12.0/dialog/oauth',
      tokenURL: 'https://graph.facebook.com/v12.0/oauth/access_token',
      userInfoURL: 'https://graph.facebook.com/me',
      scopes: ['email', 'public_profile'],
      isEnabled: process.env.FACEBOOK_OAUTH_ENABLED === 'true',
    },
  },

  // Webhook configuration
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'your-webhook-secret',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000', 10),
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/oauth-service.log',
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes
  },

  // Feature flags
  features: {
    enableOAuth: process.env.ENABLE_OAUTH !== 'false',
    enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    enableAuditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableCORS: process.env.ENABLE_CORS !== 'false',
  },
};

// Validate required configuration
export function validateConfig(): void {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate OAuth providers
  Object.entries(config.providers).forEach(([provider, settings]) => {
    if (settings.isEnabled) {
      if (!settings.clientId || !settings.clientSecret) {
        throw new Error(`Missing OAuth credentials for ${provider}`);
      }
    }
  });
}

// Export types for configuration
export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authorizationURL: string;
  tokenURL: string;
  userInfoURL: string;
  scopes: string[];
  isEnabled: boolean;
}

export interface Config {
  environment: string;
  port: number;
  baseUrl: string;
  frontendUrl: string;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  session: {
    secret: string;
    maxAge: number;
    name: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    message: string;
    statusCode: number;
  };
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  providers: {
    [key: string]: OAuthProvider;
  };
  webhook: {
    secret: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  logging: {
    level: string;
    format: string;
    enableConsole: boolean;
    enableFile: boolean;
    filePath: string;
  };
  security: {
    bcryptRounds: number;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  features: {
    enableOAuth: boolean;
    enableWebhooks: boolean;
    enableAuditLogs: boolean;
    enableRateLimiting: boolean;
    enableCORS: boolean;
  };
} 