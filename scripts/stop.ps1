# LearnForge - Stop all services
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "  [STOP]  Stopping LearnForge..." -ForegroundColor Yellow

docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  [OK]  All services stopped." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  [ERR]  Something went wrong. Check: docker ps" -ForegroundColor Red
}

Write-Host ""