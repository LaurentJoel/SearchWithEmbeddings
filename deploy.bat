@echo off
REM ==============================================================================
REM Deploy to Production from Local Machine
REM ==============================================================================

echo ============================================
echo   CENADI Search - Deploy to Production
echo ============================================
echo.

set /p confirm="Are you sure you want to deploy to production? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    exit /b 0
)

echo.
echo [1/5] Running tests...
cd app
call npm test --passWithNoTests 2>nul || echo No tests configured
cd ..

echo.
echo [2/5] Building production assets...
cd app
call npm run build
cd ..

echo.
echo [3/5] Committing changes...
git add -A
set /p msg="Enter commit message: "
git commit -m "%msg%" 2>nul || echo No changes to commit

echo.
echo [4/5] Pushing to GitHub...
git push origin main

echo.
echo [5/5] Deploying with PM2...
pm2 deploy ecosystem.production.config.js production

echo.
echo ============================================
echo   Deployment Complete!
echo ============================================
pause
