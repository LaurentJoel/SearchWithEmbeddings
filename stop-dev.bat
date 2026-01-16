@echo off
REM ==============================================================================
REM Stop all development services
REM ==============================================================================

echo ============================================
echo   Stopping CENADI Search Services
echo ============================================
echo.

echo [1/2] Stopping PM2 processes...
pm2 stop all 2>nul
pm2 delete all 2>nul

echo.
echo [2/2] Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down

echo.
echo ============================================
echo   All services stopped!
echo ============================================
pause
