import { Request, Response, NextFunction } from 'express';
import { RequestContext } from './common';

// Express request/response extensions
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  context?: RequestContext;
}

export interface AuthenticatedResponse extends Response {
  // Add any custom response properties here
}

// API route types
export interface RouteHandler {
  (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction): Promise<void> | void;
}

export interface RouteMiddleware {
  (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction): Promise<void> | void;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: string;
  handler: RouteHandler;
  middleware?: RouteMiddleware[];
  auth?: boolean;
  permissions?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  validation?: {
    body?: any;
    query?: any;
    params?: any;
  };
  documentation?: {
    summary: string;
    description?: string;
    tags?: string[];
    requestBody?: {
      required: boolean;
      content: Record<string, any>;
    };
    responses?: Record<string, {
      description: string;
      content?: Record<string, any>;
    }>;
  };
}

// API documentation types
export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  security?: ApiSecurity[];
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: any;
  example?: unknown;
}

export interface ApiRequestBody {
  required: boolean;
  description?: string;
  content: Record<string, ApiContent>;
}

export interface ApiContent {
  schema: any;
  example?: unknown;
  examples?: Record<string, any>;
}

export interface ApiResponse {
  description: string;
  content?: Record<string, ApiContent>;
  headers?: Record<string, any>;
}

export interface ApiSecurity {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  flows?: Record<string, any>;
  openIdConnectUrl?: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, ApiEndpoint>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, ApiSecurity>;
  };
  security?: ApiSecurity[];
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

// API error types
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  code?: string;
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: 'Validation failed';
    details: {
      errors: ValidationError[];
    };
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}

// API success response types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginatedApiResponse<T> extends ApiSuccessResponse<PaginatedData<T>> {
  data: PaginatedData<T>;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API middleware types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitResponse {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  message: string;
}

// API monitoring types
export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
}

export interface ApiHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, {
    status: 'healthy' | 'unhealthy';
    message?: string;
    responseTime?: number;
  }>;
}

// API versioning types
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: Date;
  migrationGuide?: string;
}

export interface VersionedEndpoint {
  versions: ApiVersion[];
  current: string;
  deprecated: string[];
}

// API caching types
export interface CacheControl {
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  private?: boolean;
  public?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export interface CacheHeaders {
  'Cache-Control'?: string;
  'ETag'?: string;
  'Last-Modified'?: string;
  'Expires'?: string;
}

// API pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

// API filtering types
export interface FilterOperator {
  eq?: unknown;
  ne?: unknown;
  gt?: unknown;
  gte?: unknown;
  lt?: unknown;
  lte?: unknown;
  in?: unknown[];
  nin?: unknown[];
  like?: string;
  ilike?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  between?: [unknown, unknown];
  isNull?: boolean;
}

export interface FilterQuery {
  [field: string]: FilterOperator | FilterQuery | unknown;
}

// API sorting types
export interface SortQuery {
  [field: string]: 'asc' | 'desc';
}

// API search types
export interface SearchQuery {
  q: string;
  fields?: string[];
  operator?: 'and' | 'or';
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

// API response transformation types
export interface ResponseTransformer<T = unknown, R = unknown> {
  transform(data: T): R;
  transformArray(data: T[]): R[];
}

export interface ResponseSerializer<T = unknown> {
  serialize(data: T): string;
  deserialize(data: string): T;
}

// API testing types
export interface ApiTest {
  name: string;
  description?: string;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  };
  expectedResponse: {
    statusCode: number;
    body?: unknown;
    headers?: Record<string, string>;
  };
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface ApiTestSuite {
  name: string;
  description?: string;
  tests: ApiTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
} 