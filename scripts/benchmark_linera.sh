#!/bin/bash
# Linera Performance Benchmark Script
# Measures: Transaction latency, throughput, and betting cycle time

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Linera Performance Benchmark ===${NC}"
echo ""

# Check if test environment is running
if [ -z "$LINERA_WALLET" ] || [ -z "$USER_CHAIN" ]; then
    echo -e "${YELLOW}Setting up test environment...${NC}"
    source scripts/setup_test_env.sh
fi

# Output file
RESULTS_FILE="benchmark_results.json"

echo -e "${GREEN}Starting benchmarks...${NC}"
echo ""

# ==========================================
# Test 1: Single Transaction Latency
# ==========================================
echo -e "${BLUE}[1/3] Measuring single transaction latency...${NC}"

START_TIME=$(date +%s%N)
linera query-application $USER_CHAIN $USER_APP \
    --operation '{"Deposit":{"amount":"1000000000000000000"}}' > /dev/null 2>&1
END_TIME=$(date +%s%N)

SINGLE_TX_MS=$(( (END_TIME - START_TIME) / 1000000 ))
echo -e "  → Single transaction: ${GREEN}${SINGLE_TX_MS}ms${NC}"

# ==========================================
# Test 2: Throughput (Sequential Transactions)
# ==========================================
echo -e "${BLUE}[2/3] Measuring throughput (20 sequential deposits)...${NC}"

START_TIME=$(date +%s%N)
for i in {1..20}; do
    linera query-application $USER_CHAIN $USER_APP \
        --operation '{"Deposit":{"amount":"1000000000000000"}}' > /dev/null 2>&1
done
END_TIME=$(date +%s%N)

TOTAL_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
TPS=$(echo "scale=2; 20000 / $TOTAL_TIME_MS" | bc)
AVG_TX_MS=$(( TOTAL_TIME_MS / 20 ))

echo -e "  → 20 transactions in ${YELLOW}${TOTAL_TIME_MS}ms${NC}"
echo -e "  → Average: ${GREEN}${AVG_TX_MS}ms per tx${NC}"
echo -e "  → Throughput: ${GREEN}${TPS} TPS${NC}"

# ==========================================
# Test 3: Full Betting Cycle
# ==========================================
echo -e "${BLUE}[3/3] Measuring full betting cycle...${NC}"

# Reinitialize market
source scripts/init_market.sh > /dev/null 2>&1

CYCLE_START=$(date +%s%N)

# Step 1: Deposit
linera query-application $USER_CHAIN $USER_APP \
    --operation '{"Deposit":{"amount":"100000000000000000000"}}' > /dev/null 2>&1
DEPOSIT_TIME=$(date +%s%N)

# Step 2: Place bet
curl -s -X POST "http://localhost:8080/chains/$USER_CHAIN/applications/$USER_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation { placeBet(marketChain: \\\"$MARKET_CHAIN\\\", marketApp: \\\"$MARKET_APP\\\", outcome: HOME, amount: \\\"50000000000000000000\\\") }\"}" > /dev/null
BET_TIME=$(date +%s%N)

# Step 3: Publish result
curl -s -X POST "http://localhost:8080/chains/$MARKET_CHAIN/applications/$MARKET_APP" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation { publishResult(eventId: \\\"test_event\\\", outcome: HOME) }\"}" > /dev/null

# Wait for resolution and payout
sleep 2

CYCLE_END=$(date +%s%N)

DEPOSIT_MS=$(( (DEPOSIT_TIME - CYCLE_START) / 1000000 ))
BET_MS=$(( (BET_TIME - DEPOSIT_TIME) / 1000000 ))
RESOLUTION_MS=$(( (CYCLE_END - BET_TIME) / 1000000 ))
TOTAL_CYCLE_MS=$(( (CYCLE_END - CYCLE_START) / 1000000 ))

echo -e "  → Deposit: ${GREEN}${DEPOSIT_MS}ms${NC}"
echo -e "  → Place bet: ${GREEN}${BET_MS}ms${NC}"
echo -e "  → Resolution + payout: ${GREEN}${RESOLUTION_MS}ms${NC}"
echo -e "  → ${YELLOW}Total cycle: ${TOTAL_CYCLE_MS}ms${NC}"

# ==========================================
# Generate JSON Results
# ==========================================
echo ""
echo -e "${BLUE}Generating results file...${NC}"

cat > "$RESULTS_FILE" <<EOF
{
  "blockchain": "Linera",
  "timestamp": "$(date -Iseconds)",
  "metrics": {
    "singleTransactionLatency": {
      "value": $SINGLE_TX_MS,
      "unit": "ms"
    },
    "averageTransactionLatency": {
      "value": $AVG_TX_MS,
      "unit": "ms"
    },
    "throughput": {
      "value": $TPS,
      "unit": "TPS"
    },
    "bettingCycle": {
      "deposit": $DEPOSIT_MS,
      "placeBet": $BET_MS,
      "resolution": $RESOLUTION_MS,
      "total": $TOTAL_CYCLE_MS,
      "unit": "ms"
    }
  }
}
EOF

echo -e "${GREEN}✓ Results saved to $RESULTS_FILE${NC}"
echo ""
echo -e "${BLUE}=== Benchmark Complete ===${NC}"
