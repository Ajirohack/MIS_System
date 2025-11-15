import { z } from 'zod';
import { UserRole } from './user';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

export interface Invitation {
  id: string;
  code: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  createdBy: string;
  acceptedBy?: string;
  acceptedAt?: Date;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationCreate {
  email: string;
  role: UserRole;
  createdBy: string;
  expiresAt?: Date;
  maxUses?: number;
  metadata?: Record<string, unknown>;
}

export interface InvitationRedeem {
  code: string;
  email: string;
  userId: string;
}

export interface InvitationUpdate {
  status?: InvitationStatus;
  expiresAt?: Date;
  maxUses?: number;
  metadata?: Record<string, unknown>;
}

// Zod schemas for validation
export const invitationCreateSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.nativeEnum(UserRole),
  createdBy: z.string().uuid('Invalid user ID'),
  expiresAt: z.date().optional(),
  maxUses: z.number().int().positive().max(100).default(1),
  metadata: z.record(z.unknown()).optional()
});

export const invitationRedeemSchema = z.object({
  code: z.string().length(22, 'Invitation code must be 22 characters'),
  email: z.string().email('Invalid email format'),
  userId: z.string().uuid('Invalid user ID')
});

export const invitationUpdateSchema = z.object({
  status: z.nativeEnum(InvitationStatus).optional(),
  expiresAt: z.date().optional(),
  maxUses: z.number().int().positive().max(100).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Type exports
export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>;
export type InvitationRedeemInput = z.infer<typeof invitationRedeemSchema>;
export type InvitationUpdateInput = z.infer<typeof invitationUpdateSchema>;

// Utility functions
export class InvitationUtils {
  /**
   * Check if invitation is expired
   */
  static isExpired(invitation: Pick<Invitation, 'expiresAt'>): boolean {
    return invitation.expiresAt < new Date();
  }

  /**
   * Check if invitation can be used
   */
  static canBeUsed(invitation: Pick<Invitation, 'status' | 'currentUses' | 'maxUses' | 'expiresAt'>): boolean {
    return (
      invitation.status === InvitationStatus.PENDING &&
      invitation.currentUses < invitation.maxUses &&
      !this.isExpired(invitation)
    );
  }

  /**
   * Check if invitation is fully used
   */
  static isFullyUsed(invitation: Pick<Invitation, 'currentUses' | 'maxUses'>): boolean {
    return invitation.currentUses >= invitation.maxUses;
  }

  /**
   * Get invitation status based on current state
   */
  static getStatus(invitation: Pick<Invitation, 'status' | 'currentUses' | 'maxUses' | 'expiresAt'>): InvitationStatus {
    if (invitation.status === InvitationStatus.REVOKED) {
      return InvitationStatus.REVOKED;
    }
    
    if (this.isExpired(invitation)) {
      return InvitationStatus.EXPIRED;
    }
    
    if (this.isFullyUsed(invitation)) {
      return InvitationStatus.EXPIRED;
    }
    
    return invitation.status;
  }

  /**
   * Create a safe invitation response (without sensitive data)
   */
  static toResponse(invitation: Invitation): Omit<Invitation, 'code'> {
    const { code, ...safeInvitation } = invitation;
    return safeInvitation;
  }
} 