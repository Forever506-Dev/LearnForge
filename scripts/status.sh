#!/usr/bin/env bash
# LearnForge – Show service status
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo -e "\033[36m  📊  LearnForge – Service Status\033[0m"
echo ""
docker compose ps
echo ""
