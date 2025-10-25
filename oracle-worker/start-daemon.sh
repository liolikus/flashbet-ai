#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🚀 Starting FlashBet Oracle Worker in daemon mode..."
echo ""

# Check if built
if [ ! -d "dist" ]; then
    echo "📦 Building TypeScript project..."
    npm run build
    echo ""
fi

# Check environment
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env with your chain IDs and app IDs"
    exit 1
fi

# Check if already running
if pgrep -f "node dist/index.js" > /dev/null; then
    echo "⚠️  Oracle Worker is already running!"
    echo ""
    echo "To stop it, run:"
    echo "  ./stop-daemon.sh"
    exit 1
fi

# Start in background
nohup npm start > oracle-worker.log 2>&1 &
PID=$!

echo "✅ Oracle Worker started in daemon mode (PID: $PID)"
echo ""
echo "📋 To check logs:"
echo "  tail -f oracle-worker.log"
echo ""
echo "🛑 To stop daemon:"
echo "  ./stop-daemon.sh"
