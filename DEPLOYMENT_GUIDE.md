# Enterprise Production Deployment Guide

## Quick Start Options

### Option 1: Docker Compose (Recommended for Testing)

```bash
# 1. Copy environment template
cp .env.example .env.production

# 2. Edit .env.production with your production values
# Generate secure keys:
#   openssl rand -hex 32  # For JWT_SECRET and ENCRYPTION_KEY

# 3. Initialize SSL certificates (self-signed for testing, use Let's Encrypt for production)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# 4. Start all services
docker-compose --env-file .env.production up -d

# 5. Check logs
docker-compose logs -f app

# 6. Access services:
#    - Application: https://localhost
#    - Prometheus: http://localhost:9090
#    - Grafana: http://localhost:3001 (admin/admin)
```

### Option 2: Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace hybe-production

# 2. Update k8s/secrets.yaml with your values or use External Secrets
kubectl apply -f k8s/secrets.yaml -n hybe-production

# 3. Deploy application
kubectl apply -f k8s/deployment.yaml

# 4. Verify deployment
kubectl get pods -n hybe-production
kubectl get svc -n hybe-production

# 5. Check logs
kubectl logs -f deployment/hybe-form-app -n hybe-production

# 6. Scale manually if needed
kubectl scale deployment hybe-form-app --replicas=5 -n hybe-production
```

### Option 3: AWS ECS/Fargate

```bash
# 1. Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t hybe-form:latest .
docker tag hybe-form:latest <your-account>.dkr.ecr.us-east-1.amazonaws.com/hybe-form:latest
docker push <your-account>.dkr.ecr.us-east-1.amazonaws.com/hybe-form:latest

# 2. Create ECR repository (if not exists)
aws ecr create-repository --repository-name hybe-form --region us-east-1

# 3. Deploy using Terraform or AWS Console
# See ENTERPRISE_PRODUCTION.md for Terraform configuration
```

## Pre-Deployment Checklist

### Security
- [ ] Generate new JWT_SECRET and ENCRYPTION_KEY (32 bytes each)
- [ ] Update all passwords in secrets
- [ ] Enable TLS 1.3 everywhere
- [ ] Configure WAF rules
- [ ] Set up VPC with private subnets
- [ ] Enable database encryption at rest
- [ ] Rotate all default credentials
- [ ] Configure security groups/firewall rules
- [ ] Enable audit logging

### Database
- [ ] Provision PostgreSQL instance (managed service recommended)
- [ ] Run init-db.sql script
- [ ] Configure automated backups
- [ ] Set up read replicas if needed
- [ ] Test connection pooling with PgBouncer
- [ ] Verify indexes are created

### Caching
- [ ] Provision Redis cluster (managed service recommended)
- [ ] Enable TLS for Redis connections
- [ ] Configure persistence (AOF + RDB)
- [ ] Set up monitoring alerts

### Email Service
- [ ] Configure Resend/SendGrid API keys
- [ ] Verify sender domain
- [ ] Set up DKIM/SPF records
- [ ] Test email delivery
- [ ] Configure bounce/complaint handling

### Monitoring & Alerting
- [ ] Deploy Prometheus stack
- [ ] Configure Grafana dashboards
- [ ] Set up alert rules
- [ ] Configure PagerDuty/OpsGenie integration
- [ ] Test alerting pipeline
- [ ] Enable distributed tracing (OpenTelemetry)

### CI/CD
- [ ] Configure GitHub Actions workflow
- [ ] Set up staging environment
- [ ] Implement blue/green deployment
- [ ] Configure rollback procedures
- [ ] Test disaster recovery

### Compliance
- [ ] Review data retention policies
- [ ] Implement GDPR compliance features
- [ ] Set up audit log retention
- [ ] Document data flow
- [ ] Prepare for SOC 2 audit

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `REDIS_URL` | Yes | Redis connection string | `redis://:password@host:6379` |
| `RESEND_API_KEY` | Yes | Resend email API key | `re_xxxxx` |
| `JWT_SECRET` | Yes | JWT signing secret (32 bytes) | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | Encryption key (32 bytes) | `openssl rand -hex 32` |
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | No | Server port | `3000` |
| `LOG_LEVEL` | No | Logging level | `info`, `debug`, `error` |
| `SENTRY_DSN` | No | Sentry error tracking | `https://xxx@sentry.io/xxx` |
| `DATADOG_API_KEY` | No | Datadog metrics | `ddxxxxx` |

## Health Checks

### Application Health
```bash
curl https://your-domain.com/health
```

Expected response:
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

### Database Health
```bash
docker-compose exec postgres pg_isready -U hybe_user -d hybe_db
```

### Redis Health
```bash
docker-compose exec redis redis-cli ping
```

## Monitoring Dashboards

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate (req/s)
   - Error rate (%)
   - Response time (p50, p95, p99)
   - Active connections

2. **OTP Metrics**
   - OTP codes sent (count/min)
   - Verification success rate (%)
   - Failed attempts (count/min)
   - Expiration rate (%)

3. **Database Metrics**
   - Connection pool usage (%)
   - Query latency (ms)
   - Transaction rate (tps)
   - Replication lag (ms)

4. **Redis Metrics**
   - Memory usage (MB)
   - Hit rate (%)
   - Eviction rate (keys/s)
   - Connected clients

5. **Infrastructure Metrics**
   - CPU usage (%)
   - Memory usage (%)
   - Disk I/O (MB/s)
   - Network throughput (Mbps)

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection string
echo $DATABASE_URL

# Test connectivity
docker-compose exec app node -e "console.log(require('pg').Pool)"
```

**2. High Memory Usage**
```bash
# Check container memory
docker stats

# Profile Node.js heap
curl http://localhost:3000/debug/heap > heap.json
```

**3. Email Delivery Failures**
```bash
# Check email service status
curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains

# Review application logs for errors
docker-compose logs app | grep -i email
```

**4. Rate Limiting Issues**
```bash
# Check rate limit tables
docker-compose exec postgres psql -U hybe_user -d hybe_db -c "SELECT * FROM rate_limits ORDER BY updated_at DESC LIMIT 10;"

# Reset rate limits if needed
docker-compose exec postgres psql -U hybe_user -d hybe_db -c "SELECT reset_expired_rate_limits();"
```

## Performance Tuning

### PostgreSQL Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM otp_codes WHERE email = 'test@example.com';

-- Vacuum and analyze tables
VACUUM ANALYZE otp_codes;
VACUUM ANALYZE form_submissions;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan ASC;
```

### Redis Optimization
```bash
# Check memory info
redis-cli INFO memory

# Check slow log
redis-cli SLOWLOG GET 10

# Optimize maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Node.js Optimization
```bash
# Increase heap size if needed
export NODE_OPTIONS="--max-old-space-size=512"

# Enable clustering
export CLUSTER_ENABLED=true
export CLUSTER_WORKERS=4
```

## Backup & Recovery

### Database Backup
```bash
# Daily backup script
docker-compose exec postgres pg_dump -U hybe_user hybe_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip -c backup_20240115.sql.gz | docker-compose exec -T postgres psql -U hybe_user -d hybe_db
```

### Redis Backup
```bash
# Trigger BGSAVE
docker-compose exec redis redis-cli BGSAVE

# Copy RDB file
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## Scaling Guidelines

### When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | > 70% for 5 min | Add replicas |
| Memory Usage | > 80% for 5 min | Add replicas or increase memory |
| Response Time (p99) | > 500ms | Optimize queries, add caching |
| Error Rate | > 1% | Investigate logs, rollback if needed |
| Queue Depth | > 100 requests | Add workers |

### Horizontal Scaling
```bash
# Docker Compose
docker-compose up -d --scale app=5

# Kubernetes
kubectl scale deployment hybe-form-app --replicas=5 -n hybe-production
```

## Cost Optimization

1. **Use Spot Instances** for non-critical workloads (save up to 70%)
2. **Right-size Resources** based on actual usage metrics
3. **Enable Auto-scaling to Zero** during low-traffic periods
4. **Use Managed Services** to reduce operational overhead
5. **Implement Caching** to reduce database load
6. **Optimize Images** to reduce storage and transfer costs
7. **Use CDN** for static assets to reduce origin load

## Support Contacts

- **Technical Lead**: [contact-info]
- **On-Call Engineer**: [pager-duty-link]
- **Escalation Path**: Engineer → Tech Lead → VP Engineering
- **Slack Channel**: #hybe-form-production

## Next Steps

1. Review ENTERPRISE_PRODUCTION.md for detailed architecture
2. Customize configuration files for your environment
3. Run pre-deployment checklist
4. Deploy to staging environment first
5. Perform load testing
6. Deploy to production with canary release
7. Monitor closely for 48 hours
8. Document any issues and resolutions
