#!/bin/bash
# ==============================================================================
# SearchWithEmbeddings - Ubuntu Deployment Script
# ==============================================================================
# This script sets up the complete production environment on Ubuntu
# Run as root or with sudo
# Usage: sudo bash deploy-ubuntu.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo bash deploy-ubuntu.sh)"
    exit 1
fi

log_info "Starting SearchWithEmbeddings deployment on Ubuntu..."

# ==============================================================================
# STEP 1: System Updates
# ==============================================================================
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# ==============================================================================
# STEP 2: Install Docker
# ==============================================================================
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    
    # Install prerequisites
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_info "Docker installed successfully"
else
    log_info "Docker already installed"
fi

# ==============================================================================
# STEP 3: Configure Docker for Production
# ==============================================================================
log_info "Configuring Docker daemon for production..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    }
}
EOF

systemctl restart docker

# ==============================================================================
# STEP 4: System Optimizations
# ==============================================================================
log_info "Applying system optimizations..."

# Increase file descriptors
cat > /etc/security/limits.d/docker.conf <<EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Optimize kernel parameters
cat > /etc/sysctl.d/99-docker.conf <<EOF
# Increase max connections
net.core.somaxconn = 65535

# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Enable TCP fast open
net.ipv4.tcp_fastopen = 3

# Reduce TIME_WAIT sockets
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1

# Increase local port range
net.ipv4.ip_local_port_range = 1024 65535

# Enable memory overcommit
vm.overcommit_memory = 1

# Reduce swappiness
vm.swappiness = 10
EOF

sysctl -p /etc/sysctl.d/99-docker.conf

# ==============================================================================
# STEP 5: Create Application Directory Structure
# ==============================================================================
log_info "Creating application directories..."

APP_DIR="/opt/cenadi"
mkdir -p ${APP_DIR}/{documents,backups,logs,nginx/ssl}

# Set proper ownership (will be adjusted based on deployment user)
chown -R 1001:1001 ${APP_DIR}/documents

# ==============================================================================
# STEP 6: Setup Firewall (UFW)
# ==============================================================================
log_info "Configuring firewall..."

apt-get install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall (answer 'y' automatically)
echo "y" | ufw enable

log_info "Firewall configured"

# ==============================================================================
# STEP 7: Install Certbot for SSL
# ==============================================================================
log_info "Installing Certbot for SSL certificates..."

apt-get install -y certbot

log_info "Certbot installed. Run this to obtain SSL certificate:"
echo "  certbot certonly --standalone -d your-domain.com"
echo "  Then copy certificates to ${APP_DIR}/nginx/ssl/"

# ==============================================================================
# STEP 8: Create Systemd Service
# ==============================================================================
log_info "Creating systemd service..."

cat > /etc/systemd/system/cenadi-search.service <<EOF
[Unit]
Description=CENADI Search Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cenadi-search

# ==============================================================================
# STEP 9: Create Backup Script
# ==============================================================================
log_info "Creating backup script..."

cat > ${APP_DIR}/backup.sh <<'EOF'
#!/bin/bash
# Backup script for SearchWithEmbeddings

BACKUP_DIR="/opt/cenadi/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup PostgreSQL
docker exec swe-postgres pg_dump -U cenadi_prod cenadi_search | gzip > ${BACKUP_DIR}/postgres_${DATE}.sql.gz

# Backup documents folder
tar -czf ${BACKUP_DIR}/documents_${DATE}.tar.gz -C /opt/cenadi documents

# Keep only last 7 days of backups
find ${BACKUP_DIR} -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${DATE}"
EOF

chmod +x ${APP_DIR}/backup.sh

# Add daily cron job for backups
echo "0 2 * * * root ${APP_DIR}/backup.sh >> /var/log/cenadi-backup.log 2>&1" > /etc/cron.d/cenadi-backup

# ==============================================================================
# STEP 10: Create Health Check Script
# ==============================================================================
log_info "Creating health check script..."

cat > ${APP_DIR}/healthcheck.sh <<'EOF'
#!/bin/bash
# Health check script

check_service() {
    if docker ps --filter "name=$1" --filter "status=running" | grep -q $1; then
        echo "✓ $1 is running"
        return 0
    else
        echo "✗ $1 is NOT running"
        return 1
    fi
}

echo "=== CENADI Search Health Check ==="
echo ""

check_service swe-app
check_service swe-indexer
check_service swe-postgres
check_service swe-milvus
check_service swe-minio
check_service swe-etcd
check_service swe-nginx

echo ""
echo "=== Docker Stats ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
EOF

chmod +x ${APP_DIR}/healthcheck.sh

# ==============================================================================
# FINAL INSTRUCTIONS
# ==============================================================================
log_info "Deployment preparation complete!"

echo ""
echo "=========================================="
echo "  NEXT STEPS TO COMPLETE DEPLOYMENT"
echo "=========================================="
echo ""
echo "1. Copy your application files to ${APP_DIR}"
echo ""
echo "2. Create .env file from template:"
echo "   cp .env.production.example .env"
echo "   nano .env  # Edit with your production values"
echo ""
echo "3. Set up SSL certificate:"
echo "   certbot certonly --standalone -d your-domain.com"
echo "   cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ${APP_DIR}/nginx/ssl/"
echo "   cp /etc/letsencrypt/live/your-domain.com/privkey.pem ${APP_DIR}/nginx/ssl/"
echo ""
echo "4. Start the application:"
echo "   cd ${APP_DIR}"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Or use systemd service:"
echo "   systemctl start cenadi-search"
echo ""
echo "6. Check health:"
echo "   ${APP_DIR}/healthcheck.sh"
echo ""
echo "=========================================="
