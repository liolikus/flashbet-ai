#!/bin/bash
# Quick Performance Comparison - No benchmark execution
# Just displays the comparison data in terminal

# Linera Brand Colors
BLUE='\033[38;2;141;150;255m'
RED='\033[38;2;222;42;2m'
GREY='\033[38;2;200;203;214m'
BOLD='\033[1m'
RESET='\033[0m'

clear

echo -e "${BLUE}${BOLD}"
cat << 'EOF'
┌────────────────────────────────────────────────────────┐
│                                                        │
│   ⚡ LINERA vs COMPETITORS - QUICK COMPARISON         │
│                                                        │
└────────────────────────────────────────────────────────┘
EOF
echo -e "${RESET}\n"

echo -e "${BOLD}Betting Cycle Time (Deposit → Bet → Payout):${RESET}\n"

printf "  ${BLUE}%-15s${RESET} ${BOLD}%8s${RESET} ${GREY}%s${RESET}\n" \
    "Linera" "530ms" "🏆 WINNER"
printf "  ${GREY}%-15s${RESET} %8s ${RED}%s${RESET}\n" \
    "Solana" "3,200ms" "6.0x slower"
printf "  ${GREY}%-15s${RESET} %8s ${RED}%s${RESET}\n" \
    "Aptos" "6,000ms" "11.3x slower"
printf "  ${GREY}%-15s${RESET} %8s ${RED}%s${RESET}\n" \
    "Sui" "6,200ms" "11.7x slower"
printf "  ${GREY}%-15s${RESET} %8s ${RED}%s${RESET}\n" \
    "Optimism" "8,000ms" "15.1x slower"
printf "  ${GREY}%-15s${RESET} %8s ${RED}%s${RESET}\n" \
    "Polygon PoS" "14,000ms" "26.4x slower"

echo -e "\n${BOLD}Transaction Latency:${RESET}\n"

printf "  ${BLUE}%-15s${RESET} ${BOLD}%8s${RESET} ${GREY}%s${RESET}\n" \
    "Linera" "150ms" "🏆 WINNER"
printf "  ${GREY}%-15s${RESET} %8s\n" "Sui" "480ms"
printf "  ${GREY}%-15s${RESET} %8s\n" "Aptos" "500ms"
printf "  ${GREY}%-15s${RESET} %8s\n" "Optimism" "1,000ms"
printf "  ${GREY}%-15s${RESET} %8s\n" "Solana" "1,200ms"
printf "  ${GREY}%-15s${RESET} %8s\n" "Polygon PoS" "2,000ms"

echo -e "\n${BOLD}Key Advantages:${RESET}\n"
echo -e "  ${BLUE}✓${RESET} Microchain architecture (no contention)"
echo -e "  ${BLUE}✓${RESET} Instant finality (sub-second)"
echo -e "  ${BLUE}✓${RESET} Unlimited horizontal scalability"
echo -e "  ${BLUE}✓${RESET} Predictable performance (no gas wars)"

echo -e "\n${GREY}Run full benchmarks: ${BLUE}./scripts/run_and_display_benchmarks.sh${RESET}"
echo -e "${GREY}View web UI: ${BLUE}cd frontend && npm run dev${RESET}\n"
