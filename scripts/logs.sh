#!/usr/bin/env bash
# LearnForge – Tail logs
# Usage:  ./scripts/logs.sh          (all services)
#         ./scripts/logs.sh api       (one service)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SERVICE="${1:-}"
LINES="${2:-50}"
echo ""
if [ -n "$SERVICE" ]; then
    echo -e "\033[36m  📋  Logs for: $SERVICE (last $LINES lines, Ctrl+C to exit)\033[0m"
    docker compose logs --tail="$LINES" --follow "$SERVICE"
else
    echo -e "\033[36m  📋  Logs for all services (last $LINES lines, Ctrl+C to exit)\033[0m"
    docker compose logs --tail="$LINES" --follow
fi
