import { UserRole } from '../models/user';

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
  lastActiveAt?: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthToken;
  sessionId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
  acceptTerms: boolean;
}

export interface RegisterResponse {
  user: AuthUser;
  tokens: AuthToken;
  requiresEmailVerification: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface EmailVerificationResend {
  email: string;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  refreshTokenId: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface SessionCreate {
  userId: string;
  refreshTokenId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface SessionUpdate {
  isActive?: boolean;
  lastUsedAt?: Date;
}

// Permission types
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleCreate {
  name: string;
  description: string;
  permissions: string[];
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  permissions?: string[];
}

// OAuth types
export interface OAuthProvider {
  id: string;
  name: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  isEnabled: boolean;
}

export interface OAuthState {
  state: string;
  provider: string;
  redirectUri: string;
  userId?: string;
  expiresAt: Date;
}

export interface OAuthCallback {
  code: string;
  state: string;
}

export interface OAuthUserInfo {
  provider: string;
  providerUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  profile?: Record<string, unknown>;
}

// Two-factor authentication types
export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorEnable {
  secret: string;
  token: string;
}

export interface TwoFactorVerify {
  token: string;
}

export interface TwoFactorDisable {
  password: string;
}

export interface TwoFactorBackupCode {
  code: string;
  isUsed: boolean;
  usedAt?: Date;
}

// Security types
export interface SecurityEvent {
  type: 'login_attempt' | 'password_change' | 'email_change' | 'suspicious_activity';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

export interface AccountLockout {
  userId: string;
  reason: 'failed_logins' | 'suspicious_activity' | 'admin_action';
  lockedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// API key types
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyCreate {
  userId: string;
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface ApiKeyUpdate {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: Date;
}

// Webhook types
export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryCount: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookCreate {
  userId: string;
  name: string;
  url: string;
  events: string[];
}

export interface WebhookUpdate {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  responseCode?: number;
  responseBody?: string;
  retryCount: number;
  nextRetryAt?: Date;
  createdAt: Date;
  sentAt?: Date;
} 