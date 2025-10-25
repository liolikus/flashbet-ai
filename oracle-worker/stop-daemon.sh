#!/bin/bash

cd "$(dirname "$0")"

echo "🛑 Stopping FlashBet Oracle Worker daemon..."
echo ""

# Find and kill the process
if pgrep -f "node dist/index.js" > /dev/null; then
    pkill -f "node dist/index.js"
    echo "✅ Oracle Worker stopped"
else
    echo "ℹ️  Oracle Worker is not running"
fi
