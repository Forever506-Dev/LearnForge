# LearnForge - Stop services and wipe all data volumes
# WARNING: This destroys the database and all persistent data.
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "  [WARN]  This will DELETE all data (database, Piston packages, etc.)" -ForegroundColor Red
$confirm = Read-Host "  Type 'yes' to confirm"

if ($confirm -ne "yes") {
    Write-Host "  Aborted." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "  [...]  Removing containers, volumes, and orphaned services..." -ForegroundColor Yellow

docker compose down --volumes --remove-orphans

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  [OK]  Clean complete. Run .\scripts\start.ps1 to start fresh." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  [ERR]  Clean encountered errors." -ForegroundColor Red
}

Write-Host ""