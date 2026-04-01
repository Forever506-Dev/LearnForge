# LearnForge - Show service status
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "  [STATUS]  LearnForge - Service Status" -ForegroundColor Cyan
Write-Host ""

docker compose ps

Write-Host ""