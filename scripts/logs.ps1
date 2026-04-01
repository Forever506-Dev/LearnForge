# LearnForge - Tail logs
# Usage:  .\scripts\logs.ps1           (tail all services)
#         .\scripts\logs.ps1 api        (tail only the api service)
param(
    [string]$Service = "",
    [int]$Lines = 50
)

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""

if ($Service) {
    Write-Host "  [LOG]  Logs for: $Service  (last $Lines lines, Ctrl+C to exit)" -ForegroundColor Cyan
    Write-Host ""
    docker compose logs --tail=$Lines --follow $Service
} else {
    Write-Host "  [LOG]  Logs for all services  (last $Lines lines, Ctrl+C to exit)" -ForegroundColor Cyan
    Write-Host ""
    docker compose logs --tail=$Lines --follow
}