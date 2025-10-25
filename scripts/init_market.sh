#!/bin/bash

# Initialize FlashBet AI test environment
# This script creates a market and deposits funds for testing

MARKET_CHAIN="8287cb972a617fc1c648bcf4a8ed6dd9f61c9c80607bdd98055540447caf7786"
MARKET_APP="3f9d7e47f6a8b4437f08a7ff4c7bf6807bcdccfaa4f58812f6c73d40b2edc278"
USER_CHAIN="fe63387ba41a621967b44bd078a03b1dd2821984c2c261fc93d97a01a1fdeefd"
USER_APP="b8aa2fb57b2ab8a17cd62087d32e3e380068803e8e60efe86863d4fa714f24f3"

BASE_URL="http://localhost:8080"

echo "FlashBet AI - Initializing Test Environment"
echo "==========================================="

# Step 1: Create Market
echo ""
echo "Step 1: Creating Market (Yankees vs Red Sox)..."
MARKET_RESULT=$(curl -s -X POST "$BASE_URL/chains/$MARKET_CHAIN/applications/$MARKET_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createMarket(input: { eventId: \"mlb_game_20251025_001\", description: \"Yankees vs Red Sox\", eventTime: 1730000000000000, marketType: MATCH_WINNER, homeTeam: \"Yankees\", awayTeam: \"Red Sox\" }) }"}')

if echo "$MARKET_RESULT" | jq -e '.data' > /dev/null 2>&1; then
  echo "✓ Market created successfully"
else
  echo "✗ Market creation failed:"
  echo "$MARKET_RESULT" | jq .
fi

# Step 2: Deposit funds to User
echo ""
echo "Step 2: Depositing 100 tokens to User Chain..."
DEPOSIT_RESULT=$(curl -s -X POST "$BASE_URL/chains/$USER_CHAIN/applications/$USER_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { deposit(amount: \"100000000000000000000\") }"}')

if echo "$DEPOSIT_RESULT" | jq -e '.data' > /dev/null 2>&1; then
  echo "✓ Deposited 100 tokens"
else
  echo "✗ Deposit failed:"
  echo "$DEPOSIT_RESULT" | jq .
fi

# Step 3: Verify setup
echo ""
echo "Step 3: Verifying Setup..."
echo ""
echo "User Balance:"
curl -s -X POST "$BASE_URL/chains/$USER_CHAIN/applications/$USER_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ balance }"}' | jq -r '.data.balance' | awk '{printf "  %s attos (%.0f tokens)\n", $1, $1/1e18}'

echo ""
echo "Market Status:"
MARKET_STATUS=$(curl -s -X POST "$BASE_URL/chains/$MARKET_CHAIN/applications/$MARKET_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ description status isOpen totalPool }"}')
echo "$MARKET_STATUS" | jq -r '.data | "  Description: \(.description)\n  Status: \(.status)\n  Is Open: \(.isOpen)\n  Total Pool: \(.totalPool)"'

echo ""
echo "==========================================="
echo "✅ Test environment ready!"
echo ""
echo "Next: Open browser to http://localhost:5173"
echo "  1. Place a bet (e.g., 10 tokens on Home)"
echo "  2. Use Oracle Panel to publish result"
echo ""
