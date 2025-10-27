#!/bin/bash

# FlashBet AI - Start GraphQL Service
# Starts the Linera service with the correct wallet configuration

# Use default Linera wallet location (unless environment variables are already set)
# This allows the script to work with both test environments and the default wallet
if [ -z "$LINERA_WALLET" ]; then
    # Use default wallet location
    WALLET_DIR="${HOME}/.config/linera"
    echo "Using default Linera wallet directory: $WALLET_DIR"
else
    echo "Using environment-specified wallet: $LINERA_WALLET"
fi

PORT="${1:-8080}"

echo "Starting Linera GraphQL service on port $PORT..."
echo ""

linera service --port "$PORT"
