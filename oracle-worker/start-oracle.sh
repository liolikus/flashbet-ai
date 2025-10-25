#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🚀 Starting FlashBet Oracle Worker..."
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

echo "✅ Starting Oracle Worker (press Ctrl+C to stop)"
echo ""

# Run in foreground
npm start
