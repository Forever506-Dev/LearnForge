#!/usr/bin/env bash
# LearnForge - Start all services
# Usage:  ./scripts/start.sh           (start using existing images)
#         ./scripts/start.sh --rebuild  (rebuild api/frontend/ssh-proxy first)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo -e "\033[36m  LearnForge - Tutorial Platform\033[0m"
echo ""

if ! docker info &>/dev/null; then
    echo -e "\033[31m  [ERR]  Docker is not running.\033[0m"
    exit 1
fi

if [ "${1}" = "--rebuild" ]; then
    echo -e "\033[33m  [...]  Rebuilding core services (api, frontend, ssh-proxy)...\033[0m"
    docker compose build api frontend ssh-proxy || exit 1
    echo ""
fi

echo -e "\033[33m  [...]  Starting all services...\033[0m"
echo ""

docker compose up -d

echo ""
echo -e "\033[32m  [OK]  LearnForge is up!\033[0m"
echo ""
echo -e "\033[32m  Platform  -->  http://localhost\033[0m"
echo -e "\033[32m  API       -->  http://localhost:8002\033[0m"
echo ""
echo -e "\033[90m  ./scripts/start.sh --rebuild  - rebuild api/frontend/ssh-proxy\033[0m"
echo -e "\033[90m  ./scripts/logs.sh             - tail logs\033[0m"
echo -e "\033[90m  ./scripts/stop.sh             - stop everything\033[0m"
echo ""