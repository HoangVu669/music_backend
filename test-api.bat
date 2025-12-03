@echo off
REM Script test API - Dùng cho CMD
REM Usage: test-api.bat

echo Testing API...
echo.

echo [1] Testing local API...
curl http://localhost:4000/health
echo.
echo.

echo [2] Getting Public IP...
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"
echo.
echo.

echo [3] Checking if port 4000 is listening...
netstat -ano | findstr :4000
echo.
echo.

echo [4] PM2 Status...
pm2 status
echo.
echo.

echo Done!
echo.
echo To test from outside, use:
echo http://YOUR_PUBLIC_IP:4000/health
echo.
pause

