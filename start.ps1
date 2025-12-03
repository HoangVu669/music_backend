# Script khởi động server - Chạy bằng terminal
# Usage: .\start.ps1

Write-Host "🚀 Starting Music Backend Server..." -ForegroundColor Green

# Check if in correct directory
if (-not (Test-Path "src/server.js")) {
    Write-Host "❌ Error: src/server.js not found!" -ForegroundColor Red
    Write-Host "Please run this script from the music_backend directory." -ForegroundColor Yellow
    exit 1
}

# Check Node.js
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "❌ Error: Node.js is not installed!" -ForegroundColor Red
    exit 1
}

# Check PM2
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "⚠️  PM2 not found. Installing..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install PM2!" -ForegroundColor Red
        exit 1
    }
}

# Stop existing process
pm2 delete music_backend 2>$null

# Start server
Write-Host "📦 Starting server with PM2..." -ForegroundColor Yellow
pm2 start src/server.js --name music_backend
pm2 save

# Wait a bit
Start-Sleep -Seconds 2

# Show status
Write-Host "`n📊 Status:" -ForegroundColor Green
pm2 status

Write-Host "`n📋 Logs (Press Ctrl+C to exit):" -ForegroundColor Green
pm2 logs music_backend

