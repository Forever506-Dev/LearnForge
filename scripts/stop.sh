#!/usr/bin/env bash
# LearnForge – Stop all services
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo -e "\033[33m  ■  Stopping LearnForge...\033[0m"

docker compose down

echo -e "\033[32m  ✔  All services stopped.\033[0m"
echo ""
