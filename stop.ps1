# Script dừng server - Chạy bằng terminal
# Usage: .\stop.ps1

Write-Host "🛑 Stopping Music Backend Server..." -ForegroundColor Yellow

$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "⚠️  PM2 not found. Server might not be running with PM2." -ForegroundColor Yellow
    exit 0
}

pm2 stop music_backend
Write-Host "✅ Server stopped" -ForegroundColor Green

pm2 status

