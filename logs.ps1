# Script xem logs - Chạy bằng terminal
# Usage: .\logs.ps1 [--lines N]

param(
    [int]$Lines = 50
)

$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "❌ Error: PM2 is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Showing logs (Press Ctrl+C to exit):" -ForegroundColor Green

if ($Lines -gt 0) {
    pm2 logs music_backend --lines $Lines
} else {
    pm2 logs music_backend
}

