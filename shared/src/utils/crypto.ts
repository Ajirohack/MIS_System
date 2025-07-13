import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class CryptoUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'membership-platform',
      audience: 'membership-users'
    });
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'membership-platform',
      audience: 'membership-users'
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_REFRESH_SECRET) as JWTPayload;
  }

  /**
   * Generate a secure random string
   */
  static generateSecureString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   */
  static generateUUID(): string {
    return uuidv4();
  }

  /**
   * Generate a secure invitation code
   */
  static generateInvitationCode(): string {
    return crypto.randomBytes(16).toString('base64url').toUpperCase();
  }

  /**
   * Hash sensitive data for storage
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
} 