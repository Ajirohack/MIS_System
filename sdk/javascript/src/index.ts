import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';

// Types
export interface SDKConfig {
  apiKey?: string;
  apiSecret?: string;
  baseURL?: string;
  timeout?: number;
  version?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  membershipLevel: string;
  avatar?: string;
  bio?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  createdAt: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface OAuthProvider {
  name: string;
  displayName: string;
  isEnabled: boolean;
  scopes: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MembershipSDK {
  private config: SDKConfig;
  private client: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;

  constructor(config: SDKConfig = {}) {
    this.config = {
      baseURL: 'https://api.membership-platform.com',
      timeout: 30000,
      version: 'v1',
      ...config,
    };

    this.client = axios.create({
      baseURL: `${this.config.baseURL}/api/${this.config.version}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MembershipPlatform-SDK/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }

        // Add signature for API secret
        if (this.config.apiSecret) {
          const timestamp = Date.now().toString();
          const signature = this.generateSignature(config, timestamp);
          config.headers['X-Timestamp'] = timestamp;
          config.headers['X-Signature'] = signature;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && this.refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = await this.refreshAccessToken();
            this.accessToken = tokens.accessToken;
            this.refreshToken = tokens.refreshToken;
            
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Clear tokens on refresh failure
            this.accessToken = undefined;
            this.refreshToken = undefined;
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private generateSignature(config: AxiosRequestConfig, timestamp: string): string {
    const method = config.method?.toUpperCase() || 'GET';
    const path = config.url || '';
    const body = config.data ? JSON.stringify(config.data) : '';
    
    const message = `${method}${path}${body}${timestamp}`;
    return CryptoJS.HmacSHA256(message, this.config.apiSecret!).toString();
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await this.client.post<APIResponse<AuthTokens>>('/auth/login', {
      email,
      password,
    });

    const tokens = response.data.data!;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    return tokens;
  }

  async loginWithOAuth(provider: string, code: string, state?: string): Promise<AuthTokens> {
    const response = await this.client.post<APIResponse<AuthTokens>>('/auth/oauth/callback', {
      provider,
      code,
      state,
    });

    const tokens = response.data.data!;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    return tokens;
  }

  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post<APIResponse<AuthTokens>>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });

    const tokens = response.data.data!;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    return tokens;
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.client.post('/auth/logout', {
          refreshToken: this.refreshToken,
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    this.accessToken = undefined;
    this.refreshToken = undefined;
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  // User management
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<APIResponse<User>>('/users/me');
    return response.data.data!;
  }

  async getUser(userId: string): Promise<User> {
    const response = await this.client.get<APIResponse<User>>(`/users/${userId}`);
    return response.data.data!;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await this.client.put<APIResponse<User>>(`/users/${userId}`, data);
    return response.data.data!;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.delete(`/users/${userId}`);
  }

  // Invitation management
  async createInvitation(data: {
    email: string;
    role?: string;
    maxUses?: number;
    expiresAt?: string;
  }): Promise<Invitation> {
    const response = await this.client.post<APIResponse<Invitation>>('/invitations', data);
    return response.data.data!;
  }

  async getInvitation(code: string): Promise<Invitation> {
    const response = await this.client.get<APIResponse<Invitation>>(`/invitations/${code}`);
    return response.data.data!;
  }

  async listInvitations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    email?: string;
  }): Promise<APIResponse<Invitation[]>> {
    const response = await this.client.get<APIResponse<Invitation[]>>('/invitations', { params });
    return response.data;
  }

  async revokeInvitation(code: string): Promise<void> {
    await this.client.delete(`/invitations/${code}`);
  }

  // Webhook management
  async createWebhook(data: {
    name: string;
    url: string;
    events: string[];
  }): Promise<Webhook> {
    const response = await this.client.post<APIResponse<Webhook>>('/webhooks', data);
    return response.data.data!;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    const response = await this.client.get<APIResponse<Webhook>>(`/webhooks/${webhookId}`);
    return response.data.data!;
  }

  async listWebhooks(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<APIResponse<Webhook[]>> {
    const response = await this.client.get<APIResponse<Webhook[]>>('/webhooks', { params });
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Partial<Webhook>): Promise<Webhook> {
    const response = await this.client.put<APIResponse<Webhook>>(`/webhooks/${webhookId}`, data);
    return response.data.data!;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  // OAuth providers
  async getOAuthProviders(): Promise<OAuthProvider[]> {
    const response = await this.client.get<APIResponse<OAuthProvider[]>>('/oauth/providers');
    return response.data.data!;
  }

  async getOAuthUrl(provider: string, redirectUri?: string, state?: string): Promise<string> {
    const params = new URLSearchParams({
      provider,
      ...(redirectUri && { redirect_uri: redirectUri }),
      ...(state && { state }),
    });

    const response = await this.client.get<APIResponse<{ url: string }>>(`/oauth/authorize?${params}`);
    return response.data.data!.url;
  }

  // Utility methods
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<APIResponse<{ status: string; timestamp: string }>>('/health');
    return response.data.data!;
  }

  // Webhook signature verification
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = CryptoJS.HmacSHA256(payload, secret).toString();
    return CryptoJS.timingSafeEqual(
      CryptoJS.enc.Hex.parse(signature),
      CryptoJS.enc.Hex.parse(expectedSignature)
    );
  }

  // Rate limiting helpers
  async getRateLimitInfo(): Promise<{
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const response = await this.client.get('/rate-limit');
    return {
      limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
      reset: parseInt(response.headers['x-ratelimit-reset'] || '0'),
    };
  }

  // Error handling
  isAPIError(error: any): error is { response: AxiosResponse } {
    return error.response && error.response.data;
  }

  getAPIError(error: any): { message: string; code?: string; details?: any } {
    if (this.isAPIError(error)) {
      return {
        message: error.response.data.error || error.response.data.message || 'API Error',
        code: error.response.data.code,
        details: error.response.data.details,
      };
    }
    return {
      message: error.message || 'Unknown error',
    };
  }
}

// Export types
export type {
  SDKConfig,
  User,
  Invitation,
  Webhook,
  OAuthProvider,
  AuthTokens,
  APIResponse,
};

// Export default instance
export default MembershipSDK; 