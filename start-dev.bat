@echo off
REM ==============================================================================
REM SearchWithEmbeddings - Local Development Startup Script (Windows)
REM ==============================================================================
REM This script starts all services for local development
REM ==============================================================================

echo ============================================
echo   CENADI Search - Local Development
echo ============================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Create logs directory
if not exist "logs" mkdir logs

echo [1/4] Starting Docker services (Milvus, PostgreSQL, Indexer)...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo [2/4] Waiting for services to be healthy...
timeout /t 30 /nobreak > nul

echo.
echo [3/4] Checking service status...
docker-compose -f docker-compose.dev.yml ps

echo.
echo [4/4] Starting Next.js app with PM2...
cd app
call npm install
cd ..

REM Check if PM2 is installed
where pm2 > nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing PM2 globally...
    call npm install -g pm2
)

pm2 start ecosystem.config.json

echo.
echo ============================================
echo   All services started!
echo ============================================
echo.
echo   App:      http://localhost:3000
echo   Indexer:  http://localhost:8000
echo   Milvus:   localhost:19530
echo   Postgres: localhost:5432
echo.
echo   PM2 Commands:
echo   - pm2 status        : View status
echo   - pm2 logs          : View logs
echo   - pm2 monit         : Monitor dashboard
echo   - pm2 restart all   : Restart app
echo.
echo   Docker Commands:
echo   - docker-compose -f docker-compose.dev.yml logs -f
echo   - docker-compose -f docker-compose.dev.yml down
echo.
pause
