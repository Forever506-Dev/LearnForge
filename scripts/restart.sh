#!/usr/bin/env bash
# LearnForge – Restart one or all services
# Usage:  ./scripts/restart.sh          (restart all)
#         ./scripts/restart.sh api      (restart one service)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SERVICE="${1:-}"
echo ""
if [ -n "$SERVICE" ]; then
    echo -e "\033[33m  ↺  Restarting service: $SERVICE ...\033[0m"
    docker compose restart "$SERVICE"
else
    echo -e "\033[33m  ↺  Restarting all services...\033[0m"
    docker compose restart
fi

echo -e "\033[32m  ✔  Done.\033[0m"
echo ""
