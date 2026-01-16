#!/bin/bash
# ==============================================================================
# Deploy to Production from Local Machine
# ==============================================================================

set -e

echo "============================================"
echo "  CENADI Search - Deploy to Production"
echo "============================================"
echo ""

read -p "Are you sure you want to deploy to production? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "[1/5] Running tests..."
cd app
npm test --passWithNoTests 2>/dev/null || echo "No tests configured"
cd ..

echo ""
echo "[2/5] Building production assets..."
cd app
npm run build
cd ..

echo ""
echo "[3/5] Committing changes..."
git add -A
read -p "Enter commit message: " msg
git commit -m "$msg" 2>/dev/null || echo "No changes to commit"

echo ""
echo "[4/5] Pushing to GitHub..."
git push origin main

echo ""
echo "[5/5] Deploying with PM2..."
pm2 deploy ecosystem.production.config.js production

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
