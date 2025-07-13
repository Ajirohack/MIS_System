import { z } from 'zod';
import { User, UserRole, UserStatus, MembershipLevel } from './user';

export interface MemberProfile {
  id: string;
  userId: string;
  membershipNumber: string;
  joinDate: Date;
  membershipLevel: MembershipLevel;
  status: UserStatus;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    newsletter: boolean;
    privacyLevel: 'public' | 'members' | 'private';
  };
  achievements?: string[];
  badges?: string[];
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberCreate {
  userId: string;
  membershipLevel: MembershipLevel;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    newsletter?: boolean;
    privacyLevel?: 'public' | 'members' | 'private';
  };
}

export interface MemberUpdate {
  membershipLevel?: MembershipLevel;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    newsletter?: boolean;
    privacyLevel?: 'public' | 'members' | 'private';
  };
}

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  membershipLevels: Record<MembershipLevel, number>;
  topContributors: Array<{
    userId: string;
    name: string;
    contributionScore: number;
  }>;
}

// Zod schemas for validation
export const memberCreateSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  membershipLevel: z.nativeEnum(MembershipLevel),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  socialLinks: z.object({
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional(),
    website: z.string().url('Invalid website URL').optional()
  }).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    newsletter: z.boolean().default(true),
    privacyLevel: z.enum(['public', 'members', 'private']).default('members')
  }).optional()
});

export const memberUpdateSchema = z.object({
  membershipLevel: z.nativeEnum(MembershipLevel).optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  socialLinks: z.object({
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional(),
    website: z.string().url('Invalid website URL').optional()
  }).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    privacyLevel: z.enum(['public', 'members', 'private']).optional()
  }).optional()
});

// Type exports
export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

// Utility functions
export class MemberUtils {
  /**
   * Generate a unique membership number
   */
  static generateMembershipNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `MIS-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Check if member is active
   */
  static isActive(member: Pick<MemberProfile, 'status'>): boolean {
    return member.status === UserStatus.ACTIVE;
  }

  /**
   * Check if member has premium access
   */
  static hasPremiumAccess(member: Pick<MemberProfile, 'membershipLevel'>): boolean {
    return member.membershipLevel === MembershipLevel.PREMIUM || 
           member.membershipLevel === MembershipLevel.VIP;
  }

  /**
   * Check if member has VIP access
   */
  static hasVIPAccess(member: Pick<MemberProfile, 'membershipLevel'>): boolean {
    return member.membershipLevel === MembershipLevel.VIP;
  }

  /**
   * Get member's display name
   */
  static getDisplayName(member: MemberProfile, user: Pick<User, 'firstName' | 'lastName'>): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Check if member profile is public
   */
  static isPublicProfile(member: Pick<MemberProfile, 'preferences'>): boolean {
    return member.preferences?.privacyLevel === 'public';
  }

  /**
   * Check if member profile is visible to other members
   */
  static isVisibleToMembers(member: Pick<MemberProfile, 'preferences'>): boolean {
    return member.preferences?.privacyLevel === 'public' || 
           member.preferences?.privacyLevel === 'members';
  }

  /**
   * Create a safe member profile for public viewing
   */
  static toPublicProfile(member: MemberProfile, user: Pick<User, 'firstName' | 'lastName' | 'role'>): Partial<MemberProfile> {
    const publicProfile: Partial<MemberProfile> = {
      id: member.id,
      membershipNumber: member.membershipNumber,
      joinDate: member.joinDate,
      membershipLevel: member.membershipLevel,
      bio: member.bio,
      avatar: member.avatar,
      lastActiveAt: member.lastActiveAt
    };

    // Only include social links if profile is public
    if (this.isPublicProfile(member)) {
      publicProfile.socialLinks = member.socialLinks;
    }

    return publicProfile;
  }

  /**
   * Calculate member's contribution score
   */
  static calculateContributionScore(member: MemberProfile): number {
    let score = 0;
    
    // Base score for membership duration
    const daysSinceJoin = Math.floor((Date.now() - member.joinDate.getTime()) / (1000 * 60 * 60 * 24));
    score += Math.min(daysSinceJoin * 0.1, 100); // Max 100 points for duration
    
    // Bonus for membership level
    switch (member.membershipLevel) {
      case MembershipLevel.VIP:
        score += 50;
        break;
      case MembershipLevel.PREMIUM:
        score += 25;
        break;
      case MembershipLevel.BASIC:
        score += 10;
        break;
    }
    
    // Bonus for achievements
    if (member.achievements) {
      score += member.achievements.length * 10;
    }
    
    // Bonus for badges
    if (member.badges) {
      score += member.badges.length * 5;
    }
    
    return Math.round(score);
  }
} 