#!/bin/bash

# FlashBet AI - Start GraphQL Service
# Starts the Linera service with the correct wallet configuration

# Environment setup (matches integration_test.sh)
export LINERA_WALLET="/tmp/.tmpv9HluH/wallet_0.json"
export LINERA_KEYSTORE="/tmp/.tmpv9HluH/keystore_0.json"
export LINERA_STORAGE="rocksdb:/tmp/.tmpv9HluH/client_0.db"

PORT="${1:-8080}"

echo "Starting Linera GraphQL service on port $PORT..."
echo "Using wallet: $LINERA_WALLET"
echo ""

linera service --port "$PORT"
