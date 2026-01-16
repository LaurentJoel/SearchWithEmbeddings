# ==============================================================================

# SearchWithEmbeddings - Ubuntu Production Deployment Guide

# ==============================================================================

## Prerequisites

- Ubuntu 20.04 LTS or 22.04 LTS (recommended)
- Minimum 8GB RAM (16GB recommended for Milvus)
- Minimum 4 CPU cores
- 50GB+ disk space
- Domain name pointing to server IP

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/LaurentJoel/SearchWithEmbeddings.git
cd SearchWithEmbeddings

# 2. Run the deployment script (as root)
sudo bash scripts/deploy-ubuntu.sh

# 3. Copy files to /opt/cenadi
sudo cp -r . /opt/cenadi/
cd /opt/cenadi

# 4. Configure environment
sudo cp .env.production.example .env
sudo nano .env  # Edit with your production values

# 5. Set up SSL (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# 6. Start the application
sudo docker compose -f docker-compose.prod.yml up -d

# 7. Initialize database
sudo docker exec swe-app npx prisma db push
```

## Resource Requirements

| Service    | Min RAM  | Recommended RAM | CPU |
| ---------- | -------- | --------------- | --- |
| Milvus     | 2GB      | 4GB             | 2   |
| Indexer    | 1GB      | 3GB             | 2   |
| PostgreSQL | 512MB    | 1GB             | 1   |
| App        | 512MB    | 1GB             | 1   |
| Nginx      | 64MB     | 256MB           | 0.5 |
| **Total**  | **~5GB** | **~10GB**       | 6.5 |

## Configuration Files

### 1. Environment Variables (.env)

```bash
# Database - Use strong passwords!
POSTGRES_USER=cenadi_prod
POSTGRES_PASSWORD=<generate-with-openssl-rand-base64-32>
POSTGRES_DB=cenadi_search

# Auth - Generate secret with: openssl rand -base64 64
NEXTAUTH_SECRET=<your-64-char-secret>
NEXTAUTH_URL=https://your-domain.com

# MinIO (internal storage)
MINIO_ACCESS_KEY=<your-access-key>
MINIO_SECRET_KEY=<generate-with-openssl-rand-base64-32>

# Paths
UPLOAD_DIRECTORY=/opt/cenadi/documents
```

### 2. SSL Certificate Setup

**Option A: Let's Encrypt (Recommended)**

```bash
# Stop nginx first if running
sudo docker stop swe-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy to nginx ssl folder
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && docker restart swe-nginx
```

**Option B: Self-Signed (Development/Testing)**

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## Management Commands

### Start/Stop Services

```bash
# Start all services
sudo docker compose -f docker-compose.prod.yml up -d

# Stop all services
sudo docker compose -f docker-compose.prod.yml down

# Restart a specific service
sudo docker compose -f docker-compose.prod.yml restart app

# View logs
sudo docker compose -f docker-compose.prod.yml logs -f app
sudo docker compose -f docker-compose.prod.yml logs -f indexer
```

### Using Systemd Service

```bash
# Start
sudo systemctl start cenadi-search

# Stop
sudo systemctl stop cenadi-search

# Check status
sudo systemctl status cenadi-search

# Enable auto-start on boot
sudo systemctl enable cenadi-search
```

### Health Checks

```bash
# Run health check script
sudo /opt/cenadi/healthcheck.sh

# Check individual container
sudo docker inspect --format='{{.State.Health.Status}}' swe-app
```

### Backups

```bash
# Manual backup
sudo /opt/cenadi/backup.sh

# Backups are stored in /opt/cenadi/backups/
# Auto-backup runs daily at 2 AM via cron
```

### Database Operations

```bash
# Run migrations
sudo docker exec swe-app npx prisma db push

# Create admin user (modify seed.ts first)
sudo docker exec swe-app npx prisma db seed

# PostgreSQL shell
sudo docker exec -it swe-postgres psql -U cenadi_prod -d cenadi_search
```

## Performance Tuning

### For High Traffic (>1000 users)

1. **Increase PostgreSQL connections** in `docker-compose.prod.yml`:

```yaml
command:
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=512MB"
```

2. **Scale app containers**:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --scale app=3
```

3. **Add Redis caching** (optional):

```yaml
redis:
  image: redis:7-alpine
  container_name: swe-redis
  networks:
    - swe-network
```

### Memory Optimization

If running on limited RAM (8GB):

```yaml
# In docker-compose.prod.yml, reduce Milvus memory:
milvus:
  deploy:
    resources:
      limits:
        memory: 2G
```

## Troubleshooting

### Common Issues

**1. Milvus fails to start**

```bash
# Check logs
sudo docker logs swe-milvus

# Ensure etcd and minio are healthy first
sudo docker logs swe-etcd
sudo docker logs swe-minio
```

**2. App can't connect to database**

```bash
# Check PostgreSQL is running
sudo docker exec swe-postgres pg_isready

# Verify DATABASE_URL in .env
# Format: postgresql://USER:PASSWORD@postgres:5432/DATABASE
```

**3. Indexer memory issues**

```bash
# Check memory usage
sudo docker stats swe-indexer

# Reduce workers if needed (in docker-compose.prod.yml)
environment:
  - WORKERS=1
```

**4. SSL certificate errors**

```bash
# Verify certificates exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep "Not After"
```

### Logs Location

| Service    | Command                                 |
| ---------- | --------------------------------------- |
| App        | `docker logs swe-app`                   |
| Indexer    | `docker logs swe-indexer`               |
| PostgreSQL | `docker logs swe-postgres`              |
| Milvus     | `docker logs swe-milvus`                |
| Nginx      | `cat /opt/cenadi/nginx/logs/access.log` |

## Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set up SSL/TLS certificates
- [ ] Enable UFW firewall (only ports 22, 80, 443)
- [ ] Configure fail2ban for SSH
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Set up automated backups
- [ ] Monitor disk space and logs
- [ ] Review nginx access logs for suspicious activity

## Monitoring (Optional)

Add Prometheus + Grafana for monitoring:

```yaml
# Add to docker-compose.prod.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  networks:
    - swe-network

grafana:
  image: grafana/grafana:latest
  ports:
    - "127.0.0.1:3001:3000"
  networks:
    - swe-network
```

## Support

For issues, check:

1. Container logs: `docker logs <container-name>`
2. System resources: `htop`, `df -h`
3. Network: `docker network inspect swe-network`
