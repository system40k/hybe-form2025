-- Enterprise Database Initialization Script for PostgreSQL
-- Run automatically on first container start

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create enum types for better data integrity
CREATE TYPE otp_status AS ENUM ('pending', 'verified', 'expired', 'failed');
CREATE TYPE audit_event_type AS ENUM ('otp_sent', 'otp_verified', 'otp_failed', 'form_submitted', 'rate_limited', 'login_attempt');

-- OTP codes table with enhanced security features
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL, -- Case-insensitive email
    code_hash VARCHAR(255) NOT NULL,
    code_salt VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status otp_status DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_attempts CHECK (attempts >= 0 AND attempts <= max_attempts),
    CONSTRAINT chk_expires CHECK (expires_at > created_at)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at ON otp_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_status ON otp_codes(status);
CREATE INDEX IF NOT EXISTS idx_otp_codes_ip ON otp_codes(ip_address);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(50) NOT NULL,
    email CITEXT NOT NULL,
    otp_id UUID REFERENCES otp_codes(id),
    otp_verified BOOLEAN DEFAULT FALSE,
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_referral_code CHECK (length(referral_code) > 0)
);

-- Indexes for form submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_referral ON form_submissions(referral_code);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON form_submissions(email);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_processed ON form_submissions(processed);
CREATE INDEX IF NOT EXISTS idx_form_submissions_otp_id ON form_submissions(otp_id);

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- email or IP address
    type VARCHAR(50) NOT NULL, -- 'email_send', 'email_verify', 'ip_request'
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    lock_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    CONSTRAINT unique_identifier_type UNIQUE(identifier, type)
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_type ON rate_limits(type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_locked_until ON rate_limits(locked_until);

-- Audit log for compliance and security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type audit_event_type NOT NULL,
    actor_id UUID, -- User ID if authenticated
    email CITEXT,
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(100), -- 'otp_code', 'form_submission', etc.
    resource_id UUID,
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'failure', 'blocked'
    details JSONB DEFAULT '{}'::jsonb,
    risk_score INTEGER DEFAULT 0, -- 0-100, higher is riskier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs (critical for compliance queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_email ON audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_score ON audit_logs(risk_score);

-- Temporary email domains blocklist
CREATE TABLE IF NOT EXISTS blocked_email_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    added_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_domains_domain ON blocked_email_domains(domain);
CREATE INDEX IF NOT EXISTS idx_blocked_domains_active ON blocked_email_domains(is_active);

-- Insert common temporary email domains
INSERT INTO blocked_email_domains (domain, reason, added_by) VALUES
('tempmail.com', 'Temporary email service', 'system'),
('guerrillamail.com', 'Temporary email service', 'system'),
('10minutemail.com', 'Temporary email service', 'system'),
('mailinator.com', 'Public inbox service', 'system'),
('throwaway.email', 'Temporary email service', 'system')
ON CONFLICT (domain) DO NOTHING;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_otp_codes_updated_at ON otp_codes;
CREATE TRIGGER update_otp_codes_updated_at 
    BEFORE UPDATE ON otp_codes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
CREATE TRIGGER update_rate_limits_updated_at 
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blocked_domains_updated_at ON blocked_email_domains;
CREATE TRIGGER update_blocked_domains_updated_at 
    BEFORE UPDATE ON blocked_email_domains
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OTP codes (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() OR status = 'expired';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset rate limits after window expires
CREATE OR REPLACE FUNCTION reset_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    UPDATE rate_limits 
    SET request_count = 0, 
        window_start = NOW(),
        locked_until = NULL,
        lock_reason = NULL
    WHERE window_start + INTERVAL '15 minutes' < NOW()
       OR (locked_until IS NOT NULL AND locked_until < NOW());
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old audit logs (for compliance retention)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In production, you might move these to a separate archive table or S3
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create database user for application (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hybe_app') THEN
        CREATE ROLE hybe_app WITH LOGIN PASSWORD 'changeme_in_production';
    END IF;
END
$$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE hybe_db TO hybe_app;
GRANT USAGE ON SCHEMA public TO hybe_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hybe_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hybe_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hybe_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO hybe_app;

-- Insert initial configuration
INSERT INTO rate_limits (identifier, type, request_count, window_start) 
VALUES ('system_init', 'config', 1, NOW())
ON CONFLICT (identifier, type) DO NOTHING;

-- Log initialization
INSERT INTO audit_logs (event_type, action, status, details)
VALUES ('login_attempt'::audit_event_type, 'create', 'success', 
        '{"message": "Database initialized successfully", "version": "1.0.0"}'::jsonb);
