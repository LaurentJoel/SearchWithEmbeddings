#!/bin/bash
# ==============================================================================
# Stop all development services
# ==============================================================================

echo "============================================"
echo "  Stopping CENADI Search Services"
echo "============================================"
echo ""

echo "[1/2] Stopping PM2 processes..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

echo ""
echo "[2/2] Stopping Docker containers..."
docker-compose -f docker-compose.dev.yml down

echo ""
echo "============================================"
echo "  All services stopped!"
echo "============================================"
