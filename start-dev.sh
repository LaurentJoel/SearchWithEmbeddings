#!/bin/bash
# ==============================================================================
# SearchWithEmbeddings - Local Development Startup Script (Linux/Mac)
# ==============================================================================

set -e

echo "============================================"
echo "  CENADI Search - Local Development"
echo "============================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker first."
    exit 1
fi

# Create logs directory
mkdir -p logs

echo "[1/4] Starting Docker services (Milvus, PostgreSQL, Indexer)..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "[2/4] Waiting for services to be healthy..."
sleep 30

echo ""
echo "[3/4] Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "[4/4] Starting Next.js app with PM2..."
cd app
npm install
cd ..

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "[INFO] Installing PM2 globally..."
    npm install -g pm2
fi

pm2 start ecosystem.config.json

echo ""
echo "============================================"
echo "  All services started!"
echo "============================================"
echo ""
echo "  App:      http://localhost:3000"
echo "  Indexer:  http://localhost:8000"
echo "  Milvus:   localhost:19530"
echo "  Postgres: localhost:5432"
echo ""
echo "  PM2 Commands:"
echo "  - pm2 status        : View status"
echo "  - pm2 logs          : View logs"
echo "  - pm2 monit         : Monitor dashboard"
echo "  - pm2 restart all   : Restart app"
echo ""
