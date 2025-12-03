@echo off
REM Script khởi động server - Dùng cho CMD
REM Usage: start.bat

REM Set NODE_SKIP_PLATFORM_CHECK for Windows Server 2012 R2
set NODE_SKIP_PLATFORM_CHECK=1

echo Starting Music Backend Server...

REM Check if in correct directory
if not exist "src\server.js" (
    echo Error: src\server.js not found!
    echo Please run this script from the music_backend directory.
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed!
    pause
    exit /b 1
)

REM Check PM2
where pm2 >nul 2>&1
if errorlevel 1 (
    echo PM2 not found. Installing...
    call npm install -g pm2
    if errorlevel 1 (
        echo Failed to install PM2!
        pause
        exit /b 1
    )
)

REM Stop existing process
pm2 delete music_backend >nul 2>&1

REM Start server
echo Starting server with PM2...
pm2 start src/server.js --name music_backend
pm2 save

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Show status
echo.
echo Status:
pm2 status

echo.
echo Logs (Press Ctrl+C to exit):
pm2 logs music_backend

