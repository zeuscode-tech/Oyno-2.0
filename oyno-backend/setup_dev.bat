@echo off
echo ============================================
echo   OYNO Backend - Restart and Fix
echo ============================================

echo.
echo [1] Stopping old containers...
docker compose down

echo.
echo [2] Starting fresh (migrate + seed runs automatically)...
docker compose up -d

echo.
echo [3] Waiting 10 seconds for startup...
timeout /t 10 /nobreak

echo.
echo [4] Checking logs...
docker compose logs web --tail=30

echo.
echo ============================================
echo   Backend should be running on :8080
echo   Check logs above for errors
echo ============================================
pause
