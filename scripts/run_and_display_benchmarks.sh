#!/bin/bash
# Run Linera Benchmarks and Display Results in Terminal
# Combines benchmark execution with beautiful terminal output

set -e

# Linera Brand Colors (ANSI)
BLUE_400='\033[38;2;141;150;255m'
BLUE_300='\033[38;2;164;171;255m'
RED_800='\033[38;2;222;42;2m'
GREY_100='\033[38;2;237;237;249m'
GREY_200='\033[38;2;200;203;214m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

echo -e "${BLUE_400}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║          LINERA BLOCKCHAIN BENCHMARK SUITE                       ║
║          Running Performance Tests...                            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${RESET}\n"

# Check if benchmark script exists
if [ ! -f "scripts/benchmark_linera.sh" ] && [ ! -f "benchmark_linera.sh" ]; then
    echo -e "${RED_800}Error: benchmark_linera.sh not found!${RESET}"
    exit 1
fi

# Determine script location
if [ -f "scripts/benchmark_linera.sh" ]; then
    BENCHMARK_SCRIPT="scripts/benchmark_linera.sh"
else
    BENCHMARK_SCRIPT="benchmark_linera.sh"
fi

echo -e "${GREY_100}Step 1: Running Linera performance benchmarks...${RESET}\n"

# Run the benchmark script
chmod +x "$BENCHMARK_SCRIPT" 2>/dev/null || true
bash "$BENCHMARK_SCRIPT"

# Check if benchmark results were generated
if [ ! -f "benchmark_results.json" ]; then
    echo -e "\n${RED_800}Warning: benchmark_results.json not generated${RESET}"
    echo -e "${GREY_200}Continuing with static data...${RESET}\n"
fi

echo -e "\n${GREY_100}Step 2: Loading benchmark results...${RESET}\n"
sleep 1

# Parse JSON results if available
if [ -f "benchmark_results.json" ] && command -v jq &> /dev/null; then
    echo -e "${BLUE_400}📊 Real-time Linera Performance Results:${RESET}\n"

    SINGLE_TX=$(jq -r '.metrics.singleTransactionLatency.value' benchmark_results.json)
    AVG_TX=$(jq -r '.metrics.averageTransactionLatency.value' benchmark_results.json)
    TPS=$(jq -r '.metrics.throughput.value' benchmark_results.json)
    BETTING_TOTAL=$(jq -r '.metrics.bettingCycle.total' benchmark_results.json)

    echo -e "  ${BLUE_400}●${RESET} Single Transaction:    ${BOLD}${BLUE_400}${SINGLE_TX}ms${RESET}"
    echo -e "  ${BLUE_400}●${RESET} Average Transaction:   ${BOLD}${BLUE_400}${AVG_TX}ms${RESET}"
    echo -e "  ${BLUE_400}●${RESET} Throughput:            ${BOLD}${BLUE_400}${TPS} TPS${RESET}"
    echo -e "  ${BLUE_400}●${RESET} Full Betting Cycle:    ${BOLD}${BLUE_400}${BETTING_TOTAL}ms${RESET}"
    echo ""
fi

echo -e "${GREY_100}Step 3: Generating comparison report...${RESET}\n"
sleep 1

# Display full benchmark comparison
if [ -f "scripts/display_benchmarks.sh" ]; then
    bash scripts/display_benchmarks.sh
elif [ -f "display_benchmarks.sh" ]; then
    bash display_benchmarks.sh
else
    echo -e "${RED_800}Error: display_benchmarks.sh not found!${RESET}"
    exit 1
fi

# Export results notice
echo -e "\n${BOLD}${BLUE_400}✓ Benchmark Complete!${RESET}\n"
echo -e "${GREY_200}Results saved to:${RESET}"
echo -e "  ${BLUE_400}→${RESET} ${GREY_100}benchmark_results.json${RESET} (machine-readable)"
echo -e "  ${BLUE_400}→${RESET} ${GREY_100}Terminal output above${RESET} (human-readable)"
echo ""
