# ==============================================================================

# SearchWithEmbeddings - Local Development & PM2 Deployment Guide

# ==============================================================================

## Overview

This guide covers:

1. **Local Development Setup** - Run and develop locally with hot-reload
2. **PM2 Monitoring** - Process management and monitoring
3. **Deployment Workflow** - Push local changes to production
4. **Resource Optimization** - Maximum efficiency

---

## 1. Local Development Setup

### Prerequisites

- Node.js 18+ LTS
- Docker Desktop
- Git

### Quick Start (Windows)

```batch
# Double-click or run in terminal:
start-dev.bat
```

### Quick Start (Linux/Mac)

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Manual Setup

```bash
# 1. Start Docker services (optimized for local dev)
docker-compose -f docker-compose.dev.yml up -d

# 2. Wait for services to be healthy
docker-compose -f docker-compose.dev.yml ps

# 3. Install app dependencies
cd app
npm install

# 4. Initialize database
npx prisma db push
npx prisma db seed  # Optional: seed test data

# 5. Start with PM2
cd ..
npm install -g pm2
pm2 start ecosystem.config.json

# 6. Open http://localhost:3000
```

### Development Commands

| Command                           | Description                      |
| --------------------------------- | -------------------------------- |
| `pm2 start ecosystem.config.json` | Start app with PM2               |
| `pm2 logs`                        | View live logs                   |
| `pm2 monit`                       | Interactive monitoring dashboard |
| `pm2 restart cenadi-app`          | Restart app                      |
| `pm2 stop cenadi-app`             | Stop app                         |
| `pm2 delete cenadi-app`           | Remove from PM2                  |

### Hot Reload

The development setup supports hot-reload:

- **Next.js**: Auto-reloads on file changes
- **Indexer**: Mount volume in docker-compose.dev.yml, restart container to apply

---

## 2. PM2 Monitoring

### Install PM2

```bash
npm install -g pm2
```

### Basic Commands

```bash
# Start application
pm2 start ecosystem.config.json

# View status
pm2 status

# View logs (live)
pm2 logs
pm2 logs cenadi-app --lines 100

# Interactive monitoring
pm2 monit

# Restart
pm2 restart cenadi-app
pm2 reload cenadi-app  # Zero-downtime restart

# Stop
pm2 stop cenadi-app

# Delete from PM2
pm2 delete cenadi-app
```

### PM2 Dashboard

```bash
# Terminal-based dashboard
pm2 monit

# Web-based dashboard (PM2 Plus - optional paid)
pm2 plus
```

### Memory & CPU Monitoring

```bash
# Show detailed info
pm2 show cenadi-app

# Show metrics
pm2 describe cenadi-app

# Reset metrics
pm2 reset cenadi-app
```

### Auto-restart on crash

PM2 automatically restarts if the app crashes. Configured in ecosystem.config.json:

- `max_memory_restart: "500M"` - Restart if memory exceeds 500MB
- `autorestart: true` - Auto restart on crash

---

## 3. Deployment Workflow (Local → Production)

### One-Time Setup on Server

```bash
# On your Ubuntu server:

# 1. Install PM2
npm install -g pm2

# 2. Setup PM2 deployment
pm2 deploy ecosystem.production.config.js production setup
```

### Deploy from Local Machine

**Option A: Quick Deploy Script**

```batch
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

**Option B: Manual Steps**

```bash
# 1. Commit your changes
git add -A
git commit -m "Your changes"

# 2. Push to GitHub
git push origin main

# 3. Deploy with PM2
pm2 deploy ecosystem.production.config.js production
```

### Update Production

```bash
# After making local changes:
git add -A
git commit -m "Fix: your changes"
git push origin main
pm2 deploy ecosystem.production.config.js production update
```

### Rollback

```bash
# Revert to previous deployment
pm2 deploy ecosystem.production.config.js production revert 1
```

### Configure Deployment

Edit `ecosystem.production.config.js`:

```javascript
deploy: {
  production: {
    user: 'deploy',           // SSH user
    host: ['192.168.1.100'],  // Server IP
    repo: 'git@github.com:LaurentJoel/SearchWithEmbeddings.git',
    ref: 'origin/main',       // Branch
    path: '/opt/cenadi',      // Remote path
    // ...
  }
}
```

---

## 4. Resource Optimization (Maximum Efficiency)

### A. Docker Resource Limits

**Development (docker-compose.dev.yml)**
| Service | CPU | Memory | Notes |
|------------|-------|--------|-------|
| etcd | 0.25 | 256MB | Minimal for dev |
| minio | 0.25 | 256MB | Minimal for dev |
| milvus | 1.0 | 2GB | Needs minimum 2GB |
| postgres | 0.5 | 256MB | Light workload |
| indexer | 1.0 | 2GB | Embedding model |
| **Total** | 3.0 | ~5GB | |

**Production (docker-compose.prod.yml)**
| Service | CPU | Memory | Notes |
|------------|-------|--------|-------|
| etcd | 0.5 | 512MB | |
| minio | 0.5 | 512MB | |
| milvus | 2.0 | 4GB | Scale with data |
| postgres | 1.0 | 1GB | Tuned settings |
| indexer | 2.0 | 3GB | Multiple workers |
| app | 1.0 | 1GB | PM2 cluster mode |
| nginx | 0.5 | 256MB | |
| **Total** | 7.5 | ~10GB | |

### B. Next.js Optimizations (Already Applied)

```javascript
// next.config.mjs
{
  compress: true,                    // Gzip compression
  productionBrowserSourceMaps: false, // Smaller bundles
  poweredByHeader: false,            // Security
  optimizeFonts: true,               // Font optimization
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree shake icons
  },
  images: {
    formats: ['image/webp', 'image/avif'], // Modern formats
  }
}
```

### C. PostgreSQL Tuning

```yaml
# In docker-compose
command:
  - "-c"
  - "shared_buffers=256MB" # 25% of RAM
  - "-c"
  - "effective_cache_size=768MB" # 75% of RAM
  - "-c"
  - "work_mem=4MB" # Per operation
  - "-c"
  - "maintenance_work_mem=64MB"
  - "-c"
  - "random_page_cost=1.1" # SSD optimization
```

### D. Milvus Optimization

```yaml
environment:
  # Reduce segment size for faster indexing
  MILVUS_DATACOORD_SEGMENT_MAXSIZE: 256 # MB, default 512

  # Increase for large responses
  MILVUS_QUERYNODE_GRPC_CLIENTMAXRECVMSGSIZE: 104857600
```

### E. Indexer Optimization

```dockerfile
# Use multiple workers
CMD ["uvicorn", "main:app", "--workers", "2", "--no-access-log"]
```

### F. Client-Side Optimizations

**1. Lazy Loading (Already in DocumentViewer)**

```typescript
// Load PDF pages on demand, not all at once
const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
```

**2. Debounced Search (Already implemented)**

```typescript
// Don't search on every keystroke
const debouncedQuery = useDebounce(query, 300);
```

**3. Virtualized Lists (For large result sets)**

```bash
npm install @tanstack/react-virtual
```

### G. Caching Strategies

**1. API Response Caching**

```typescript
// In API routes
export const revalidate = 60; // Cache for 60 seconds
```

**2. Static Generation**

```typescript
// For pages that don't change often
export const dynamic = "force-static";
```

**3. Client-Side Caching**

```typescript
// Use SWR or React Query
import useSWR from "swr";
const { data } = useSWR("/api/stats", fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000,
});
```

---

## 5. Monitoring in Production

### PM2 Monitoring

```bash
# On server
pm2 monit

# View metrics
pm2 show cenadi-app
```

### Docker Monitoring

```bash
# Resource usage
docker stats

# Container-specific
docker stats swe-milvus swe-indexer swe-app
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Nginx access logs
tail -f /opt/cenadi/nginx/logs/access.log
```

### Health Checks

```bash
# Run health check script
/opt/cenadi/healthcheck.sh

# Check individual services
curl http://localhost:3000/api/health
curl http://localhost:8000/health
```

---

## 6. Troubleshooting

### App Won't Start

```bash
# Check PM2 logs
pm2 logs cenadi-app --lines 200

# Check if port is in use
netstat -tulpn | grep 3000
```

### Docker Services Unhealthy

```bash
# Check specific service
docker logs swe-milvus

# Restart services
docker-compose -f docker-compose.dev.yml restart milvus
```

### Memory Issues

```bash
# Check memory usage
docker stats
pm2 monit

# Restart to free memory
pm2 restart cenadi-app
docker-compose -f docker-compose.dev.yml restart
```

### Deployment Fails

```bash
# Check SSH connection
ssh deploy@YOUR_SERVER_IP

# Manual deploy
git pull origin main
cd app && npm ci && npm run build
pm2 restart cenadi-app
```

---

## Quick Reference

### Development

```bash
# Start everything
start-dev.bat  # Windows
./start-dev.sh # Linux/Mac

# View logs
pm2 logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Deployment

```bash
# Quick deploy
deploy.bat  # Windows
./deploy.sh # Linux/Mac

# Manual deploy
git push origin main
pm2 deploy ecosystem.production.config.js production
```

### Monitoring

```bash
pm2 monit        # PM2 dashboard
pm2 status       # Quick status
docker stats     # Docker resources
```
