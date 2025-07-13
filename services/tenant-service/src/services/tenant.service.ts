import { Pool, PoolClient } from 'pg';
import { Redis } from 'redis';
import { logger } from '@shared/utils/logger';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  status: 'active' | 'suspended' | 'pending' | 'inactive';
  plan: 'basic' | 'premium' | 'enterprise' | 'custom';
  maxUsers: number;
  maxStorageGb: number;
  features: Record<string, any>;
  settings: Record<string, any>;
  billingInfo: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUsage {
  userIds: number;
  storageUsedGb: number;
  apiRequests: number;
  lastActivity: Date;
  limits: {
    maxUsers: number;
    maxStorageGb: number;
    maxApiRequests: number;
  };
}

export interface TenantHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    redis: boolean;
    storage: boolean;
    api: boolean;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  lastChecked: Date;
}

export class TenantService {
  private db: Pool;
  private redis: Redis;
  private cachePrefix = 'tenant:';

  constructor(
    private databaseService: DatabaseService,
    private redisService: RedisService
  ) {
    this.db = databaseService.getPool();
    this.redis = redisService.getClient();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Tenant Service...');
      
      // Verify database connection
      await this.db.query('SELECT 1');
      
      // Verify Redis connection
      await this.redis.ping();
      
      logger.info('Tenant Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tenant Service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createTenant(data: {
    name: string;
    slug: string;
    domain?: string;
    subdomain?: string;
    plan?: string;
    maxUsers?: number;
    maxStorage?: number;
    features?: Record<string, any>;
    settings?: Record<string, any>;
  }): Promise<Tenant> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if slug already exists
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE slug = $1 OR domain = $2 OR subdomain = $3',
        [data.slug, data.domain, data.subdomain]
      );

      if (existingTenant.rows.length > 0) {
        throw new Error('Tenant with this identifier already exists');
      }

      // Create tenant
      const result = await client.query(
        `INSERT INTO tenants (
          name, slug, domain, subdomain, plan, max_users, max_storage_gb, 
          features, settings, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.name,
          data.slug,
          data.domain,
          data.subdomain,
          data.plan || 'basic',
          data.maxUsers || 100,
          data.maxStorage || 10,
          JSON.stringify(data.features || {}),
          JSON.stringify(data.settings || {}),
          null // created_by will be set when user system is integrated
        ]
      );

      const tenant = result.rows[0];

      // Set default configurations
      await this.setDefaultConfigurations(tenant.id, data.plan || 'basic');

      await client.query('COMMIT');

      // Cache tenant data
      await this.cacheTenant(tenant);

      logger.info('Tenant created successfully', {
        tenantId: tenant.id,
        slug: tenant.slug,
        plan: tenant.plan
      });

      return this.mapTenantFromDB(tenant);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating tenant', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      // Try cache first
      const cached = await this.getCachedTenant(tenantId);
      if (cached) {
        return cached;
      }

      // Get from database
      const result = await this.db.query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = this.mapTenantFromDB(result.rows[0]);
      
      // Cache the result
      await this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      logger.error('Error getting tenant', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId
      });
      throw error;
    }
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM tenants WHERE slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapTenantFromDB(result.rows[0]);
    } catch (error) {
      logger.error('Error getting tenant by slug', {
        error: error instanceof Error ? error.message : 'Unknown error',
        slug
      });
      throw error;
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const allowedFields = [
        'name', 'domain', 'subdomain', 'status', 'plan', 'max_users', 
        'max_storage_gb', 'features', 'settings', 'billing_info'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${this.camelToSnake(key)} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateValues.push(tenantId);
      updateFields.push('updated_at = NOW()');

      const result = await client.query(
        `UPDATE tenants SET ${updateFields.join(', ')} 
         WHERE id = $${paramCount} RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      await client.query('COMMIT');

      const tenant = this.mapTenantFromDB(result.rows[0]);

      // Update cache
      await this.cacheTenant(tenant);

      logger.info('Tenant updated successfully', {
        tenantId,
        updatedFields: Object.keys(updates)
      });

      return tenant;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating tenant', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        updates
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if tenant has active users
      const userCount = await client.query(
        'SELECT COUNT(*) FROM users WHERE tenant_id = $1',
        [tenantId]
      );

      if (parseInt(userCount.rows[0].count) > 0) {
        throw new Error('Cannot delete tenant with active users');
      }

      // Delete tenant (cascade will handle related data)
      const result = await client.query(
        'DELETE FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (result.rowCount === 0) {
        throw new Error('Tenant not found');
      }

      await client.query('COMMIT');

      // Remove from cache
      await this.redis.del(`${this.cachePrefix}${tenantId}`);

      logger.info('Tenant deleted successfully', { tenantId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting tenant', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenantUsage(tenantId: string, timeRange: string = '30d'): Promise<TenantUsage> {
    try {
      // Get user count
      const userCount = await this.db.query(
        'SELECT COUNT(*) FROM users WHERE tenant_id = $1',
        [tenantId]
      );

      // Get storage usage
      const storageUsage = await this.db.query(
        'SELECT COALESCE(SUM(size), 0) FROM media_files WHERE tenant_id = $1',
        [tenantId]
      );

      // Get API request count (from analytics_data)
      const apiRequests = await this.db.query(
        `SELECT COALESCE(SUM(CAST(metric_value AS INTEGER)), 0) 
         FROM analytics_data 
         WHERE tenant_id = $1 AND metric_name = 'api_requests' 
         AND timestamp >= NOW() - INTERVAL '${timeRange}'`,
        [tenantId]
      );

      // Get last activity
      const lastActivity = await this.db.query(
        'SELECT MAX(last_active_at) FROM users WHERE tenant_id = $1',
        [tenantId]
      );

      // Get tenant limits
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        userIds: parseInt(userCount.rows[0].count),
        storageUsedGb: Math.round((parseInt(storageUsage.rows[0].coalesce) / (1024 * 1024 * 1024)) * 100) / 100,
        apiRequests: parseInt(apiRequests.rows[0].coalesce),
        lastActivity: lastActivity.rows[0].max || new Date(),
        limits: {
          maxUsers: tenant.maxUsers,
          maxStorageGb: tenant.maxStorageGb,
          maxApiRequests: this.getMaxApiRequests(tenant.plan)
        }
      };
    } catch (error) {
      logger.error('Error getting tenant usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        timeRange
      });
      throw error;
    }
  }

  async getTenantHealth(tenantId: string): Promise<TenantHealth> {
    try {
      const checks = {
        database: await this.checkDatabaseHealth(tenantId),
        redis: await this.checkRedisHealth(tenantId),
        storage: await this.checkStorageHealth(tenantId),
        api: await this.checkApiHealth(tenantId)
      };

      const metrics = await this.getHealthMetrics(tenantId);
      
      const status = this.determineHealthStatus(checks, metrics);

      return {
        status,
        checks,
        metrics,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error getting tenant health', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId
      });
      throw error;
    }
  }

  async exportTenantData(
    tenantId: string, 
    dataTypes: string[], 
    format: string = 'json'
  ): Promise<{
    data: any;
    contentType: string;
    filename: string;
  }> {
    try {
      const exportData: Record<string, any> = {};

      for (const dataType of dataTypes) {
        switch (dataType) {
          case 'users':
            exportData.users = await this.exportUsers(tenantId);
            break;
          case 'media':
            exportData.media = await this.exportMedia(tenantId);
            break;
          case 'audit_logs':
            exportData.auditLogs = await this.exportAuditLogs(tenantId);
            break;
          case 'configurations':
            exportData.configurations = await this.exportConfigurations(tenantId);
            break;
          default:
            logger.warn('Unknown data type for export', { dataType, tenantId });
        }
      }

      const filename = `tenant_${tenantId}_export_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'json') {
        return {
          data: JSON.stringify(exportData, null, 2),
          contentType: 'application/json',
          filename
        };
      } else if (format === 'csv') {
        // Implementation for CSV export
        return {
          data: this.convertToCSV(exportData),
          contentType: 'text/csv',
          filename
        };
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      logger.error('Error exporting tenant data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        dataTypes,
        format
      });
      throw error;
    }
  }

  async migrateTenant(
    tenantId: string, 
    targetPlan: string, 
    options?: Record<string, any>
  ): Promise<{
    id: string;
    status: string;
    estimatedTime: number;
  }> {
    try {
      // Validate target plan
      const validPlans = ['basic', 'premium', 'enterprise', 'custom'];
      if (!validPlans.includes(targetPlan)) {
        throw new Error(`Invalid plan: ${targetPlan}`);
      }

      // Get current tenant
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Check if migration is needed
      if (tenant.plan === targetPlan) {
        throw new Error(`Tenant is already on ${targetPlan} plan`);
      }

      // Create migration record
      const migrationId = `migration_${tenantId}_${Date.now()}`;
      
      // Update tenant plan
      await this.updateTenant(tenantId, {
        plan: targetPlan as any,
        features: this.getPlanFeatures(targetPlan),
        maxUsers: this.getPlanUserLimit(targetPlan),
        maxStorageGb: this.getPlanStorageLimit(targetPlan)
      });

      logger.info('Tenant migration completed', {
        tenantId,
        fromPlan: tenant.plan,
        toPlan: targetPlan
      });

      return {
        id: migrationId,
        status: 'completed',
        estimatedTime: 0
      };
    } catch (error) {
      logger.error('Error migrating tenant', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        targetPlan
      });
      throw error;
    }
  }

  async runHealthChecks(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants();
      
      for (const tenant of tenants) {
        try {
          const health = await this.getTenantHealth(tenant.id);
          
          if (health.status === 'critical') {
            logger.error('Critical tenant health issue', {
              tenantId: tenant.id,
              tenantSlug: tenant.slug,
              health
            });
          } else if (health.status === 'warning') {
            logger.warn('Tenant health warning', {
              tenantId: tenant.id,
              tenantSlug: tenant.slug,
              health
            });
          }
        } catch (error) {
          logger.error('Error checking tenant health', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenant.id
          });
        }
      }
    } catch (error) {
      logger.error('Error running health checks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async monitorUsage(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants();
      
      for (const tenant of tenants) {
        try {
          const usage = await this.getTenantUsage(tenant.id);
          
          // Check for usage violations
          if (usage.userIds > usage.limits.maxUsers) {
            logger.warn('Tenant exceeded user limit', {
              tenantId: tenant.id,
              current: usage.userIds,
              limit: usage.limits.maxUsers
            });
          }
          
          if (usage.storageUsedGb > usage.limits.maxStorageGb) {
            logger.warn('Tenant exceeded storage limit', {
              tenantId: tenant.id,
              current: usage.storageUsedGb,
              limit: usage.limits.maxStorageGb
            });
          }
        } catch (error) {
          logger.error('Error monitoring tenant usage', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenant.id
          });
        }
      }
    } catch (error) {
      logger.error('Error monitoring usage', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private async setDefaultConfigurations(tenantId: string, plan: string): Promise<void> {
    const defaultConfigs = this.getDefaultConfigurations(plan);
    
    for (const [key, value] of Object.entries(defaultConfigs)) {
      await this.db.query(
        'INSERT INTO tenant_configurations (tenant_id, config_key, config_value) VALUES ($1, $2, $3)',
        [tenantId, key, JSON.stringify(value)]
      );
    }
  }

  private async cacheTenant(tenant: Tenant): Promise<void> {
    const key = `${this.cachePrefix}${tenant.id}`;
    await this.redis.setex(key, 3600, JSON.stringify(tenant)); // Cache for 1 hour
  }

  private async getCachedTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const key = `${this.cachePrefix}${tenantId}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Error getting cached tenant', { tenantId, error });
      return null;
    }
  }

  private mapTenantFromDB(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      domain: row.domain,
      subdomain: row.subdomain,
      status: row.status,
      plan: row.plan,
      maxUsers: row.max_users,
      maxStorageGb: row.max_storage_gb,
      features: row.features || {},
      settings: row.settings || {},
      billingInfo: row.billing_info || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private getMaxApiRequests(plan: string): number {
    const limits = {
      basic: 1000,
      premium: 10000,
      enterprise: 100000,
      custom: 1000000
    };
    return limits[plan as keyof typeof limits] || 1000;
  }

  private getPlanFeatures(plan: string): Record<string, any> {
    const features = {
      basic: {
        biometric_auth: false,
        ai_verification: false,
        advanced_analytics: false
      },
      premium: {
        biometric_auth: true,
        ai_verification: false,
        advanced_analytics: false
      },
      enterprise: {
        biometric_auth: true,
        ai_verification: true,
        advanced_analytics: true
      },
      custom: {
        biometric_auth: true,
        ai_verification: true,
        advanced_analytics: true
      }
    };
    return features[plan as keyof typeof features] || features.basic;
  }

  private getPlanUserLimit(plan: string): number {
    const limits = {
      basic: 100,
      premium: 1000,
      enterprise: 10000,
      custom: 100000
    };
    return limits[plan as keyof typeof limits] || 100;
  }

  private getPlanStorageLimit(plan: string): number {
    const limits = {
      basic: 10,
      premium: 100,
      enterprise: 1000,
      custom: 10000
    };
    return limits[plan as keyof typeof limits] || 10;
  }

  private getDefaultConfigurations(plan: string): Record<string, any> {
    return {
      'security.password_policy': {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      'session.timeout': 3600,
      'file_upload.max_size': this.getPlanStorageLimit(plan) * 1024 * 1024 * 1024,
      'api.rate_limit': this.getMaxApiRequests(plan)
    };
  }

  private async getAllActiveTenants(): Promise<Tenant[]> {
    const result = await this.db.query(
      'SELECT * FROM tenants WHERE status = $1',
      ['active']
    );
    return result.rows.map(row => this.mapTenantFromDB(row));
  }

  // Health check methods
  private async checkDatabaseHealth(tenantId: string): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisHealth(tenantId: string): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkStorageHealth(tenantId: string): Promise<boolean> {
    try {
      const usage = await this.getTenantUsage(tenantId);
      return usage.storageUsedGb < usage.limits.maxStorageGb;
    } catch {
      return false;
    }
  }

  private async checkApiHealth(tenantId: string): Promise<boolean> {
    try {
      const usage = await this.getTenantUsage(tenantId);
      return usage.apiRequests < usage.limits.maxApiRequests;
    } catch {
      return false;
    }
  }

  private async getHealthMetrics(tenantId: string): Promise<{
    responseTime: number;
    errorRate: number;
    uptime: number;
  }> {
    // Implementation would get from monitoring system
    return {
      responseTime: 200,
      errorRate: 0.01,
      uptime: 99.9
    };
  }

  private determineHealthStatus(
    checks: Record<string, boolean>,
    metrics: { responseTime: number; errorRate: number; uptime: number }
  ): 'healthy' | 'warning' | 'critical' {
    const allChecksPass = Object.values(checks).every(check => check);
    const metricsHealthy = metrics.errorRate < 0.05 && metrics.uptime > 99.5;

    if (!allChecksPass) return 'critical';
    if (!metricsHealthy) return 'warning';
    return 'healthy';
  }

  // Export methods
  private async exportUsers(tenantId: string): Promise<any[]> {
    const result = await this.db.query(
      'SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows;
  }

  private async exportMedia(tenantId: string): Promise<any[]> {
    const result = await this.db.query(
      'SELECT id, filename, original_name, mime_type, size, created_at FROM media_files WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows;
  }

  private async exportAuditLogs(tenantId: string): Promise<any[]> {
    const result = await this.db.query(
      'SELECT event_type, severity, action, description, timestamp FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 1000',
      [tenantId]
    );
    return result.rows;
  }

  private async exportConfigurations(tenantId: string): Promise<any[]> {
    const result = await this.db.query(
      'SELECT config_key, config_value FROM tenant_configurations WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows;
  }

  private convertToCSV(data: Record<string, any>): string {
    // Simple CSV conversion implementation
    const lines: string[] = [];
    
    for (const [dataType, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        lines.push(`\n${dataType.toUpperCase()}`);
        const headers = Object.keys(records[0]);
        lines.push(headers.join(','));
        
        for (const record of records) {
          const values = headers.map(header => 
            JSON.stringify(record[header] || '')
          );
          lines.push(values.join(','));
        }
      }
    }
    
    return lines.join('\n');
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Tenant Service...');
      // Cleanup operations if needed
      logger.info('Tenant Service shutdown complete');
    } catch (error) {
      logger.error('Error during Tenant Service shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 