# 🔗 Enterprise System Connections Summary

## Quick Reference: How Everything Connects

### 📊 Visual Flow

```
USER → [WAF/Cloudflare] → NGINX (443) → APP (3000) → POSTGRES (5432/6432)
                                      ↓           → REDIS (6379)
                                      ↓           → EMAIL SERVICE (Resend/SendGrid)
                                      
PROMETHEUS (9090) ← scrapes ← APP, POSTGRES, REDIS, NGINX
GRAFANA (3001) ← queries ← PROMETHEUS
```

---

## 🏢 Component Connection Matrix

| From | To | Protocol | Port | Config File | Purpose |
|------|-----|----------|------|-------------|---------|
| **Internet** | Nginx | HTTPS | 443 | `nginx.conf:78` | User traffic entry |
| **Nginx** | App Containers | HTTP | 3000 | `nginx.conf:135` | API proxy & load balancing |
| **App** | PostgreSQL | TCP | 5432 | `docker-compose.yml:50` | Database operations |
| **App** | PgBouncer | TCP | 6432 | `docker-compose.yml:94` | Connection pooling |
| **App** | Redis | TCP | 6379 | `docker-compose.yml:74` | Rate limiting cache |
| **App** | Email Service | HTTPS | 443 | `.env` | OTP email delivery |
| **Prometheus** | App | HTTP | 3000 | `prometheus.yml:31` | Metrics scraping |
| **Prometheus** | Postgres Exporter | HTTP | 9187 | `prometheus.yml:47` | DB metrics |
| **Prometheus** | Redis Exporter | HTTP | 9121 | `prometheus.yml:57` | Cache metrics |
| **Grafana** | Prometheus | HTTP | 9090 | `datasources.yaml` | Dashboard data |

---

## 🔌 Physical Connections (Docker Compose)

All services connect via the **`hybe-network`** bridge network (subnet: `172.28.0.0/16`)

### Network Topology
```
hybe-network (172.28.0.0/16)
├── nginx (172.28.0.2)
├── app-1 (172.28.0.3)
├── app-2 (172.28.0.4)
├── app-3 (172.28.0.5)
├── postgres (172.28.0.6)
├── pgbouncer (172.28.0.7)
├── redis (172.28.0.8)
├── prometheus (172.28.0.9)
└── grafana (172.28.0.10)
```

### Service Discovery
Within Docker network, services reach each other by **hostname**:
- App connects to `postgres:5432` (not IP address)
- App connects to `redis:6379`
- Prometheus scrapes `app:3000`

---

## 🔐 Data Flow Examples

### 1. OTP Send Request
```
Browser 
  → HTTPS (443) → Nginx 
  → HTTP (3000) → Express App (/api/otp/send)
  → TCP (6379) → Redis (check rate limit)
  → TCP (5432) → PostgreSQL (validate email domain)
  → TCP (5432) → PostgreSQL (store OTP hash)
  → HTTPS (443) → Resend API (send email)
  → TCP (5432) → PostgreSQL (audit log)
  ← Response back through chain
```

### 2. Form Submission (Verified)
```
Browser 
  → HTTPS (443) → Nginx 
  → HTTP (3000) → Express App (/api/submit-form)
  → TCP (5432) → PostgreSQL (verify OTP token)
  → TCP (5432) → PostgreSQL (validate referral code)
  → TCP (5432) → PostgreSQL (store submission)
  → TCP (5432) → PostgreSQL (mark OTP used)
  → TCP (5432) → PostgreSQL (audit log)
  ← Success response
```

### 3. Metrics Collection
```
Prometheus (every 15s)
  → HTTP (3000/metrics) → App (expose counters)
  → HTTP (9187/metrics) → Postgres Exporter
  → HTTP (9121/metrics) → Redis Exporter
  → Store in TSDB
  
Grafana (user opens dashboard)
  → HTTP (9090/api/v1/query) → Prometheus (query metrics)
  ← Return time-series data
  ← Render visualization
```

---

## 🚀 Kubernetes Production Connections

### Namespace: `hybe-production`

```yaml
# Internal cluster communication
Ingress Controller (public IP)
  → Service (ClusterIP: 10.96.x.x)
  → Pod 1, Pod 2, Pod 3 (via kube-proxy)
  
Pods connect to external managed services:
  → Amazon RDS / Cloud SQL (PostgreSQL)
  → ElastiCache / Memorystore (Redis)
  → Managed Prometheus / Grafana
```

### Security Groups / Firewall Rules

| Direction | Source | Destination | Port | Protocol |
|-----------|--------|-------------|------|----------|
| Inbound | 0.0.0.0/0 | Ingress LB | 443 | TCP |
| Inbound | VPC CIDR | RDS | 5432 | TCP |
| Inbound | VPC CIDR | ElastiCache | 6379 | TCP |
| Outbound | Pods | Resend API | 443 | TCP |
| Outbound | Pods | SMTP Service | 587 | TCP |

---

## 📁 Configuration Files Reference

| Component | Config File | Key Settings |
|-----------|-------------|--------------|
| **Nginx** | `nginx.conf` | SSL, rate limits, proxy rules |
| **App** | `docker-compose.yml:12-19` | Env vars, ports, depends_on |
| **PostgreSQL** | `scripts/init-db.sql` | Schema, tables, indexes |
| **Redis** | `docker-compose.yml:74-91` | Password, persistence |
| **Prometheus** | `prometheus/prometheus.yml` | Scrape targets, alerts |
| **Grafana** | `grafana/provisioning/` | Datasources, dashboards |
| **K8s** | `k8s/deployment.yaml` | Replicas, resources, probes |

---

## 🎯 Quick Start Commands

### Local Testing (All Services)
```bash
# Start everything
docker-compose up -d

# View connections
docker network inspect workspace_hybe-network

# Check service health
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Access Points
- **Application**: http://localhost (via Nginx)
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **PostgreSQL**: localhost:5432 (hybe_user/changeme_production_password)
- **Redis**: localhost:6379 (password from .env)

### Production Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml

# Verify connections
kubectl get pods -n hybe-production
kubectl get svc -n hybe-production
kubectl get ingress -n hybe-production
```

---

## 🔍 Troubleshooting Connections

### App Can't Connect to Database
```bash
# Check if postgres is running
docker-compose ps postgres

# Test connection from app container
docker exec -it workspace-app-1 sh
nc -zv postgres 5432

# Check DATABASE_URL env var
docker exec workspace-app-1 env | grep DATABASE
```

### Prometheus Not Scraping App
```bash
# Check if metrics endpoint works
curl http://localhost:3000/metrics

# Verify scrape config
docker exec workspace-prometheus-1 cat /etc/prometheus/prometheus.yml

# Check Prometheus targets
Open http://localhost:9090/targets
```

### Grafana Shows No Data
```bash
# Verify datasource connection
Open Grafana → Configuration → Data Sources → Prometheus
Click "Save & Test"

# Check if Prometheus has data
Open Prometheus → Graph → Query: up
```

---

## 📊 Monitoring Dashboard Locations

| Dashboard | URL | Description |
|-----------|-----|-------------|
| **System Overview** | Grafana Home | All services health |
| **OTP Metrics** | `/d/hybe-otp-overview` | Success rates, failures |
| **Database Performance** | `/d/postgres` | Query latency, connections |
| **Redis Cache** | `/d/redis` | Hit rates, memory usage |
| **Security Alerts** | `/d/security` | Rate limits, attacks |

---

## ✅ Connection Verification Checklist

Before going to production, verify:

- [ ] Nginx routes traffic to all 3 app replicas
- [ ] App can query PostgreSQL (run test query)
- [ ] App can read/write to Redis (test SET/GET)
- [ ] Prometheus scrapes all targets (check /targets page)
- [ ] Grafana displays real-time metrics
- [ ] Health checks pass for all services
- [ ] SSL certificates are valid
- [ ] Rate limiting works (test with multiple requests)
- [ ] Audit logs are being written
- [ ] Email service integration works

---

**📖 Full Details**: See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for comprehensive documentation.
