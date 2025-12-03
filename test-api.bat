@echo off
REM Script test API - Dùng cho CMD
REM Usage: test-api.bat

echo ========================================
echo Testing API Server
echo ========================================
echo.

echo [1] Testing local API...
curl http://localhost:4000/health
if %errorLevel% neq 0 (
    echo.
    echo WARNING: Local API test failed!
    echo Check if server is running: pm2 status
)
echo.
echo.

echo [2] Getting Public IP...
for /f "delims=" %%i in ('powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"') do set PUBLIC_IP=%%i
echo Public IP: %PUBLIC_IP%
echo.
echo.

echo [3] Checking if port 4000 is listening...
netstat -ano | findstr :4000
if %errorLevel% neq 0 (
    echo WARNING: Port 4000 is not listening!
    echo Check if server is running: pm2 status
)
echo.
echo.

echo [4] PM2 Status...
pm2 status
echo.
echo.

echo [5] Checking Firewall Rule...
netsh advfirewall firewall show rule name="Music Backend API" | findstr "Enabled"
echo.
echo.

echo ========================================
echo Done!
echo ========================================
echo.
echo To test from outside, use:
echo http://%PUBLIC_IP%:4000/health
echo.
echo Or open in browser:
echo http://%PUBLIC_IP%:4000/health
echo.
pause

