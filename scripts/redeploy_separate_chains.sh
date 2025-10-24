#!/bin/bash
# FlashBet AI - Redeploy with separate chains for cross-chain messaging
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FlashBet AI - Redeploy with Separate Chains ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Environment setup
export LINERA_WALLET="${LINERA_WALLET:-/tmp/.tmpv9HluH/wallet_0.json}"
export LINERA_KEYSTORE="${LINERA_KEYSTORE:-/tmp/.tmpv9HluH/keystore_0.json}"
export LINERA_STORAGE="${LINERA_STORAGE:-rocksdb:/tmp/.tmpv9HluH/client_0.db}"

# Get available chains
echo -e "${YELLOW}Getting available chains...${NC}"
CHAINS=$(linera wallet show | grep -E "^│ [a-f0-9]{64}" | awk '{print $2}')
CHAIN_ARRAY=($CHAINS)

echo "Found ${#CHAIN_ARRAY[@]} chains"
for i in "${!CHAIN_ARRAY[@]}"; do
    echo "  Chain $i: ${CHAIN_ARRAY[$i]}"
done
echo ""

if [ ${#CHAIN_ARRAY[@]} -lt 3 ]; then
    echo -e "${RED}✗ Need at least 3 chains. Creating additional chains...${NC}"
    # Create new chains if needed
    while [ ${#CHAIN_ARRAY[@]} -lt 3 ]; do
        NEW_CHAIN=$(linera open-chain | grep "New chain" | awk '{print $3}')
        CHAIN_ARRAY+=($NEW_CHAIN)
        echo -e "${GREEN}  Created chain: $NEW_CHAIN${NC}"
    done
    echo ""
fi

# Assign chains
ORACLE_CHAIN=${CHAIN_ARRAY[0]}
MARKET_CHAIN=${CHAIN_ARRAY[1]}
USER_CHAIN=${CHAIN_ARRAY[2]}

echo -e "${YELLOW}Chain Assignment:${NC}"
echo "  Oracle Chain: $ORACLE_CHAIN"
echo "  Market Chain: $MARKET_CHAIN"
echo "  User Chain:   $USER_CHAIN"
echo ""

# Deploy Oracle on Chain 0
echo -e "${YELLOW}[1/3]${NC} Deploying Oracle on chain $ORACLE_CHAIN..."
linera wallet set-default $ORACLE_CHAIN > /dev/null
ORACLE_APP=$(linera --wait-for-outgoing-messages publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_oracle_{contract,service}.wasm \
  --json-argument '{"initial_oracles":[]}')
echo -e "${GREEN}✓ Oracle deployed${NC}"
echo "  Chain: $ORACLE_CHAIN"
echo "  App:   $ORACLE_APP"
echo ""

# Deploy Market on Chain 1
echo -e "${YELLOW}[2/3]${NC} Deploying Market on chain $MARKET_CHAIN..."
linera wallet set-default $MARKET_CHAIN > /dev/null
MARKET_APP=$(linera --wait-for-outgoing-messages publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_market_{contract,service}.wasm \
  --json-argument "{\"oracle_chain\":\"$ORACLE_CHAIN\"}")
echo -e "${GREEN}✓ Market deployed${NC}"
echo "  Chain: $MARKET_CHAIN"
echo "  App:   $MARKET_APP"
echo ""

# Deploy User on Chain 2
echo -e "${YELLOW}[3/3]${NC} Deploying User on chain $USER_CHAIN..."
linera wallet set-default $USER_CHAIN > /dev/null
USER_APP=$(linera --wait-for-outgoing-messages publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_user_{contract,service}.wasm \
  --json-argument 'null')
echo -e "${GREEN}✓ User deployed${NC}"
echo "  Chain: $USER_CHAIN"
echo "  App:   $USER_APP"
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All Contracts Deployed!         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Deployment Summary (Separate Chains):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Oracle Chain:  $ORACLE_CHAIN"
echo "  App ID:      $ORACLE_APP"
echo ""
echo "Market Chain:  $MARKET_CHAIN"
echo "  App ID:      $MARKET_APP"
echo ""
echo "User Chain:    $USER_CHAIN"
echo "  App ID:      $USER_APP"
echo ""
echo -e "${YELLOW}Update frontend/src/config/apollo.ts with:${NC}"
echo "  CHAIN (User): '$USER_CHAIN'"
echo "  ORACLE: '$ORACLE_APP'"
echo "  MARKET: '$MARKET_APP'"
echo "  USER: '$USER_APP'"
echo ""
echo -e "${RED}Note: Market Chain for mutations: '$MARKET_CHAIN'${NC}"
echo ""
