#!/bin/bash
set -e

MARKER="/piston/packages/.runtimes-installed"

if [ -f "$MARKER" ]; then
    echo "✅ Piston runtimes already installed, skipping."
else
    echo "📦 Installing Piston runtimes (first boot only)..."

    echo "  → Python..."
    /piston/cli/index.js ppman install python     2>&1 || true
    echo "  → C++ (gcc)..."
    /piston/cli/index.js ppman install gcc         2>&1 || true
    echo "  → Go..."
    /piston/cli/index.js ppman install go          2>&1 || true
    echo "  → Rust..."
    /piston/cli/index.js ppman install rust        2>&1 || true
    echo "  → Lua..."
    /piston/cli/index.js ppman install lua         2>&1 || true
    echo "  → JavaScript (Node)..."
    /piston/cli/index.js ppman install node        2>&1 || true

    touch "$MARKER"
    echo "✅ All runtimes installed."
fi
