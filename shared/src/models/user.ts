import { z } from 'zod';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  INACTIVE = 'inactive'
}

export enum MembershipLevel {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  membershipLevel: MembershipLevel;
  avatar?: string;
  bio?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  membershipLevel: MembershipLevel;
  avatar?: string;
  bio?: string;
  emailVerified: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  invitationCode: string;
}

export interface UserUpdate {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserPasswordReset {
  email: string;
}

export interface UserPasswordChange {
  currentPassword: string;
  newPassword: string;
}

// Zod schemas for validation
export const userCreateSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  role: z.nativeEnum(UserRole),
  invitationCode: z.string().length(22, 'Invitation code must be 22 characters')
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  bio: z.string().max(500, 'Bio too long').optional()
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const userPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Type exports
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserPasswordResetInput = z.infer<typeof userPasswordResetSchema>;
export type UserPasswordChangeInput = z.infer<typeof userPasswordChangeSchema>;

// Utility functions
export class UserUtils {
  /**
   * Get user's full name
   */
  static getFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Get user's display name (first name + last initial)
   */
  static getDisplayName(user: Pick<User, 'firstName' | 'lastName'>): string {
    return `${user.firstName} ${user.lastName.charAt(0)}.`;
  }

  /**
   * Check if user is active
   */
  static isActive(user: Pick<User, 'status'>): boolean {
    return user.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user has admin privileges
   */
  static isAdmin(user: Pick<User, 'role'>): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Check if user has moderator privileges
   */
  static isModerator(user: Pick<User, 'role'>): boolean {
    return user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN;
  }

  /**
   * Check if user is locked due to failed login attempts
   */
  static isLocked(user: Pick<User, 'lockedUntil'>): boolean {
    return user.lockedUntil ? user.lockedUntil > new Date() : false;
  }

  /**
   * Get user permissions based on role
   */
  static getPermissions(user: Pick<User, 'role'>): string[] {
    const permissions: string[] = ['read:own_profile', 'update:own_profile'];

    switch (user.role) {
      case UserRole.ADMIN:
        permissions.push(
          'read:all_users',
          'update:all_users',
          'delete:users',
          'manage:invitations',
          'manage:system_settings',
          'view:audit_logs',
          'manage:roles'
        );
        break;
      case UserRole.MODERATOR:
        permissions.push(
          'read:users',
          'update:users',
          'manage:invitations',
          'view:audit_logs'
        );
        break;
      case UserRole.MEMBER:
        permissions.push('read:members');
        break;
    }

    return permissions;
  }

  /**
   * Create a safe user profile (without sensitive data)
   */
  static toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      membershipLevel: user.membershipLevel,
      avatar: user.avatar,
      bio: user.bio,
      emailVerified: user.emailVerified,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
} 