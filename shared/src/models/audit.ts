import { z } from 'zod';

export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  
  // Invitation events
  INVITATION_CREATED = 'invitation_created',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REVOKED = 'invitation_revoked',
  INVITATION_EXPIRED = 'invitation_expired',
  
  // Member events
  MEMBER_CREATED = 'member_created',
  MEMBER_UPDATED = 'member_updated',
  MEMBER_STATUS_CHANGED = 'member_status_changed',
  MEMBERSHIP_LEVEL_CHANGED = 'membership_level_changed',
  
  // Admin events
  USER_SUSPENDED = 'user_suspended',
  USER_REACTIVATED = 'user_reactivated',
  USER_DELETED = 'user_deleted',
  ROLE_CHANGED = 'role_changed',
  
  // System events
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  BACKUP_CREATED = 'backup_created',
  MAINTENANCE_MODE = 'maintenance_mode',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_LOGIN_ATTEMPT = 'invalid_login_attempt',
  ACCOUNT_LOCKED = 'account_locked'
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface AuditLogCreate {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

export interface AuditLogQuery {
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Zod schemas for validation
export const auditLogCreateSchema = z.object({
  eventType: z.nativeEnum(AuditEventType),
  severity: z.nativeEnum(AuditSeverity),
  userId: z.string().uuid('Invalid user ID').optional(),
  userEmail: z.string().email('Invalid email format').optional(),
  userRole: z.string().optional(),
  targetUserId: z.string().uuid('Invalid target user ID').optional(),
  targetUserEmail: z.string().email('Invalid target email format').optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().min(1, 'Action is required'),
  description: z.string().min(1, 'Description is required'),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().ip('Invalid IP address').optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional()
});

export const auditLogQuerySchema = z.object({
  eventType: z.nativeEnum(AuditEventType).optional(),
  severity: z.nativeEnum(AuditSeverity).optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  targetUserId: z.string().uuid('Invalid target user ID').optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0)
});

// Type exports
export type AuditLogCreateInput = z.infer<typeof auditLogCreateSchema>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// Utility functions
export class AuditUtils {
  /**
   * Get severity for event type
   */
  static getSeverityForEvent(eventType: AuditEventType): AuditSeverity {
    switch (eventType) {
      case AuditEventType.USER_LOGIN:
      case AuditEventType.USER_LOGOUT:
      case AuditEventType.USER_REGISTER:
      case AuditEventType.EMAIL_VERIFICATION:
      case AuditEventType.INVITATION_CREATED:
      case AuditEventType.INVITATION_ACCEPTED:
      case AuditEventType.MEMBER_CREATED:
      case AuditEventType.MEMBER_UPDATED:
      case AuditEventType.BACKUP_CREATED:
        return AuditSeverity.LOW;
      
      case AuditEventType.PASSWORD_CHANGE:
      case AuditEventType.PASSWORD_RESET:
      case AuditEventType.INVITATION_REVOKED:
      case AuditEventType.INVITATION_EXPIRED:
      case AuditEventType.MEMBER_STATUS_CHANGED:
      case AuditEventType.MEMBERSHIP_LEVEL_CHANGED:
      case AuditEventType.ROLE_CHANGED:
      case AuditEventType.SYSTEM_CONFIG_CHANGED:
      case AuditEventity.RATE_LIMIT_EXCEEDED:
        return AuditSeverity.MEDIUM;
      
      case AuditEventType.USER_SUSPENDED:
      case AuditEventType.USER_REACTIVATED:
      case AuditEventType.MAINTENANCE_MODE:
      case AuditEventType.SUSPICIOUS_ACTIVITY:
      case AuditEventType.INVALID_LOGIN_ATTEMPT:
        return AuditSeverity.HIGH;
      
      case AuditEventType.USER_DELETED:
      case AuditEventType.ACCOUNT_LOCKED:
        return AuditSeverity.CRITICAL;
      
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  /**
   * Create audit log entry for user action
   */
  static createUserAuditLog(
    eventType: AuditEventType,
    action: string,
    description: string,
    userId?: string,
    userEmail?: string,
    userRole?: string,
    metadata?: Record<string, unknown>
  ): AuditLogCreate {
    return {
      eventType,
      severity: this.getSeverityForEvent(eventType),
      userId,
      userEmail,
      userRole,
      action,
      description,
      metadata
    };
  }

  /**
   * Create audit log entry for resource action
   */
  static createResourceAuditLog(
    eventType: AuditEventType,
    action: string,
    description: string,
    resourceType: string,
    resourceId: string,
    userId?: string,
    userEmail?: string,
    userRole?: string,
    metadata?: Record<string, unknown>
  ): AuditLogCreate {
    return {
      eventType,
      severity: this.getSeverityForEvent(eventType),
      userId,
      userEmail,
      userRole,
      resourceType,
      resourceId,
      action,
      description,
      metadata
    };
  }

  /**
   * Create audit log entry for security event
   */
  static createSecurityAuditLog(
    eventType: AuditEventType,
    action: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): AuditLogCreate {
    return {
      eventType,
      severity: this.getSeverityForEvent(eventType),
      action,
      description,
      ipAddress,
      userAgent,
      metadata
    };
  }

  /**
   * Check if audit log contains sensitive information
   */
  static containsSensitiveData(auditLog: AuditLog): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const description = auditLog.description.toLowerCase();
    const metadata = JSON.stringify(auditLog.metadata || {}).toLowerCase();
    
    return sensitiveFields.some(field => 
      description.includes(field) || metadata.includes(field)
    );
  }

  /**
   * Sanitize audit log for external viewing
   */
  static sanitizeForExport(auditLog: AuditLog): Omit<AuditLog, 'metadata'> {
    const { metadata, ...sanitizedLog } = auditLog;
    
    // Remove sensitive data from description
    if (this.containsSensitiveData(auditLog)) {
      sanitizedLog.description = '[SENSITIVE DATA REMOVED]';
    }
    
    return sanitizedLog;
  }
} 