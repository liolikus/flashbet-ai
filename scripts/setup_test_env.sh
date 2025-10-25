#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Application IDs from latest deployment
ORACLE_CHAIN="2ded66b2c1277f566a798343954aa0fb2297ed7f902d93de7cb7b6afe43e0299"
MARKET_CHAIN="8287cb972a617fc1c648bcf4a8ed6dd9f61c9c80607bdd98055540447caf7786"
USER_CHAIN="fe63387ba41a621967b44bd078a03b1dd2821984c2c261fc93d97a01a1fdeefd"

ORACLE_APP="206f124e2573edba852507174cdd453e15b8888f7a6d78b9dc1a776b3af2485a"
MARKET_APP="3f9d7e47f6a8b4437f08a7ff4c7bf6807bcdccfaa4f58812f6c73d40b2edc278"
USER_APP="b8aa2fb57b2ab8a17cd62087d32e3e380068803e8e60efe86863d4fa714f24f3"

BASE_URL="http://localhost:8080"

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}    FlashBet AI - Test Environment Setup   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Step 1: Create Market
echo -e "\n${YELLOW}[1/3] Creating Market...${NC}"
RESULT=$(curl -s -X POST $BASE_URL/chains/$MARKET_CHAIN/applications/$MARKET_APP \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(eventId: \\\"mlb_game_20251025_001\\\", description: \\\"Yankees vs Red Sox\\\", eventTime: 1730000000000000, marketType: MATCH_WINNER, homeTeam: \\\"Yankees\\\", awayTeam: \\\"Red Sox\\\") }\"}")
if echo "$RESULT" | grep -q "error"; then
  echo -e "${YELLOW}Market may already exist or mutation failed${NC}"
  echo "$RESULT" | jq .
else
  echo -e "${GREEN}✓ Market created${NC}"
fi

# Step 2: Deposit funds to User Chain
echo -e "\n${YELLOW}[2/3] Depositing 1000 tokens to User Chain...${NC}"
curl -s -X POST $BASE_URL/chains/$USER_CHAIN/applications/$USER_APP \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { deposit(amount: \"1000000000000000000000\") }"}' > /dev/null
echo -e "${GREEN}✓ Deposited 1000 tokens${NC}"

# Step 3: Check balances and market state
echo -e "\n${YELLOW}[3/3] Verifying setup...${NC}"

echo -e "\n${BLUE}User Balance:${NC}"
curl -s -X POST http://localhost:8080/chains/$USER_CHAIN/applications/$USER_APP \
  -H "Content-Type: application/json" \
  -d '{"query":"{ balance }"}' | jq .

echo -e "\n${BLUE}Market State:${NC}"
curl -s -X POST http://localhost:8080/chains/$MARKET_CHAIN/applications/$MARKET_APP \
  -H "Content-Type: application/json" \
  -d '{"query":"{ description status totalPool betCount }"}' | jq .

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}    ✅ Test Environment Ready!             ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Open browser: http://localhost:5173"
echo -e "  2. Place a bet via UI (e.g., 10 tokens on Home)"
echo -e "  3. Use Oracle Panel to publish result and distribute payouts"
echo -e ""
