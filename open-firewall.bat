@echo off
REM Script mở firewall - Cần chạy as Administrator
REM Usage: open-firewall.bat

echo Opening Firewall for port 4000...
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Add firewall rule
netsh advfirewall firewall add rule name="Music Backend API" dir=in action=allow protocol=TCP localport=4000

if %errorLevel% equ 0 (
    echo.
    echo SUCCESS: Firewall rule added!
    echo Port 4000 is now open for incoming connections.
) else (
    echo.
    echo ERROR: Failed to add firewall rule.
    echo The rule might already exist.
)

echo.
echo Checking firewall rule...
netsh advfirewall firewall show rule name="Music Backend API"
echo.
pause

