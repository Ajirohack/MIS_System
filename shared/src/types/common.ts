// Common types used across the platform

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeout?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
}

export interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  filename?: string;
  maxSize?: string;
  maxFiles?: number;
}

export interface AppConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  baseUrl: string;
  apiPrefix: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  email: EmailConfig;
  jwt: JWTConfig;
  rateLimit: RateLimitConfig;
  cors: CorsConfig;
  log: LogConfig;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type NonNullableFields<T, K extends keyof T> = T & {
  [P in K]: NonNullable<T[P]>;
};

// HTTP types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface HttpHeaders {
  [key: string]: string | string[] | undefined;
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers: HttpHeaders;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

export interface HttpResponse {
  statusCode: number;
  headers: HttpHeaders;
  body: unknown;
}

// Event types
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  version: string;
}

export interface DomainEvent extends BaseEvent {
  aggregateId: string;
  aggregateType: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IntegrationEvent extends BaseEvent {
  correlationId: string;
  causationId?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  tags?: string[];
}

// Queue types
export interface QueueMessage<T = unknown> {
  id: string;
  type: string;
  data: T;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
}

// File types
export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash?: string;
  uploadedBy: string;
  uploadedAt: Date;
  tags?: string[];
}

export interface FileUploadResult {
  id: string;
  url: string;
  metadata: FileMetadata;
}

// Search types
export interface SearchQuery {
  q: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, 'asc' | 'desc'>;
  page?: number;
  limit?: number;
}

export interface SearchResult<T = unknown> {
  hits: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: Record<string, unknown>;
}

// Notification types
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface NotificationData {
  templateId: string;
  recipient: string;
  variables: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  timestamp: Date;
} 