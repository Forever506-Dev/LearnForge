# LearnForge - Restart one or all services
# Usage:  .\scripts\restart.ps1              (restart everything)
#         .\scripts\restart.ps1 api          (restart only the api service)
param(
    [string]$Service = ""
)

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if ($Service) {
    Write-Host ""
    Write-Host "  [...]  Restarting service: $Service ..." -ForegroundColor Yellow
    docker compose restart $Service
} else {
    Write-Host ""
    Write-Host "  [...]  Restarting all services..." -ForegroundColor Yellow
    docker compose restart
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK]  Done." -ForegroundColor Green
} else {
    Write-Host "  [ERR]  Restart failed." -ForegroundColor Red
}

Write-Host ""