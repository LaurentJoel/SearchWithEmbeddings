# 🚀 SSH Deployment Guide - Ubuntu Production Server

This is a complete step-by-step guide to deploy the SearchWithEmbeddings application on an Ubuntu server via SSH.

## 🎯 Recommended Approach

**Build Docker images locally → Transfer to server → Monitor with PM2**

This approach is:

- ⚡ **Faster** - No building on server
- 💾 **Resource-efficient** - Server doesn't need build dependencies
- 📊 **Better monitoring** - PM2 provides real-time logs and dashboard

---

## 📋 Prerequisites

Before starting, ensure you have:

- Ubuntu 20.04 LTS or 22.04 LTS server
- SSH access with sudo privileges
- Minimum 8GB RAM (16GB recommended)
- 50GB+ disk space
- Domain name (optional, for SSL)

---

## 🔐 Step 1: Connect to Your Server

```bash
# From your local machine (Windows/Mac/Linux)
ssh your_username@your_server_ip

# Or with a specific SSH key
ssh -i ~/.ssh/your_key.pem your_username@your_server_ip
```

---

## 🔄 Step 2: Update System & Install Dependencies

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    htop \
    unzip

# Create a non-root user (if you're root)
# sudo adduser appuser
# sudo usermod -aG sudo appuser
# su - appuser
```

---

## 🐳 Step 3: Install Docker

```bash
# Remove old Docker versions (if any)
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group (avoid using sudo for docker)
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

---

## 📁 Step 4: Create Application Directory

```bash
# Create app directory
sudo mkdir -p /opt/search-app
sudo chown $USER:$USER /opt/search-app

# Navigate to app directory
cd /opt/search-app
```

---

## 📦 Step 5: Transfer Application Files

### Option A: Build & Transfer Docker Images (FASTEST - Recommended)

Build images locally on your Windows machine and transfer them to the server. No need to build on the server!

#### Step 1: Build images locally (on your Windows machine)

```powershell
# Open PowerShell on your LOCAL machine
cd C:\Users\laure\Desktop\SearchWithEmbeddings

# Build the app image
docker build -t search-app:latest ./app

# Build the indexer image
docker build -t search-indexer:latest ./indexer

# Verify images were created
docker images | findstr search
```

#### Step 2: Save images to files

```powershell
# Save images as tar files (this may take a few minutes)
docker save search-app:latest -o search-app-image.tar
docker save search-indexer:latest -o search-indexer-image.tar

# Check file sizes (app ~1-2GB, indexer ~3-4GB)
dir *.tar
```

#### Step 3: Transfer images to server

```powershell
# Upload images to server via SCP
scp search-app-image.tar your_username@your_server_ip:/opt/search-app/
scp search-indexer-image.tar your_username@your_server_ip:/opt/search-app/

# Also upload docker-compose and config files
scp docker-compose.prod.yml your_username@your_server_ip:/opt/search-app/
scp .env your_username@your_server_ip:/opt/search-app/
scp -r nginx your_username@your_server_ip:/opt/search-app/
```

#### Step 4: Load images on server

```bash
# SSH into your server
ssh your_username@your_server_ip

# Navigate to app directory
cd /opt/search-app

# Load the Docker images (this is MUCH faster than building!)
docker load -i search-app-image.tar
docker load -i search-indexer-image.tar

# Verify images are loaded
docker images | grep search

# Clean up tar files to save disk space
rm search-app-image.tar search-indexer-image.tar
```

#### Step 5: Update docker-compose to use local images

```bash
# Edit docker-compose.prod.yml to use the loaded images
nano docker-compose.prod.yml
```

Change the `app` and `indexer` services from `build:` to `image:`:

```yaml
services:
  app:
    image: search-app:latest # Use local image instead of build
    # build:                    # Comment out or remove build section
    #   context: ./app
    #   dockerfile: Dockerfile
    container_name: search-app
    restart: unless-stopped
    # ... rest of config

  indexer:
    image: search-indexer:latest # Use local image instead of build
    # build:                      # Comment out or remove build section
    #   context: ./indexer
    #   dockerfile: Dockerfile
    container_name: search-indexer
    restart: unless-stopped
    # ... rest of config
```

#### Step 6: Start containers

```bash
# Start all services (no building needed - instant start!)
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps
```

---

### Option B: Clone from Git Repository

```bash
# If your code is in a Git repository
git clone https://github.com/yourusername/SearchWithEmbeddings.git .

# Or if private repo, use token
git clone https://your_token@github.com/yourusername/SearchWithEmbeddings.git .
```

### Option C: Upload via SCP (From your local machine)

```powershell
# Run this from your LOCAL Windows machine in PowerShell
cd C:\Users\laure\Desktop

# Compress the folder first (excluding unnecessary files)
tar -cvzf search-app.tar.gz --exclude='node_modules' --exclude='.next' --exclude='__pycache__' --exclude='*.pyc' --exclude='.git' SearchWithEmbeddings

# Upload to server
scp search-app.tar.gz your_username@your_server_ip:/opt/search-app/
```

```bash
# On the SERVER, extract the files
cd /opt/search-app
tar -xvzf search-app.tar.gz --strip-components=1
rm search-app.tar.gz
```

### Option C: Use SFTP (FileZilla, WinSCP)

1. Connect to your server using SFTP
2. Navigate to `/opt/search-app/`
3. Upload all files from `C:\Users\laure\Desktop\SearchWithEmbeddings\`

---

## ⚙️ Step 6: Configure Environment Variables

```bash
# Create production environment file
cd /opt/search-app
nano .env
```

Paste the following content (modify values as needed):

```env
# ===========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ===========================================

# Node Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Application URL (change to your domain or IP)
NEXT_PUBLIC_API_URL=http://your_server_ip:3000
# Or with domain: NEXT_PUBLIC_API_URL=https://search.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://searchuser:YourSecurePassword123!@postgres:5432/searchdb?schema=public
POSTGRES_USER=searchuser
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=searchdb

# Authentication Secret (generate a secure random string)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Milvus Configuration
MILVUS_HOST=milvus-standalone
MILVUS_PORT=19530

# Document paths (inside containers)
DOCUMENTS_PATH=/app/documents
UPLOAD_PATH=/app/uploads

# Indexer Configuration
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
BATCH_SIZE=32
OCR_ENABLED=true

# Optional: Analytics
# GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

---

## 🔒 Step 7: Set Up SSL Certificates (Optional but Recommended)

### Option A: Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d search.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/search.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/search.yourdomain.com/privkey.pem

# Create directory for certs in app
mkdir -p /opt/search-app/nginx/certs

# Copy certificates (or create symlinks)
sudo cp /etc/letsencrypt/live/search.yourdomain.com/fullchain.pem /opt/search-app/nginx/certs/
sudo cp /etc/letsencrypt/live/search.yourdomain.com/privkey.pem /opt/search-app/nginx/certs/
sudo chown $USER:$USER /opt/search-app/nginx/certs/*
```

### Option B: Self-Signed Certificate (For Testing)

```bash
# Create certs directory
mkdir -p /opt/search-app/nginx/certs
cd /opt/search-app/nginx/certs

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=localhost/O=SearchApp/C=FR"

cd /opt/search-app
```

---

## 📝 Step 8: Create Production Docker Compose File

```bash
# Create or verify docker-compose.prod.yml exists
nano docker-compose.prod.yml
```

If it doesn't exist, create it with this content:

```yaml
version: "3.8"

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: search-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - search-network

  # Next.js Application
  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: search-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - MILVUS_HOST=${MILVUS_HOST}
      - MILVUS_PORT=${MILVUS_PORT}
    volumes:
      - ./documents:/app/documents:ro
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      milvus-standalone:
        condition: service_started
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2"
    networks:
      - search-network

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: search-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1"
    networks:
      - search-network

  # Milvus Dependencies
  etcd:
    image: quay.io/coreos/etcd:v3.5.5
    container_name: search-etcd
    restart: unless-stopped
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - etcd_data:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    networks:
      - search-network

  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: search-minio
    restart: unless-stopped
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    networks:
      - search-network

  # Milvus Vector Database
  milvus-standalone:
    image: milvusdb/milvus:v2.4.0
    container_name: search-milvus
    restart: unless-stopped
    command: ["milvus", "run", "standalone"]
    security_opt:
      - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - milvus_data:/var/lib/milvus
    depends_on:
      - etcd
      - minio
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2"
    networks:
      - search-network

  # Python Indexer Service
  indexer:
    build:
      context: ./indexer
      dockerfile: Dockerfile
    container_name: search-indexer
    restart: unless-stopped
    environment:
      - MILVUS_HOST=${MILVUS_HOST}
      - MILVUS_PORT=${MILVUS_PORT}
      - DOCUMENTS_PATH=/app/documents
      - UPLOAD_PATH=/app/uploads
      - DATABASE_URL=${DATABASE_URL}
      - EMBEDDING_MODEL=${EMBEDDING_MODEL:-paraphrase-multilingual-MiniLM-L12-v2}
    volumes:
      - ./documents:/app/documents:ro
      - ./uploads:/app/uploads
    depends_on:
      - milvus-standalone
      - postgres
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2"
    networks:
      - search-network

networks:
  search-network:
    driver: bridge

volumes:
  postgres_data:
  etcd_data:
  minio_data:
  milvus_data:
```

Save and exit.

---

## 🌐 Step 9: Create Nginx Configuration

```bash
# Create nginx directory
mkdir -p /opt/search-app/nginx

# Create nginx config
nano /opt/search-app/nginx/nginx.conf
```

Paste this configuration:

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream
    upstream nextjs {
        server app:3000;
        keepalive 32;
    }

    # HTTP -> HTTPS redirect (uncomment if using SSL)
    # server {
    #     listen 80;
    #     server_name _;
    #     return 301 https://$host$request_uri;
    # }

    server {
        listen 80;
        # listen 443 ssl http2;  # Uncomment for SSL
        server_name _;

        # SSL Configuration (uncomment if using SSL)
        # ssl_certificate /etc/nginx/certs/fullchain.pem;
        # ssl_certificate_key /etc/nginx/certs/privkey.pem;
        # ssl_protocols TLSv1.2 TLSv1.3;
        # ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        # ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=3 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /_next/static/ {
            proxy_pass http://nextjs;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        # Default
        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

Save and exit.

---

## 🚀 Step 10: Launch the Application

```bash
cd /opt/search-app

# Create base document directories (subfolders are created automatically by the app)
mkdir -p documents uploads

# If using pre-built images (Option A - Recommended):
docker compose -f docker-compose.prod.yml up -d

# If building on server:
# docker compose -f docker-compose.prod.yml pull
# docker compose -f docker-compose.prod.yml build --no-cache
# docker compose -f docker-compose.prod.yml up -d

# Watch the logs (optional)
docker compose -f docker-compose.prod.yml logs -f
```

> **Note:** Division subfolders (like `documents/DSI/`, `documents/DEL/`) are created automatically when users upload documents.

---

## ✅ Step 11: Verify Deployment

```bash
# Check all containers are running
docker ps

# Expected output - all containers should show "Up"
# CONTAINER ID   IMAGE                        STATUS
# xxxx           search-nginx                 Up
# xxxx           search-app                   Up
# xxxx           search-indexer               Up
# xxxx           search-milvus                Up
# xxxx           search-postgres              Up
# xxxx           search-etcd                  Up
# xxxx           search-minio                 Up

# Check application health
curl http://localhost/health

# Check app logs
docker logs search-app

# Check indexer logs
docker logs search-indexer
```

---

## 🌍 Step 12: Access Your Application

Open your web browser and navigate to:

- **HTTP**: `http://your_server_ip`
- **HTTPS** (if configured): `https://your_server_ip` or `https://search.yourdomain.com`

---

## 🔧 Step 13: Set Up Automatic Startup

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Create systemd service for the app (optional)
sudo nano /etc/systemd/system/search-app.service
```

Paste:

```ini
[Unit]
Description=Search Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/search-app
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable search-app.service
```

---

## 📊 Step 14: Set Up Monitoring (Optional)

```bash
# Install monitoring tools
sudo apt install -y htop iotop

# View resource usage
htop

# Monitor Docker resources
docker stats

# Check disk usage
df -h

# Check memory
free -m
```

---

## 🔄 Step 15: Configure Firewall

```bash
# Install UFW if not present
sudo apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📝 Common Operations

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f indexer
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart app
```

### Stop Application

```bash
docker compose -f docker-compose.prod.yml down
```

### Update Application

```bash
cd /opt/search-app

# Pull latest changes (if using Git)
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Backup Database

```bash
# Create backup
docker exec search-postgres pg_dump -U searchuser searchdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i search-postgres psql -U searchuser searchdb < backup_file.sql
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (careful!)
docker volume prune

# Full cleanup
docker system prune -a
```

---

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs app

# Check for port conflicts
sudo netstat -tlnp | grep -E '80|443|3000'
```

### Database connection issues

```bash
# Check postgres is running
docker exec search-postgres pg_isready

# Check environment variables
docker exec search-app env | grep DATABASE
```

### Milvus issues

```bash
# Check milvus logs
docker logs search-milvus

# Ensure dependencies are running
docker logs search-etcd
docker logs search-minio
```

### Out of memory

```bash
# Check memory usage
free -m
docker stats

# Increase swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🔷 Alternative: PM2 Deployment (Recommended for Better Monitoring)

PM2 provides **superior log monitoring**, automatic restarts, cluster mode, and a beautiful dashboard. Use this method for production deployments that require advanced monitoring.

### Step PM2-1: Install Node.js and PM2

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x

# Install PM2 globally
sudo npm install -g pm2

# Verify PM2
pm2 --version
```

### Step PM2-2: Install Python for Indexer

```bash
# Install Python 3.11 and pip
sudo apt install -y python3.11 python3.11-venv python3-pip

# Create virtual environment for indexer
cd /opt/search-app/indexer
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Step PM2-3: Create PM2 Ecosystem File

```bash
cd /opt/search-app
nano ecosystem.config.js
```

Paste this configuration:

```javascript
module.exports = {
  apps: [
    // =============================================
    // Next.js Application (Cluster Mode)
    // =============================================
    {
      name: "search-app",
      cwd: "/opt/search-app/app",
      script: "node_modules/.bin/next",
      args: "start",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster", // Enable clustering
      watch: false,
      max_memory_restart: "1G",

      // Environment
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Logging - IMPORTANT FOR MONITORING
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/search-app/logs/app-error.log",
      out_file: "/opt/search-app/logs/app-out.log",
      merge_logs: true,

      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },

    // =============================================
    // Python Indexer Service
    // =============================================
    {
      name: "search-indexer",
      cwd: "/opt/search-app/indexer",
      script: "venv/bin/python",
      args: "main.py",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "2G",

      // Environment
      env: {
        MILVUS_HOST: "localhost",
        MILVUS_PORT: "19530",
        DOCUMENTS_PATH: "/opt/search-app/documents",
        UPLOAD_PATH: "/opt/search-app/uploads",
        DATABASE_URL:
          "postgresql://searchuser:YourSecurePassword123!@localhost:5432/searchdb",
        EMBEDDING_MODEL: "paraphrase-multilingual-MiniLM-L12-v2",
      },

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/search-app/logs/indexer-error.log",
      out_file: "/opt/search-app/logs/indexer-out.log",
      merge_logs: true,

      // Auto-restart
      autorestart: true,
      max_restarts: 5,
      min_uptime: "30s",
      restart_delay: 10000,
    },
  ],
};
```

Save and exit.

### Step PM2-4: Create Logs Directory

```bash
mkdir -p /opt/search-app/logs
```

### Step PM2-5: Build the Next.js App

```bash
cd /opt/search-app/app

# Install dependencies
npm ci --production=false

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Build for production
npm run build
```

### Step PM2-6: Start Infrastructure with Docker (DB + Milvus only)

Create a minimal Docker Compose for just the databases:

```bash
nano /opt/search-app/docker-compose.infra.yml
```

```yaml
version: "3.8"

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: search-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=searchuser
      - POSTGRES_PASSWORD=YourSecurePassword123!
      - POSTGRES_DB=searchdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U searchuser -d searchdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Milvus Dependencies
  etcd:
    image: quay.io/coreos/etcd:v3.5.5
    container_name: search-etcd
    restart: unless-stopped
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
    volumes:
      - etcd_data:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd

  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: search-minio
    restart: unless-stopped
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Milvus Vector Database
  milvus-standalone:
    image: milvusdb/milvus:v2.4.0
    container_name: search-milvus
    restart: unless-stopped
    ports:
      - "19530:19530"
      - "9091:9091"
    command: ["milvus", "run", "standalone"]
    security_opt:
      - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - milvus_data:/var/lib/milvus
    depends_on:
      - etcd
      - minio

volumes:
  postgres_data:
  etcd_data:
  minio_data:
  milvus_data:
```

Start the infrastructure:

```bash
docker compose -f docker-compose.infra.yml up -d
```

### Step PM2-7: Start Applications with PM2

```bash
cd /opt/search-app

# Start all applications
pm2 start ecosystem.config.js

# Save PM2 process list (for auto-start on reboot)
pm2 save

# Set PM2 to start on boot
pm2 startup systemd
# Run the command it outputs (with sudo)
```

---

## 📊 PM2 Monitoring Commands

### Real-time Monitoring Dashboard

```bash
# Beautiful real-time dashboard
pm2 monit
```

This shows:

- 📈 CPU usage per process
- 💾 Memory usage per process
- 📝 Live log streaming
- 🔄 Restart count
- ⏱️ Uptime

### Log Management

```bash
# View all logs in real-time (RECOMMENDED)
pm2 logs

# View specific app logs
pm2 logs search-app
pm2 logs search-indexer

# View last 100 lines
pm2 logs --lines 100

# View only error logs
pm2 logs --err

# Clear all logs
pm2 flush
```

### Process Management

```bash
# List all processes with status
pm2 list

# Detailed process info
pm2 show search-app
pm2 show search-indexer

# Restart processes
pm2 restart all
pm2 restart search-app
pm2 restart search-indexer

# Stop processes
pm2 stop all
pm2 stop search-app

# Delete processes
pm2 delete all

# Reload with zero downtime
pm2 reload search-app
```

### Performance Metrics

```bash
# Detailed metrics
pm2 describe search-app

# JSON status (for scripting)
pm2 jlist

# Monitoring info
pm2 info search-app
```

---

## 🌐 PM2 Web Dashboard (Optional)

For a beautiful web-based dashboard, use PM2 Plus:

```bash
# Link to PM2 Plus (free tier available)
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Or use pm2-web for self-hosted dashboard
npm install -g pm2-web
pm2-web --port 9000
```

Access at: `http://your_server_ip:9000`

---

## 🔄 PM2 Auto-Restart on File Changes (Development)

For development, you can enable file watching:

```bash
# Watch for changes and auto-restart
pm2 start ecosystem.config.js --watch
```

---

## 📋 PM2 Quick Reference

| Command           | Description             |
| ----------------- | ----------------------- |
| `pm2 monit`       | Real-time dashboard     |
| `pm2 logs`        | Stream all logs         |
| `pm2 logs --err`  | Stream error logs only  |
| `pm2 list`        | List all processes      |
| `pm2 restart all` | Restart all processes   |
| `pm2 reload all`  | Zero-downtime reload    |
| `pm2 stop all`    | Stop all processes      |
| `pm2 delete all`  | Remove all processes    |
| `pm2 save`        | Save process list       |
| `pm2 resurrect`   | Restore saved processes |
| `pm2 flush`       | Clear all logs          |

---

## 🎉 Deployment Complete!

Your SearchWithEmbeddings application is now running in production on Ubuntu!

### If using Docker (Full Container Deployment):

**Quick Reference:**

- App URL: `http://your_server_ip` or `https://your_domain`
- Logs: `docker compose -f docker-compose.prod.yml logs -f`
- Restart: `docker compose -f docker-compose.prod.yml restart`
- Stop: `docker compose -f docker-compose.prod.yml down`

### If using PM2 (Recommended for Monitoring):

**Quick Reference:**

- App URL: `http://your_server_ip:3000` or via Nginx
- Logs: `pm2 logs` or `pm2 monit`
- Restart: `pm2 restart all`
- Stop: `pm2 stop all`
- Dashboard: `pm2 monit`

---

## 📞 Support Checklist

If you encounter issues, verify:

1. ✅ All containers are running (`docker ps`)
2. ✅ Environment variables are set (`.env` file)
3. ✅ Ports 80/443 are open in firewall
4. ✅ Sufficient disk space (`df -h`)
5. ✅ Sufficient memory (`free -m`)
6. ✅ Docker service is running (`systemctl status docker`)
