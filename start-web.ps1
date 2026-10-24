# PowerShell script to start the application directly on localhost:8081
$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting GymReserve Application on http://localhost:8081" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verify Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit..."
    exit 1
}

# Verify node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "[INFO] Starting Expo Web server on port 8081..." -ForegroundColor Green
Write-Host "Opening http://localhost:8081 in your default browser..." -ForegroundColor Green
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host " STATUS: ACTIVE - KEEP THIS WINDOW OPEN" -ForegroundColor Yellow
Write-Host " Closing this window will stop the application." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    npx expo start --web --port 8081
    
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host " [STATUS] Expo server has stopped or disconnected." -ForegroundColor Yellow
    Write-Host " This window will stay open so you can view logs and errors." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host ""
    $key = Read-Host "Press Enter to restart the server, or close the window to exit"
}
