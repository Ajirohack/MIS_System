# Multi-Tenant Architecture Implementation

## Overview

The Membership Initiation System (MIS) has been enhanced with a comprehensive multi-tenant architecture that provides complete tenant isolation, flexible configuration management, and scalable resource allocation. This implementation supports multiple organizations (tenants) on a single platform while maintaining strict data separation and security.

## Architecture Components

### 1. Tenant Management Service

**Location**: `services/tenant-service/`

The tenant management service is the central component responsible for:
- Tenant lifecycle management (create, update, delete)
- Tenant configuration management
- Tenant billing and subscription management
- Tenant health monitoring
- Tenant data isolation verification

**Key Features**:
- RESTful API for tenant operations
- Real-time tenant health monitoring
- Tenant usage analytics and reporting
- Tenant data export capabilities
- Tenant migration between plans

### 2. Database Schema Changes

**Location**: `infrastructure/database/schema.sql`

The database schema has been updated to support multi-tenancy:

#### New Tables:
- `tenants` - Core tenant information
- `tenant_configurations` - Tenant-specific configurations
- All existing tables now include `tenant_id` foreign key

#### Key Changes:
- All user data is now tenant-scoped
- Unique constraints are tenant-aware (e.g., email uniqueness per tenant)
- Proper indexing for tenant-based queries
- Cascade deletion for tenant cleanup

### 3. Tenant Middleware

**Location**: `shared/middleware/tenant.ts`

The tenant middleware provides:
- **Tenant Extraction**: Identifies tenant from headers, subdomain, or custom identifiers
- **Tenant Validation**: Verifies tenant exists and is active
- **Access Control**: Checks tenant permissions and feature access
- **Data Isolation**: Enforces tenant data boundaries
- **Rate Limiting**: Tenant-specific rate limiting
- **Audit Logging**: Tenant action tracking

## Tenant Identification Methods

### 1. Custom Headers
```http
X-Tenant-ID: tenant-uuid
X-Tenant-Slug: my-organization
```

### 2. Subdomain Routing
```
https://my-organization.mis.local/api/v1/users
```

### 3. Query Parameters
```
https://api.mis.local/api/v1/users?tenant=my-organization
```

### 4. JWT Token Claims
```json
{
  "tenantId": "tenant-uuid",
  "tenantSlug": "my-organization"
}
```

## Tenant Configuration Management

### Configuration Structure

Tenant configurations are stored in the `tenant_configurations` table:

```sql
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, config_key)
);
```

### Default Configurations

Each tenant plan includes default configurations:

#### Basic Plan
```json
{
  "security.password_policy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false
  },
  "session.timeout": 3600,
  "file_upload.max_size": 10737418240,
  "api.rate_limit": 1000
}
```

#### Premium Plan
```json
{
  "security.password_policy": {
    "minLength": 10,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true
  },
  "session.timeout": 7200,
  "file_upload.max_size": 107374182400,
  "api.rate_limit": 10000,
  "features.biometric_auth": true
}
```

#### Enterprise Plan
```json
{
  "security.password_policy": {
    "minLength": 12,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true
  },
  "session.timeout": 14400,
  "file_upload.max_size": 1073741824000,
  "api.rate_limit": 100000,
  "features.biometric_auth": true,
  "features.ai_verification": true,
  "features.advanced_analytics": true
}
```

## Tenant Plans and Features

### Plan Comparison

| Feature | Basic | Premium | Enterprise | Custom |
|---------|-------|---------|------------|--------|
| Max Users | 100 | 1,000 | 10,000 | 100,000+ |
| Storage | 10 GB | 100 GB | 1 TB | 10 TB+ |
| API Requests | 1K/day | 10K/day | 100K/day | Unlimited |
| Biometric Auth | ❌ | ✅ | ✅ | ✅ |
| AI Verification | ❌ | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

## API Endpoints

### Tenant Management

#### Create Tenant
```http
POST /api/v1/tenants/create
Content-Type: application/json

{
  "name": "My Organization",
  "slug": "my-org",
  "domain": "myorg.com",
  "subdomain": "my-org",
  "plan": "premium",
  "maxUsers": 1000,
  "maxStorage": 100,
  "features": {
    "biometric_auth": true
  },
  "settings": {
    "custom_branding": true
  }
}
```

#### Get Tenant Usage
```http
GET /api/v1/tenants/{tenantId}/usage?timeRange=30d
```

#### Update Tenant Configuration
```http
POST /api/v1/tenants/{tenantId}/config
Content-Type: application/json

{
  "configKey": "security.password_policy",
  "configValue": {
    "minLength": 12,
    "requireSpecialChars": true
  },
  "isEncrypted": false
}
```

#### Export Tenant Data
```http
POST /api/v1/tenants/{tenantId}/export
Content-Type: application/json

{
  "dataTypes": ["users", "media", "audit_logs"],
  "format": "json"
}
```

#### Migrate Tenant
```http
POST /api/v1/tenants/{tenantId}/migrate
Content-Type: application/json

{
  "targetPlan": "enterprise",
  "migrationOptions": {
    "preserveData": true,
    "downtime": false
  }
}
```

### Tenant Health Monitoring

#### Get Tenant Health
```http
GET /api/v1/tenants/{tenantId}/health
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "storage": true,
    "api": true
  },
  "metrics": {
    "responseTime": 200,
    "errorRate": 0.01,
    "uptime": 99.9
  },
  "lastChecked": "2024-01-15T10:30:00Z"
}
```

## Implementation in Services

### Adding Tenant Support to Existing Services

1. **Import Tenant Middleware**:
```typescript
import { extractTenant, validateTenantAccess, enforceIsolation } from '@shared/middleware/tenant';
```

2. **Apply Middleware**:
```typescript
// Public routes (no tenant required)
app.post('/api/v1/auth/login', loginHandler);

// Tenant-aware routes
app.use('/api/v1', extractTenant, validateTenantAccess, enforceIsolation);
app.use('/api/v1/users', userRoutes);
```

3. **Update Database Queries**:
```typescript
// Before (single tenant)
const users = await db.query('SELECT * FROM users WHERE email = $1', [email]);

// After (multi-tenant)
const users = await db.query(
  'SELECT * FROM users WHERE email = $1 AND tenant_id = $2', 
  [email, req.tenant.tenantId]
);
```

### Service Integration Examples

#### Auth Service
```typescript
// Login with tenant context
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password, tenantSlug } = req.body;
  
  // Get tenant context
  const tenant = await getTenantBySlug(tenantSlug);
  req.tenant = tenant;
  
  // Process login with tenant isolation
  const result = await authProcessor.login(email, password, tenant.id);
  
  res.json({
    success: true,
    token: result.token,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name
    }
  });
});
```

#### User Service
```typescript
// Get users with tenant isolation
app.get('/api/v1/users', async (req, res) => {
  const users = await db.query(
    'SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
    [req.tenant.tenantId]
  );
  
  res.json(users.rows);
});
```

## Security Considerations

### Data Isolation
- All database queries must include `tenant_id` filter
- Redis keys are prefixed with tenant identifier
- File storage is organized by tenant
- API responses are scoped to tenant data only

### Access Control
- Tenant context is validated on every request
- Feature access is controlled by tenant plan
- Rate limiting is applied per tenant
- Audit logs track all tenant actions

### Encryption
- Sensitive tenant configurations can be encrypted
- Tenant-specific encryption keys
- Secure key rotation mechanisms

## Monitoring and Analytics

### Tenant Metrics
- User count and growth
- Storage usage
- API request volume
- Error rates and performance
- Feature usage patterns

### Health Monitoring
- Database connectivity per tenant
- Redis connectivity per tenant
- Storage capacity monitoring
- API performance tracking

### Alerting
- Tenant usage limit alerts
- Health status changes
- Security incident notifications
- Billing and subscription alerts

## Deployment

### Docker Compose
```bash
# Start tenant service
docker-compose -f docker-compose.tenant.yml up -d

# Run migrations
docker-compose -f docker-compose.tenant.yml run tenant-service-migrations

# Run tests
docker-compose -f docker-compose.tenant.yml run tenant-service-tests
```

### Kubernetes
```bash
# Deploy tenant service
kubectl apply -f k8s/tenant-service.yaml

# Check deployment status
kubectl get pods -n mis -l app=tenant-service

# View logs
kubectl logs -f deployment/tenant-service -n mis
```

## Testing

### Unit Tests
```bash
cd services/tenant-service
npm test
```

### Integration Tests
```bash
# Test tenant creation and management
npm run test:integration

# Test tenant isolation
npm run test:isolation

# Test tenant configuration
npm run test:config
```

### Load Testing
```bash
# Test tenant-specific performance
npm run test:load -- --tenants=10 --users-per-tenant=100
```

## Migration Guide

### From Single Tenant to Multi-Tenant

1. **Database Migration**:
```sql
-- Add tenant_id column to existing tables
ALTER TABLE users ADD COLUMN tenant_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- Create default tenant
INSERT INTO tenants (id, name, slug, status, plan) 
VALUES (uuid_generate_v4(), 'Default Organization', 'default', 'active', 'basic');

-- Update existing data
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
```

2. **Service Updates**:
- Add tenant middleware to all services
- Update all database queries to include tenant filtering
- Update API endpoints to handle tenant context
- Test tenant isolation thoroughly

3. **Configuration Updates**:
- Update environment variables for tenant service
- Configure tenant-specific settings
- Update monitoring and alerting

## Best Practices

### Development
1. Always include tenant context in database queries
2. Use tenant middleware for all protected routes
3. Test with multiple tenants to ensure isolation
4. Monitor tenant-specific metrics and performance

### Production
1. Implement proper tenant backup and recovery
2. Monitor tenant resource usage and limits
3. Set up tenant-specific alerting
4. Regular tenant health checks and maintenance

### Security
1. Validate tenant context on every request
2. Encrypt sensitive tenant configurations
3. Implement tenant-specific rate limiting
4. Regular security audits for tenant isolation

## Troubleshooting

### Common Issues

1. **Tenant Not Found**:
   - Check tenant slug/ID in request
   - Verify tenant exists and is active
   - Check tenant middleware configuration

2. **Data Isolation Issues**:
   - Verify all queries include tenant_id filter
   - Check Redis key prefixes
   - Validate file storage organization

3. **Performance Issues**:
   - Check tenant-specific indexes
   - Monitor tenant resource usage
   - Review tenant-specific rate limits

### Debug Commands
```bash
# Check tenant service logs
docker logs mis-tenant-service

# Check tenant database
docker exec -it mis-postgres psql -U postgres -d mis_db -c "SELECT * FROM tenants;"

# Check tenant configurations
docker exec -it mis-postgres psql -U postgres -d mis_db -c "SELECT * FROM tenant_configurations;"

# Check tenant usage
curl -H "X-Tenant-ID: tenant-uuid" http://localhost:3006/api/v1/tenants/tenant-uuid/usage
```

## Future Enhancements

1. **Advanced Tenant Features**:
   - Custom domain support
   - White-label solutions
   - Advanced analytics dashboards
   - Custom workflow engines

2. **Scalability Improvements**:
   - Database sharding by tenant
   - Microservice per tenant
   - Global load balancing
   - Multi-region deployment

3. **Management Features**:
   - Tenant admin portal
   - Bulk tenant operations
   - Advanced billing integration
   - Tenant marketplace

## Support

For questions and support regarding the multi-tenant architecture:

1. Check the troubleshooting section above
2. Review the API documentation
3. Contact the development team
4. Submit issues through the project repository 