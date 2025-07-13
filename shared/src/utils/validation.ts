import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const uuidSchema = z.string().uuid('Invalid UUID format');
export const invitationCodeSchema = z.string().length(22, 'Invitation code must be 22 characters');

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  invitationCode: invitationCodeSchema,
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional()
});

// Invitation validation schemas
export const invitationCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(['member', 'admin', 'moderator'], {
    errorMap: () => ({ message: 'Role must be member, admin, or moderator' })
  }),
  expiresAt: z.date().optional(),
  maxUses: z.number().int().positive().max(100).optional()
});

export const invitationRedeemSchema = z.object({
  invitationCode: invitationCodeSchema,
  email: emailSchema
});

// Member validation schemas
export const memberProfileSchema = z.object({
  userId: uuidSchema,
  status: z.enum(['active', 'suspended', 'pending']),
  membershipLevel: z.enum(['basic', 'premium', 'vip']),
  joinDate: z.date(),
  lastActive: z.date().optional()
});

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Validation utility functions
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return emailSchema.safeParse(email).success;
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): boolean {
    return passwordSchema.safeParse(password).success;
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    return uuidSchema.safeParse(uuid).success;
  }

  /**
   * Validate invitation code format
   */
  static isValidInvitationCode(code: string): boolean {
    return invitationCodeSchema.safeParse(code).success;
  }

  /**
   * Sanitize input string
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate and parse pagination parameters
   */
  static parsePagination(query: Record<string, unknown>) {
    return paginationSchema.parse(query);
  }

  /**
   * Create a safe validation error message
   */
  static createValidationError(field: string, message: string): string {
    return `${field}: ${message}`;
  }
}

// Type exports
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type InvitationCreate = z.infer<typeof invitationCreateSchema>;
export type InvitationRedeem = z.infer<typeof invitationRedeemSchema>;
export type MemberProfile = z.infer<typeof memberProfileSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>; 