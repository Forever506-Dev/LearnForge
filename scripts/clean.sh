#!/usr/bin/env bash
# LearnForge – Stop services and wipe all data volumes
# ⚠  This destroys the database and all persistent data.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo -e "\033[31m  ⚠   WARNING: This will DELETE all data (database, Piston packages, etc.)\033[0m"
read -rp "  Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
    echo "  Aborted."
    echo ""
    exit 0
fi

echo ""
echo -e "\033[33m  🗑  Removing containers, volumes, and orphans...\033[0m"
docker compose down --volumes --remove-orphans

echo -e "\033[32m  ✔  Clean complete. Run ./scripts/start.sh to start fresh.\033[0m"
echo ""
