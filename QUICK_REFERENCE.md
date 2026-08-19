# Enterprise Production System - Quick Reference

## 🚀 Deployment Commands

### Docker Compose (Local/Testing)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Kubernetes (Production)
```bash
# Deploy to cluster
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -n hybe-production
kubectl get svc -n hybe-production

# Scale application
kubectl scale deployment hybe-form-app --replicas=5 -n hybe-production

# View logs
kubectl logs -f deployment/hybe-form-app -n hybe-production
```

### AWS ECS/Fargate
```bash
# Build and push
docker build -t hybe-form:latest .
docker tag hybe-form:latest <account>.dkr.ecr.us-east-1.amazonaws.com/hybe-form:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/hybe-form:latest

# Deploy
aws ecs update-service --cluster hybe-production --service hybe-form --force-new-deployment
```

## 🔑 Generate Secure Keys

```bash
# JWT Secret (32 bytes)
openssl rand -hex 32

# Encryption Key (32 bytes)
openssl rand -hex 32

# Password (16 characters)
openssl rand -base64 16
```

## 📊 Monitoring URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | https://your-domain.com | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin/admin |
| PostgreSQL | localhost:5432 | hybe_user/[password] |
| Redis | localhost:6379 | [password] |

## 🧪 Health Checks

```bash
# Application health
curl https://your-domain.com/health

# Database connectivity
docker-compose exec postgres pg_isready -U hybe_user -d hybe_db

# Redis connectivity
docker-compose exec redis redis-cli ping

# Container stats
docker stats
```

## 📁 Project Structure

```
/workspace
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development stack
├── nginx.conf                 # Reverse proxy config
├── ENTERPRISE_PRODUCTION.md   # Architecture documentation
├── DEPLOYMENT_GUIDE.md        # Step-by-step deployment
├── k8s/
│   ├── deployment.yaml        # Kubernetes manifests
│   └── secrets.yaml           # K8s secrets template
├── scripts/
│   └── init-db.sql            # Database initialization
├── prometheus/
│   └── prometheus.yml         # Monitoring config
├── grafana/
│   └── provisioning/          # Dashboard configs
├── lib/                       # Core libraries
│   ├── otp-service.js
│   ├── security.js
│   └── supabaseClient.js
├── netlify/functions/         # Serverless functions
├── dist/                      # Built frontend
└── tests/                     # E2E tests
```

## 🔧 Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/hybe_db?sslmode=require

# Redis
REDIS_URL=redis://:password@host:6379

# Email
RESEND_API_KEY=re_xxxxx

# Security (generate with openssl rand -hex 32)
JWT_SECRET=your_32_byte_secret
ENCRYPTION_KEY=your_32_byte_key

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NODE_ENV=production
```

## 🚨 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 0.5% | > 1% |
| Response Time (p99) | > 300ms | > 500ms |
| CPU Usage | > 60% | > 80% |
| Memory Usage | > 70% | > 90% |
| Database Connections | > 80% | > 95% |

## 🛡️ Security Checklist

- [ ] TLS 1.3 enabled everywhere
- [ ] WAF rules configured
- [ ] Secrets rotated quarterly
- [ ] Audit logging enabled
- [ ] Database encrypted at rest
- [ ] Network policies applied
- [ ] DDoS protection active
- [ ] Penetration testing scheduled

## 📞 Support

- **Documentation**: See `ENTERPRISE_PRODUCTION.md` and `DEPLOYMENT_GUIDE.md`
- **On-Call**: [Your PagerDuty Link]
- **Slack**: #hybe-form-production
- **Escalation**: Engineer → Tech Lead → VP Engineering

## 🎯 Next Steps

1. ✅ Review architecture in `ENTERPRISE_PRODUCTION.md`
2. ✅ Follow deployment guide in `DEPLOYMENT_GUIDE.md`
3. ✅ Configure monitoring and alerting
4. ✅ Run load tests
5. ✅ Deploy to staging
6. ✅ Canary release to production
7. ✅ Monitor for 48 hours

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
