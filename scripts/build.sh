#!/bin/bash
# FlashBet AI - Build Script
# Builds all three contracts to WASM

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FlashBet AI - Build All Contracts ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Start timer
START_TIME=$(date +%s)

# Build all contracts
echo -e "${YELLOW}Building WASM contracts...${NC}"
echo ""

cargo build --release --target wasm32-unknown-unknown

# End timer
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""
echo "Build time: ${DURATION}s"
echo ""
echo "WASM binaries location:"
echo "  target/wasm32-unknown-unknown/release/"
echo ""
echo "Generated files:"
ls -lh target/wasm32-unknown-unknown/release/*.wasm | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo -e "${GREEN}Ready for deployment!${NC}"
echo "Run: ./scripts/deploy.sh"
