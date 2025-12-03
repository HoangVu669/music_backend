@echo off
REM Script mở firewall - Cần chạy as Administrator
REM Usage: open-firewall.bat

echo Opening Firewall for port 4000...
echo.

REM Check if running as Administrator (better method)
fltmc >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo How to run as Administrator:
    echo 1. Right-click on open-firewall.bat
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Running as Administrator... OK
echo.

REM Check if rule already exists
netsh advfirewall firewall show rule name="Music Backend API" >nul 2>&1
if %errorLevel% equ 0 (
    echo Firewall rule already exists!
    echo.
    echo Do you want to remove and recreate it? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        echo Removing existing rule...
        netsh advfirewall firewall delete rule name="Music Backend API" >nul 2>&1
    ) else (
        echo Keeping existing rule.
        goto :show_rule
    )
)

REM Add firewall rule
echo Adding firewall rule...
netsh advfirewall firewall add rule name="Music Backend API" dir=in action=allow protocol=TCP localport=4000

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS: Firewall rule added!
    echo Port 4000 is now open for incoming connections.
    echo ========================================
) else (
    echo.
    echo ERROR: Failed to add firewall rule.
    echo Error code: %errorLevel%
    echo.
    echo Trying alternative method...
    powershell -Command "New-NetFirewallRule -DisplayName 'Music Backend API' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"
    if %errorLevel% equ 0 (
        echo SUCCESS: Firewall rule added using PowerShell!
    ) else (
        echo ERROR: Both methods failed. Please check manually.
    )
)

:show_rule
echo.
echo Checking firewall rule...
netsh advfirewall firewall show rule name="Music Backend API"
echo.
echo Done!
pause

