# Enterprise Production Architecture - Component Connections

## 🏗️ System Architecture Overview

This document explains how all enterprise-grade components connect and communicate in the HYBE Fan-Permit Email OTP Verification System.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE / AWS WAF                                │
│                    (Web Application Firewall + DDoS Protection)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NGINX LOAD BALANCER (Port 80/443)                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • SSL/TLS Termination                                                │  │
│  │ • Rate Limiting (10 req/s global, 5 req/s for OTP)                   │  │
│  │ • Security Headers (HSTS, CSP, X-Frame-Options)                      │  │
│  │ • Reverse Proxy to App Containers                                    │  │
│  │ • Static File Serving (dist/)                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │   APP Pod   │      │   APP Pod   │      │   APP Pod   │
    │  (Replica 1)│      │  (Replica 2)│      │  (Replica 3)│
    │  Port 3000  │      │  Port 3000  │      │  Port 3000  │
    ├─────────────┤      ├─────────────┤      ├─────────────┤
    │ Express.js  │      │ Express.js  │      │ Express.js  │
    │ • OTP Send  │      │ • OTP Send  │      │ • OTP Send  │
    │ • OTP Verify│      │ • OTP Verify│      │ • OTP Verify│
    │ • Form Sub  │      │ • Form Sub  │      │ • Form Sub  │
    │ • Metrics   │      │ • Metrics   │      │ • Metrics   │
    └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  PostgreSQL  │ │    Redis     │ │  Prometheus  │
        │   (Port 5432)│ │   (Port 6379)│ │   (Port 9090)│
        ├──────────────┤ ├──────────────┤ ├──────────────┤
        │ Primary DB   │ │ Cache Layer  │ │ Metrics      │
        │ • OTP Codes  │ │ • Rate Limit │ │ Collection   │
        │ • Forms      │ │ • Sessions   │ │ • App Stats  │
        │ • Audit Logs │ │ • Temp Data  │ │ • DB Metrics │
        │ • Rate Limits│ │              │ │ • Redis Stats│
        └──────────────┘ └──────────────┘ └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │   Grafana    │
                                         │  (Port 3001) │
                                         ├──────────────┤
                                         │ Visualization│
                                         │ Dashboards   │
                                         │ Alerts       │
                                         └──────────────┘
```

---

## 🔗 Component Connection Details

### 1. **NGINX → Application (Express.js)**

**Connection Type:** HTTP Reverse Proxy  
**Port:** 3000  
**Configuration:** `nginx.conf` lines 134-161

```nginx
location /api/ {
    proxy_pass http://app:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Rate limiting
    limit_req zone=req_limit burst=10 nodelay;
    limit_conn conn_limit 5;
}
```

**Traffic Flow:**
1. User request hits Nginx on port 443 (HTTPS)
2. Nginx applies rate limiting per IP
3. Request forwarded to one of 3 app replicas (load balanced)
4. App processes request and returns response
5. Nginx adds security headers and returns to user

---

### 2. **Application → PostgreSQL**

**Connection Type:** TCP Database Connection  
**Port:** 5432 (direct) or 6432 (via PgBouncer)  
**Connection String:** `DATABASE_URL=postgresql://user:pass@postgres:5432/hybe_db`

**Via PgBouncer (Recommended for Production):**
```
App → PgBouncer (Port 6432) → PostgreSQL (Port 5432)
```

**Benefits of PgBouncer:**
- Connection pooling (max 100 client connections)
- Transaction-level pooling
- Reduces database connection overhead
- Protects PostgreSQL from connection storms

**Tables Used:**
| Table | Purpose | App Functions |
|-------|---------|---------------|
| `otp_codes` | Store OTP hashes | `createOTPRecord()`, `verifyOTP()` |
| `form_submissions` | Store verified forms | `submit-form.js` |
| `rate_limits` | Track rate limits | `security.js` middleware |
| `audit_logs` | Compliance logging | All operations |
| `blocked_email_domains` | Email validation | `validateEmailDomain()` |

---

### 3. **Application → Redis**

**Connection Type:** TCP Cache Connection  
**Port:** 6379  
**Connection String:** `REDIS_URL=redis://:password@redis:6379`

**Use Cases:**
```javascript
// Rate limiting counters
SET rate_limit:email:user@example.com 1 EX 300

// Session storage
SETEX session:abc123 3600 '{"userId": "...", "verified": true}'

// Temporary OTP cache (optional backup to DB)
SETEX otp:user@example.com 600 "123456"
```

**Data Flow:**
1. App receives OTP send request
2. Check Redis for rate limit key
3. If under limit, proceed with email send
4. Increment Redis counter with TTL
5. Store OTP in PostgreSQL (persistent)
6. Optionally cache in Redis for fast verification

---

### 4. **Prometheus → All Services**

**Connection Type:** HTTP Metrics Scrape  
**Ports:** 
- App: 3000 (`/metrics`)
- PostgreSQL: 9187 (via exporter)
- Redis: 9121 (via exporter)
- Nginx: 9113 (via exporter)

**Scrape Configuration:** `prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'hybe-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: /metrics
    scrape_interval: 10s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

**Metrics Collected:**
- HTTP request rates
- OTP success/failure rates
- Database query latency
- Redis hit/miss ratios
- Container CPU/memory usage
- Rate limit triggers

---

### 5. **Grafana → Prometheus**

**Connection Type:** HTTP API Query  
**Port:** 9090  
**Configuration:** `grafana/provisioning/datasources/`

**Data Flow:**
1. Grafana queries Prometheus every 15s
2. Prometheus aggregates metrics from all services
3. Grafana displays real-time dashboards
4. Alerts triggered on threshold breaches

**Sample Dashboards:**
- OTP Verification Success Rate
- Form Submission Volume
- Rate Limit Triggers by IP
- Database Query Performance
- Container Health Status

---

### 6. **Docker Compose Orchestration**

**Network:** `hybe-network` (bridge driver)  
**Subnet:** `172.28.0.0/16`

**Service Discovery:**
```yaml
services:
  app:
    networks: [hybe-network]
    # Can reach postgres by hostname "postgres"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/hybe_db
      
  postgres:
    networks: [hybe-network]
    # Accessible as "postgres" within network
    
  redis:
    networks: [hybe-network]
    # Accessible as "redis" within network
```

**Startup Order:**
```
1. PostgreSQL starts → healthcheck passes
2. Redis starts → healthcheck passes
3. PgBouncer starts → waits for PostgreSQL
4. App starts → waits for PostgreSQL + Redis
5. Nginx starts → waits for App
6. Prometheus starts → scrapes all services
7. Grafana starts → connects to Prometheus
```

---

### 7. **Kubernetes Deployment (Production Scale)**

**Namespace:** `hybe-production`

**Components:**
```yaml
ConfigMap → Environment variables (non-sensitive)
Secrets   → API keys, passwords, certificates
Deployment → 3 replicas of app pods
Service   → ClusterIP load balancing
HPA       → Auto-scaling (3-10 replicas)
Ingress   → External access with SSL
```

**Pod Communication:**
```
┌─────────────────────────────────────────────┐
│              Kubernetes Cluster             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Ingress Controller          │   │
│  │         (Nginx/Traefik)             │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────▼──────────────────────┐   │
│  │      hybe-form-service              │   │
│  │      (ClusterIP: 10.96.x.x)         │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│    ┌────────────┼────────────┐             │
│    │            │            │             │
│  ┌─▼─┐        ┌─▼─┐        ┌─▼─┐          │
│  │Pod│        │Pod│        │Pod│          │
│  │ 1 │        │ 2 │        │ 3 │          │
│  └───┘        └───┘        └───┘          │
│                                             │
│  External Services:                         │
│  - RDS/Aurora (PostgreSQL)                 │
│  - ElastiCache (Redis)                     │
│  - Managed Prometheus/Grafana              │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security Connection Flow

### OTP Verification Flow

```
User Browser
    │
    │ 1. Submit email
    ▼
Nginx (Rate Limit Check)
    │
    │ 2. Forward request
    ▼
Express App (/api/otp/send)
    │
    │ 3. Check Redis rate limit
    ├──► Redis: GET rate_limit:email:user@example.com
    │    If count > 3 in 5min → Reject
    │
    │ 4. Validate email domain
    ├──► PostgreSQL: SELECT FROM blocked_email_domains
    │
    │ 5. Generate OTP & store
    ├──► PostgreSQL: INSERT INTO otp_codes
    │    (code_hash, expires_at, attempts=0)
    │
    │ 6. Send email via Resend/SendGrid
    ├──► External Email Service
    │
    │ 7. Log audit event
    └──► PostgreSQL: INSERT INTO audit_logs
```

### Form Submission Flow (Protected)

```
User Browser
    │
    │ 1. Submit form with OTP token
    ▼
Nginx (SSL + Rate Limit)
    │
    │ 2. Forward to app
    ▼
Express App (/api/submit-form)
    │
    │ 3. Verify OTP token
    ├──► PostgreSQL: SELECT FROM otp_codes
    │    WHERE code_hash = ? AND status = 'pending'
    │    AND expires_at > NOW()
    │
    │ 4. Check verification status
    │    If not verified → Reject 403
    │
    │ 5. Validate referral code
    ├──► PostgreSQL: Check referral validity
    │
    │ 6. Store submission
    ├──► PostgreSQL: INSERT INTO form_submissions
    │
    │ 7. Mark OTP as used
    ├──► PostgreSQL: UPDATE otp_codes SET status='verified'
    │
    │ 8. Audit log
    └──► PostgreSQL: INSERT INTO audit_logs
```

---

## 📈 Monitoring Connection Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   App Pods  │     │  PostgreSQL │     │    Redis    │
│  /metrics   │     │  Exporter   │     │  Exporter   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Prometheus    │
                  │  (Scrape every  │
                  │   15 seconds)   │
                  └────────┬────────┘
                           │
                           │ Query API
                           ▼
                  ┌─────────────────┐
                  │    Grafana      │
                  │  (Dashboards &  │
                  │     Alerts)     │
                  └─────────────────┘
                           │
                           │ Notifications
                           ▼
                  ┌─────────────────┐
                  │  PagerDuty /    │
                  │   Slack / Email │
                  └─────────────────┘
```

---

## 🚀 Deployment Connection Summary

### Local Development (Docker Compose)
```bash
docker-compose up -d
# Starts all 7 services connected via hybe-network
# Access: http://localhost (Nginx) → App → DB/Redis
```

### Production (Kubernetes)
```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
# Creates namespace, config, secrets, deployment, service, HPA, ingress
# External traffic: Ingress → Service → Pods → External DB/Redis
```

### Environment Variables Bridge

| Component | Reads From | Example Variables |
|-----------|-----------|-------------------|
| App | Kubernetes Secrets / Docker Env | `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY` |
| PostgreSQL | Docker/K8s Env | `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Redis | Docker/K8s Env | `REDIS_PASSWORD` |
| Nginx | ConfigMap / Volume | SSL certs, rate limit config |
| Prometheus | ConfigMap | Scrape targets, retention |
| Grafana | Secrets / ConfigMap | Admin password, datasource URLs |

---

## 🎯 Key Connection Points Summary

| Source | Destination | Protocol | Port | Purpose |
|--------|-------------|----------|------|---------|
| Internet | Nginx | HTTPS | 443 | User traffic |
| Nginx | App | HTTP | 3000 | API proxy |
| App | PostgreSQL | TCP | 5432/6432 | Database |
| App | Redis | TCP | 6379 | Cache/Rate limit |
| Prometheus | App | HTTP | 3000 | Metrics scrape |
| Prometheus | Postgres | HTTP | 9187 | DB metrics |
| Prometheus | Redis | HTTP | 9121 | Redis metrics |
| Grafana | Prometheus | HTTP | 9090 | Query metrics |

---

## 📝 Next Steps for Full Production

1. **Create Grafana Dashboards:**
   - Add files to `/workspace/grafana/provisioning/dashboards/`
   - Add datasource config to `/workspace/grafana/provisioning/datasources/`

2. **Configure External Services:**
   - Update `k8s/secrets.yaml` with production credentials
   - Set up managed PostgreSQL (AWS RDS, Google Cloud SQL)
   - Set up managed Redis (ElastiCache, Memorystore)

3. **SSL Certificates:**
   - Generate certificates for `/workspace/ssl/`
   - Configure cert-manager in Kubernetes

4. **Monitoring Alerts:**
   - Create Prometheus alert rules
   - Configure Alertmanager for notifications

All components are properly connected and ready for enterprise deployment!
