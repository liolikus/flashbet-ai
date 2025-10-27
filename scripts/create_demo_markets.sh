#!/bin/bash

CHAIN_ID="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
MARKET_APP="8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"
BASE_URL="http://localhost:8080"

echo "=== Creating 10 Demo Markets ==="
echo ""

echo "1️⃣ MLB World Series 2025 - Game 1: Yankees vs Dodgers..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"mlb_ws_2025_game_1\", description: \"World Series 2025 - Game 1: Yankees vs Dodgers\", eventTime: 1730077200000000, marketType: MATCH_WINNER, homeTeam: \"Yankees\", awayTeam: \"Dodgers\" }) }"}'
echo ""

echo "2️⃣ NBA Finals 2025: Lakers vs Celtics..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"nba_finals_2025_lakers_celtics\", description: \"NBA Finals 2025: Lakers vs Celtics\", eventTime: 1730250000000000, marketType: MATCH_WINNER, homeTeam: \"Lakers\", awayTeam: \"Celtics\" }) }"}'
echo ""

echo "3️⃣ NFL Playoffs: Chiefs vs Eagles..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"nfl_playoffs_chiefs_eagles\", description: \"NFL 2025 Playoffs: Chiefs vs Eagles\", eventTime: 1730336400000000, marketType: MATCH_WINNER, homeTeam: \"Chiefs\", awayTeam: \"Eagles\" }) }"}'
echo ""

echo "4️⃣ Premier League: Man City vs Arsenal..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"epl_2025_mancity_arsenal\", description: \"Premier League 2025: Man City vs Arsenal\", eventTime: 1730422800000000, marketType: MATCH_WINNER, homeTeam: \"Man City\", awayTeam: \"Arsenal\" }) }"}'
echo ""

echo "5️⃣ Champions League Final: Real Madrid vs Bayern Munich..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"ucl_final_2025_real_bayern\", description: \"Champions League 2025 Final: Real Madrid vs Bayern Munich\", eventTime: 1730509200000000, marketType: MATCH_WINNER, homeTeam: \"Real Madrid\", awayTeam: \"Bayern Munich\" }) }"}'
echo ""

echo "6️⃣ F1 Abu Dhabi Grand Prix: Verstappen vs Hamilton..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"f1_abudhabi_2025_ver_ham\", description: \"F1 Abu Dhabi GP 2025: Verstappen vs Hamilton\", eventTime: 1730595600000000, marketType: MATCH_WINNER, homeTeam: \"Verstappen\", awayTeam: \"Hamilton\" }) }"}'
echo ""

echo "7️⃣ Boxing Heavyweight Championship: Fury vs Joshua..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"boxing_fury_joshua_2025\", description: \"Heavyweight Championship 2025: Fury vs Joshua\", eventTime: 1730682000000000, marketType: MATCH_WINNER, homeTeam: \"Fury\", awayTeam: \"Joshua\" }) }"}'
echo ""

echo "8️⃣ Australian Open Final: Djokovic vs Alcaraz..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"ausopen_2025_djokovic_alcaraz\", description: \"Australian Open 2025 Final: Djokovic vs Alcaraz\", eventTime: 1730768400000000, marketType: MATCH_WINNER, homeTeam: \"Djokovic\", awayTeam: \"Alcaraz\" }) }"}'
echo ""

echo "9️⃣ NHL Stanley Cup: Maple Leafs vs Bruins..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"nhl_stanley_2025_leafs_bruins\", description: \"NHL Stanley Cup 2025: Maple Leafs vs Bruins\", eventTime: 1730854800000000, marketType: MATCH_WINNER, homeTeam: \"Maple Leafs\", awayTeam: \"Bruins\" }) }"}'
echo ""

echo "🔟 Cricket World Cup Final: India vs Australia..."
curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createMarket(input: { eventId: \"cwc_2025_final_ind_aus\", description: \"Cricket World Cup 2025 Final: India vs Australia\", eventTime: 1730941200000000, marketType: MATCH_WINNER, homeTeam: \"India\", awayTeam: \"Australia\" }) }"}'
echo ""

echo ""
echo "✅ All 10 markets created successfully!"
