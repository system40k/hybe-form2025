# Enterprise Production System for HYBE Fan-Permit

## Architecture Overview

This document outlines the enterprise-grade production architecture for the HYBE Fan-Permit Email OTP Verification System.

### Core Components

1. **Application Layer**
   - Express.js API server (containerized)
   - Netlify Functions for serverless operations
   - Vite-built frontend static assets

2. **Data Layer**
   - PostgreSQL (managed: AWS RDS, Google Cloud SQL, or Supabase)
   - Redis (managed: AWS ElastiCache, Google Memorystore, or Redis Cloud)
   - Connection pooling via PgBouncer

3. **Infrastructure**
   - Docker containers orchestrated via Kubernetes or ECS
   - Load balancer (AWS ALB, Google Cloud Load Balancing)
   - CDN (Cloudflare or AWS CloudFront)
   - Web Application Firewall (WAF)

4. **Security & Compliance**
   - Secrets management (AWS Secrets Manager, HashiCorp Vault)
   - Audit logging with tamper-proof storage
   - SOC 2 / GDPR compliance features
   - End-to-end encryption

5. **Observability**
   - Distributed tracing (OpenTelemetry + Jaeger/Zipkin)
   - Metrics collection (Prometheus + Grafana)
   - Centralized logging (ELK Stack or Datadog)
   - Health check endpoints
   - Alerting (PagerDuty, OpsGenie)

## Deployment Options

### Option A: AWS ECS/Fargate (Recommended)
```bash
# Infrastructure as Code
terraform apply -var-file=production.tfvars

# Deploy
docker build -t hybe-form:latest .
docker push <ecr-repo>/hybe-form:latest
aws ecs update-service --cluster hybe-cluster --service hybe-service --force-new-deployment
```

### Option B: Google Cloud Run
```bash
gcloud run deploy hybe-form \
  --image gcr.io/<project-id>/hybe-form:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Option C: Kubernetes (EKS/GKE/AKS)
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

## Environment Variables (Production)

Required in `.env.production` or secrets manager:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/hybe_db?sslmode=require
PGBOUNCER_HOST=localhost
PGBOUNCER_PORT=6432

# Redis
REDIS_URL=redis://username:password@host:6379
REDIS_TLS_ENABLED=true

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx

# Security
JWT_SECRET=<32-byte-random-string>
ENCRYPTION_KEY=<32-byte-random-string>
NODE_ENV=production

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector:4317
DATADOG_API_KEY=ddxxxxxxxxxxxxx
SENTRY_DSN=https://xxxx@sentry.io/xxxx

# Rate Limiting
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=3
IP_RATE_LIMIT_WINDOW_MS=900000
IP_RATE_LIMIT_MAX_REQUESTS=10

# Feature Flags
MAINTENANCE_MODE=false
ALLOW_TEMP_EMAILS=false
LOG_LEVEL=info
```

## Database Migration (SQLite → PostgreSQL)

Run the following SQL on your PostgreSQL instance:

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- OTP codes table
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    verified BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_otp_codes_email ON otp_codes(email);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_otp_codes_created_at ON otp_codes(created_at);

-- Form submissions table
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    submission_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_form_submissions_referral ON form_submissions(referral_code);
CREATE INDEX idx_form_submissions_email ON form_submissions(email);
CREATE INDEX idx_form_submissions_created_at ON form_submissions(created_at);

-- Rate limiting tracking
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- email or IP
    type VARCHAR(50) NOT NULL, -- 'email' or 'ip'
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, type)
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- Audit log for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_email ON audit_logs(email);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_otp_codes_updated_at BEFORE UPDATE ON otp_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: hybe-form
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster hybe-production \
            --service hybe-form-service \
            --force-new-deployment
```

## Monitoring & Alerting

### Health Check Endpoint

The application exposes `/health` endpoint returning:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "email_service": "ok"
  },
  "uptime_seconds": 86400
}
```

### Prometheus Metrics

Exposed at `/metrics`:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `otp_codes_sent_total` - OTP codes sent counter
- `otp_verifications_total` - Verification attempts
- `form_submissions_total` - Successful submissions
- `rate_limit_hits_total` - Rate limit triggers

### Alert Rules (Prometheus)

```yaml
groups:
  - name: hybe-form-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: OTPEmailServiceDown
        expr: up{job="email-service"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Email service is down"
          
      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_available_connections == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool exhausted"
```

## Disaster Recovery

### Backup Strategy
- **PostgreSQL**: Automated daily snapshots + continuous WAL archiving
- **Redis**: RDB snapshots every hour + AOF persistence
- **Application**: Infrastructure as Code (Terraform) for quick recreation

### Recovery Time Objective (RTO): < 1 hour
### Recovery Point Objective (RPO): < 5 minutes

### Failover Procedure
1. Detect failure via health checks
2. Automatic failover to standby region (if multi-region)
3. Restore from latest backup if needed
4. Verify data integrity
5. Resume traffic via load balancer

## Scaling Guidelines

### Horizontal Scaling
- Add more container instances when CPU > 70% for 5 minutes
- Auto-scaling based on request queue depth
- Redis Cluster for high-throughput caching

### Vertical Scaling
- Increase container memory when heap usage > 80%
- Upgrade database instance class during maintenance windows

### Database Optimization
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer) to reduce connection overhead
- Query optimization via EXPLAIN ANALYZE

## Security Hardening Checklist

- [ ] Enable TLS 1.3 everywhere
- [ ] Rotate all secrets quarterly
- [ ] Implement mutual TLS between services
- [ ] Enable database encryption at rest
- [ ] Configure network policies (Kubernetes NetworkPolicy)
- [ ] Set up VPC with private subnets
- [ ] Enable AWS GuardDuty / Google Security Command Center
- [ ] Implement DDoS protection (AWS Shield / Cloudflare)
- [ ] Regular penetration testing (quarterly)
- [ ] SOC 2 Type II compliance audit

## Cost Optimization

- Use spot instances for non-critical workloads
- Implement request batching for email sending
- Cache frequently accessed data in Redis
- Use CDN for static assets
- Right-size database instances based on metrics
- Enable auto-scaling to zero during low-traffic periods

## Support & Maintenance

### On-Call Rotation
- Primary engineer: Week 1
- Secondary engineer: Week 2
- Escalation path: Engineer → Tech Lead → VP Engineering

### Maintenance Windows
- Scheduled: Sundays 02:00-04:00 UTC
- Emergency: As needed with stakeholder notification

### Version Updates
- Minor versions: Monthly
- Major versions: Quarterly with migration plan
- Security patches: Within 48 hours of disclosure
