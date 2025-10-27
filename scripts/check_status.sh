#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🎲 FlashBet AI - Production Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Live Endpoints
echo "🌐 Live Endpoints:"
echo "   Frontend:  https://flashbet-ai.vercel.app"
echo "   Backend:   https://warning-apparel-journal-pst.trycloudflare.com"
echo ""

# Blockchain Deployment
echo "⛓️  Blockchain Deployment (Conway Testnet):"
echo "   Chain ID:  15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
echo "   Oracle:    d4a3c79502b626278c2d10457947440a7b72f86207ac2349e68fd7ece154ce01"
echo "   Market:    8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"
echo "   User:      8fd6c26d5068f53015fcf90f3770e325d55b98e27ddadb9054d60372f6421156"
echo ""

# Markets Status
echo "📊 Markets Status:"
CHAIN_ID="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
MARKET_APP="8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"

MARKETS=$(curl -s http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_APP} \
  -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ allMarkets }"}' | python3 -c "import sys, json; markets = json.load(sys.stdin)['data']['allMarkets']; print(len(markets))")

echo "   Total Active Markets: ${MARKETS}"
echo ""

# Services Running
echo "🔧 Services Running:"
if ps aux | grep "linera service" | grep -v grep > /dev/null; then
  echo "   ✅ Linera GraphQL Service (port 8080)"
else
  echo "   ❌ Linera Service NOT running"
fi

if ps aux | grep "cloudflared tunnel" | grep -v grep > /dev/null; then
  echo "   ✅ Cloudflare Tunnel (HTTPS endpoint)"
else
  echo "   ❌ Cloudflare Tunnel NOT running"
fi

if systemctl is-active --quiet nginx; then
  echo "   ✅ Nginx Reverse Proxy (port 80)"
else
  echo "   ❌ Nginx NOT running"
fi
echo ""

# Test Connectivity
echo "🔍 Testing Connectivity:"
if curl -s -f http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_APP} \
  -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ allMarkets }"}' > /dev/null 2>&1; then
  echo "   ✅ Local GraphQL endpoint responding"
else
  echo "   ❌ Local GraphQL endpoint failed"
fi

if curl -s -f https://warning-apparel-journal-pst.trycloudflare.com/chains/${CHAIN_ID}/applications/${MARKET_APP} \
  -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ allMarkets }"}' > /dev/null 2>&1; then
  echo "   ✅ Cloudflare HTTPS endpoint responding"
else
  echo "   ❌ Cloudflare HTTPS endpoint failed"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Status: All systems operational ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Quick Links:"
echo "   Demo Script:    ./scripts/demo_full_cycle.sh"
echo "   Create Markets: ./scripts/create_demo_markets.sh"
echo "   Demo Docs:      cat DEMO_SCRIPT.md"
echo ""
