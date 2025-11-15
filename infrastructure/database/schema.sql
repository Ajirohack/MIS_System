-- Membership Initiation System Database Schema
-- PostgreSQL 15+ compatible

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB for flexible data storage
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tenants table (Multi-tenant architecture)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'inactive')),
    plan VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'enterprise', 'custom')),
    max_users INTEGER NOT NULL DEFAULT 100,
    max_storage_gb INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    billing_info JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users table (now tenant-aware)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending', 'inactive')),
    membership_level VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (membership_level IN ('basic', 'premium', 'vip')),
    avatar VARCHAR(500),
    bio TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login_at TIMESTAMP,
    last_active_at TIMESTAMP,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Invitations table (now tenant-aware)
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(22) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Member profiles table (now tenant-aware)
CREATE TABLE member_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_number VARCHAR(50) NOT NULL,
    join_date TIMESTAMP NOT NULL DEFAULT NOW(),
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    achievements TEXT[] DEFAULT '{}',
    badges TEXT[] DEFAULT '{}',
    last_active_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, membership_number)
);

-- Sessions table (now tenant-aware)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit logs table (now tenant-aware)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_email VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_id VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- OAuth providers table (now tenant-aware)
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    authorization_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    user_info_url TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- OAuth connections table (now tenant-aware)
CREATE TABLE oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES oauth_providers(id) ON DELETE CASCADE,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    profile_data JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, provider_id)
);

-- API keys table (now tenant-aware)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Webhooks table (now tenant-aware)
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Webhook events table (now tenant-aware)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    response_code INTEGER,
    response_body TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);

-- Media files table (now tenant-aware)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    hash VARCHAR(255),
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Verification workflows table (now tenant-aware)
CREATE TABLE verification_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'expired')),
    data JSONB NOT NULL DEFAULT '{}',
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Developer applications table (now tenant-aware)
CREATE TABLE developer_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    scopes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit INTEGER NOT NULL DEFAULT 1000,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- SDK usage tracking table (now tenant-aware)
CREATE TABLE sdk_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    application_id UUID REFERENCES developer_applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sdk_type VARCHAR(50) NOT NULL,
    sdk_version VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER,
    status_code INTEGER,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Biometric templates table (now tenant-aware)
CREATE TABLE biometric_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('fingerprint', 'face', 'voice', 'iris')),
    template_data TEXT NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, type)
);

-- AI/ML models table (now tenant-aware)
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('fraud_detection', 'document_verification', 'behavioral_analysis')),
    version VARCHAR(50) NOT NULL,
    model_data BYTEA,
    model_path TEXT,
    accuracy DECIMAL(5,4),
    training_data_size INTEGER,
    training_duration INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name, version)
);

-- Analytics data table (now tenant-aware)
CREATE TABLE analytics_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tenant configurations table
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, config_key)
);

-- Indexes for performance (tenant-aware)
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

CREATE INDEX idx_member_profiles_tenant_id ON member_profiles(tenant_id);
CREATE INDEX idx_member_profiles_membership_number ON member_profiles(membership_number);
CREATE INDEX idx_member_profiles_tenant_membership ON member_profiles(tenant_id, membership_number);
CREATE INDEX idx_member_profiles_join_date ON member_profiles(join_date);

CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_id ON sessions(refresh_token_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

CREATE INDEX idx_oauth_providers_tenant_id ON oauth_providers(tenant_id);
CREATE INDEX idx_oauth_connections_tenant_id ON oauth_connections(tenant_id);
CREATE INDEX idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider_id ON oauth_connections(provider_id);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);

CREATE INDEX idx_webhook_events_tenant_id ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);

CREATE INDEX idx_media_files_tenant_id ON media_files(tenant_id);
CREATE INDEX idx_media_files_user_id ON media_files(user_id);

CREATE INDEX idx_verification_workflows_tenant_id ON verification_workflows(tenant_id);
CREATE INDEX idx_verification_workflows_user_id ON verification_workflows(user_id);
CREATE INDEX idx_verification_workflows_status ON verification_workflows(status);

CREATE INDEX idx_developer_applications_tenant_id ON developer_applications(tenant_id);
CREATE INDEX idx_developer_applications_user_id ON developer_applications(user_id);

CREATE INDEX idx_sdk_usage_tenant_id ON sdk_usage(tenant_id);
CREATE INDEX idx_sdk_usage_application_id ON sdk_usage(application_id);
CREATE INDEX idx_sdk_usage_user_id ON sdk_usage(user_id);

CREATE INDEX idx_biometric_templates_tenant_id ON biometric_templates(tenant_id);
CREATE INDEX idx_biometric_templates_user_id ON biometric_templates(user_id);
CREATE INDEX idx_biometric_templates_type ON biometric_templates(type);

CREATE INDEX idx_ml_models_tenant_id ON ml_models(tenant_id);
CREATE INDEX idx_ml_models_type ON ml_models(type);
CREATE INDEX idx_ml_models_is_active ON ml_models(is_active);

CREATE INDEX idx_analytics_data_tenant_id ON analytics_data(tenant_id);
CREATE INDEX idx_analytics_data_metric_name ON analytics_data(metric_name);
CREATE INDEX idx_analytics_data_timestamp ON analytics_data(timestamp);

CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_config_key ON tenant_configurations(config_key);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_member_profiles_updated_at BEFORE UPDATE ON member_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON oauth_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_workflows_updated_at BEFORE UPDATE ON verification_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developer_applications_updated_at BEFORE UPDATE ON developer_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biometric_templates_updated_at BEFORE UPDATE ON biometric_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_configurations_updated_at BEFORE UPDATE ON tenant_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Full-text search indexes (tenant-aware)
CREATE INDEX idx_users_search ON users USING GIN(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
CREATE INDEX idx_member_profiles_search ON member_profiles USING GIN(to_tsvector('english', bio));
CREATE INDEX idx_audit_logs_search ON audit_logs USING GIN(to_tsvector('english', description));

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Multi-tenant organization management';
COMMENT ON TABLE users IS 'Core user accounts for the membership platform (tenant-aware)';
COMMENT ON TABLE invitations IS 'Invitation codes for new member registration (tenant-aware)';
COMMENT ON TABLE member_profiles IS 'Extended member profile information (tenant-aware)';
COMMENT ON TABLE sessions IS 'User session management for authentication (tenant-aware)';
COMMENT ON TABLE audit_logs IS 'System audit trail for security and compliance (tenant-aware)';
COMMENT ON TABLE oauth_providers IS 'OAuth provider configurations (tenant-aware)';
COMMENT ON TABLE oauth_connections IS 'User OAuth account connections (tenant-aware)';
COMMENT ON TABLE api_keys IS 'API key management for third-party integrations (tenant-aware)';
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications (tenant-aware)';
COMMENT ON TABLE webhook_events IS 'Webhook event delivery tracking (tenant-aware)';
COMMENT ON TABLE media_files IS 'File storage and management (tenant-aware)';
COMMENT ON TABLE verification_workflows IS 'Verification and approval processes (tenant-aware)';
COMMENT ON TABLE developer_applications IS 'Third-party application management (tenant-aware)';
COMMENT ON TABLE sdk_usage IS 'SDK usage analytics and tracking (tenant-aware)';
COMMENT ON TABLE biometric_templates IS 'Biometric authentication templates (tenant-aware)';
COMMENT ON TABLE ml_models IS 'Machine learning models for AI services (tenant-aware)';
COMMENT ON TABLE analytics_data IS 'Analytics and metrics storage (tenant-aware)';
COMMENT ON TABLE tenant_configurations IS 'Tenant-specific configuration settings'; 