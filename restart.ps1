# Script restart server - Chạy bằng terminal
# Usage: .\restart.ps1

Write-Host "🔄 Restarting Music Backend Server..." -ForegroundColor Yellow

$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "❌ Error: PM2 is not installed!" -ForegroundColor Red
    exit 1
}

pm2 restart music_backend
Write-Host "✅ Server restarted" -ForegroundColor Green

pm2 status

