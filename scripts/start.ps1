# LearnForge - Start all services
# Usage:  .\scripts\start.ps1              (start using existing images)
#         .\scripts\start.ps1 -Rebuild     (rebuild api/frontend/ssh-proxy first)
param(
    [switch]$Rebuild
)

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "    LearnForge - Tutorial Platform" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (docker info 2>&1 | Select-String "Server Version")) {
    Write-Host "  [ERR]  Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

if ($Rebuild) {
    Write-Host "  [...]  Rebuilding core services (api, frontend, ssh-proxy)..." -ForegroundColor Yellow
    Write-Host ""
    docker compose build api frontend ssh-proxy
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [ERR]  Rebuild failed. Run .\scripts\logs.ps1 to inspect errors." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host "  [...]  Starting all services..." -ForegroundColor Yellow
Write-Host ""

docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [ERR]  Startup failed. Run .\scripts\logs.ps1 to inspect errors." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [OK]  LearnForge is up and running!" -ForegroundColor Green
Write-Host ""
Write-Host "  +-----------------------------------------+" -ForegroundColor DarkGreen
Write-Host "  |  Platform  -->  http://localhost         |" -ForegroundColor Green
Write-Host "  |  API       -->  http://localhost:8002    |" -ForegroundColor Green
Write-Host "  |  Piston    -->  (internal only)          |" -ForegroundColor Green
Write-Host "  +-----------------------------------------+" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor DarkGray
Write-Host "    .\scripts\status.ps1          - view running containers" -ForegroundColor DarkGray
Write-Host "    .\scripts\logs.ps1            - tail all logs" -ForegroundColor DarkGray
Write-Host "    .\scripts\stop.ps1            - stop everything" -ForegroundColor DarkGray
Write-Host "    .\scripts\start.ps1 -Rebuild  - rebuild api/frontend/ssh-proxy" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Lab images (build once, only if needed):" -ForegroundColor DarkGray
Write-Host "    docker compose --profile parrot-os build parrot-os-build" -ForegroundColor DarkGray
Write-Host "    docker compose --profile windows11 build windows11-build" -ForegroundColor DarkGray
Write-Host ""