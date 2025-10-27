#!/bin/bash

# Test FlashBet AI backend endpoint
CHAIN_ID="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
MARKET_APP="8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"
IP="109.205.179.214"

echo "Testing FlashBet AI backend at http://${IP} (via nginx proxy)"
echo ""

curl "http://${IP}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ allMarkets }"}'

echo ""
echo ""
echo "If you see JSON data above, your backend is working!"
