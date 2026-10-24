@echo off
title Balneg GymReserve Web (localhost:8081) - RUNNING
cd /d "%~dp0"

echo ========================================================
echo   Starting GymReserve Application on http://localhost:8081
echo ========================================================
echo.

:: Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js v18 or v20 LTS from https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check dependencies
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install encountered an error.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

echo [INFO] Starting Expo Web server on port 8081...
echo Opening http://localhost:8081 in your browser...
echo.
echo --------------------------------------------------------
echo  STATUS: ACTIVE - DO NOT CLOSE THIS WINDOW
echo  Closing this window will shut down the server.
echo --------------------------------------------------------
echo.

:run_server
call npx expo start --web --port 8081

echo.
echo ========================================================
echo [STATUS] Expo server has stopped or disconnected.
echo This window will stay open so you can read any error messages.
echo ========================================================
echo.
echo Press any key to restart the server, or close this window to exit.
pause >nul
goto run_server
