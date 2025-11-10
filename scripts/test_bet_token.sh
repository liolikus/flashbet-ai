#!/bin/bash
# Test BET Token - Claim Operation
# This script deploys the BET token and tests the Claim operation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BET Token - Test Claim Operation  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Start fresh testnet
echo -e "${YELLOW}Starting local testnet...${NC}"
linera net up > /dev/null 2>&1 &
VALIDATOR_PID=$!
sleep 5

# Get testnet path from the most recent /tmp/.tmp* directory
TESTNET_DIR=$(ls -td /tmp/.tmp* 2>/dev/null | head -1)

if [ -z "$TESTNET_DIR" ]; then
    echo "Error: Could not find testnet directory"
    exit 1
fi

export LINERA_WALLET="$TESTNET_DIR/wallet_0.json"
export LINERA_KEYSTORE="$TESTNET_DIR/keystore_0.json"
export LINERA_STORAGE="rocksdb:$TESTNET_DIR/client_0.db"

echo "Using testnet: $TESTNET_DIR"
echo ""

# Get default chain and owner
CHAIN=$(linera wallet show | grep "Public Key" -A 1 | tail -1 | awk '{print $1}')
OWNER=$(linera wallet show | grep "Public Key" | head -1 | awk '{print $3}')

echo "Chain: $CHAIN"
echo "Owner: $OWNER"
echo ""

# Deploy BET Token
echo -e "${YELLOW}Deploying BET Token application...${NC}"
TOKEN_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_token_contract.wasm \
  target/wasm32-unknown-unknown/release/flashbet_token_service.wasm \
  --json-argument "{\"accounts\":{\"$OWNER\":\"1000000.\"}}")

echo -e "${GREEN}✓ BET Token deployed${NC}"
echo "  Application ID: $TOKEN_APP"
echo ""

# Start GraphQL service
echo -e "${YELLOW}Starting GraphQL service...${NC}"
linera service --port 8080 > /dev/null 2>&1 &
SERVICE_PID=$!
sleep 3

echo -e "${GREEN}✓ GraphQL service running on http://localhost:8080${NC}"
echo ""

# Test queries
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}║   Testing BET Token Operations      ║${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}1. Query Ticker Symbol:${NC}"
TICKER_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { tickerSymbol }"}')
echo "$TICKER_RESULT" | python3 -m json.tool
echo ""

echo -e "${YELLOW}2. Query Owner Balance (Initial):${NC}"
BALANCE_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { balance(owner: \\\"$OWNER\\\") }\"}")
echo "$BALANCE_RESULT" | python3 -m json.tool
echo ""

echo -e "${YELLOW}3. Test Claim Operation (100 BET):${NC}"
CLAIM_RESULT=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { claim(amount: \"100.\") }"}')
echo "$CLAIM_RESULT" | python3 -m json.tool
echo ""

sleep 2

echo -e "${YELLOW}4. Query Balance After Claim:${NC}"
BALANCE_AFTER=$(curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { balance(owner: \\\"$OWNER\\\") }\"}")
echo "$BALANCE_AFTER" | python3 -m json.tool
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ BET Token Tests Complete!      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Testnet directory: $TESTNET_DIR"
echo "BET Token App ID: $TOKEN_APP"
echo ""
echo -e "${YELLOW}To continue testing:${NC}"
echo "  export LINERA_WALLET=\"$LINERA_WALLET\""
echo "  export LINERA_KEYSTORE=\"$LINERA_KEYSTORE\""
echo "  export LINERA_STORAGE=\"$LINERA_STORAGE\""
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop validator and service${NC}"

# Wait for user to stop
wait
