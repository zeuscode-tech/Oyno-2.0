Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   OYNO Backend - Full Reset & Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "`n[1/3] Stopping old containers..." -ForegroundColor Yellow
docker compose down 2>&1 | Out-Null

Write-Host "[2/3] Starting fresh (auto migrate + seed)..." -ForegroundColor Yellow
docker compose up -d

Write-Host "[3/3] Waiting 15 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`n--- Logs ---" -ForegroundColor Cyan
docker compose logs web --tail=40

Write-Host "`n--- Status ---" -ForegroundColor Cyan
docker compose ps

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "   Done! API: http://localhost:8080" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Read-Host "`nPress Enter to exit"
