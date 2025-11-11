#!/bin/bash
# Initialize User chain with BET tokens

set -e

TOKEN_APP="781b840751e0397da8afee1a869bd216e89001c9356b3b76b4dc8923fe42351f"
CHAIN="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
USER_APP="dfcc282e744e3588372a9647659497af1319abad759e63313782e211f12f3b03"
OWNER="0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e"

echo "Claiming 10 BET tokens from supply..."
curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$TOKEN_APP" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { claim(amount: \\\"10.\\\") }\"}"

echo ""
echo "Checking balance..."
sleep 2

curl -s -X POST "http://localhost:8080/chains/$CHAIN/applications/$USER_APP" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ balance }"}' | python3 -m json.tool

echo ""
echo "✓ User balance initialized"
