#!/bin/bash
# FlashBet AI - Deploy Script
# Deploys all three contracts to Linera testnet

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FlashBet AI - Deploy to Testnet   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check if WASM files exist
if [ ! -f "target/wasm32-unknown-unknown/release/flashbet_oracle_contract.wasm" ]; then
    echo -e "${RED}✗ WASM files not found!${NC}"
    echo "Please run: ./scripts/build.sh first"
    exit 1
fi

# Environment setup
export LINERA_WALLET="${LINERA_WALLET:-/tmp/.tmpv9HluH/wallet_0.json}"
export LINERA_KEYSTORE="${LINERA_KEYSTORE:-/tmp/.tmpv9HluH/keystore_0.json}"
export LINERA_STORAGE="${LINERA_STORAGE:-rocksdb:/tmp/.tmpv9HluH/client_0.db}"

echo -e "${YELLOW}Using environment:${NC}"
echo "  Wallet:  $LINERA_WALLET"
echo "  Keystore: $LINERA_KEYSTORE"
echo "  Storage:  $LINERA_STORAGE"
echo ""

# Get the default chain
CHAIN=$(linera wallet show | grep "Public Key" -A 1 | tail -1 | awk '{print $1}')
echo -e "${YELLOW}Deploying to chain:${NC} $CHAIN"
echo ""

# Deploy Oracle Chain
echo -e "${YELLOW}[1/3]${NC} Deploying Oracle Chain..."
ORACLE_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_oracle_{contract,service}.wasm \
  --json-argument '{"initial_oracles":[]}')
echo -e "${GREEN}✓ Oracle Chain deployed${NC}"
echo "  Application ID: $ORACLE_APP"
echo ""

# Deploy Market Chain (with Oracle reference)
echo -e "${YELLOW}[2/3]${NC} Deploying Market Chain..."
MARKET_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_market_{contract,service}.wasm \
  --json-argument "{\"oracle_chain\":\"$CHAIN\"}")
echo -e "${GREEN}✓ Market Chain deployed${NC}"
echo "  Application ID: $MARKET_APP"
echo ""

# Deploy User Chain
echo -e "${YELLOW}[3/3]${NC} Deploying User Chain..."
USER_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_user_{contract,service}.wasm \
  --json-argument 'null')
echo -e "${GREEN}✓ User Chain deployed${NC}"
echo "  Application ID: $USER_APP"
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All Contracts Deployed!         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Deployment Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Chain ID:     $CHAIN"
echo ""
echo "Application IDs:"
echo "  Oracle:  $ORACLE_APP"
echo "  Market:  $MARKET_APP"
echo "  User:    $USER_APP"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start GraphQL service: ./scripts/start_service.sh"
echo "  2. Run integration test:  ./scripts/test.sh"
echo ""
echo -e "${BLUE}Save these IDs for testing!${NC}"
