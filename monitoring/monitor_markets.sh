#!/bin/bash

# FlashBet AI - Market Monitoring Script
# Tracks active markets and adds new ones when count is low

set -e

CHAIN_ID="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
MARKET_APP="8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"
BASE_URL="http://localhost:8080"

# Configuration
MIN_MARKETS=5          # Minimum number of active markets
TARGET_MARKETS=10      # Target number to maintain
LOG_FILE="/tmp/market_monitor.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to get current market count
get_market_count() {
    MARKETS=$(curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ allMarkets }"}' 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo "0"
        return 1
    fi

    COUNT=$(echo "$MARKETS" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', {}).get('allMarkets', [])))" 2>/dev/null || echo "0")
    echo "$COUNT"
}

# Function to get list of all markets
get_all_markets() {
    curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ allMarkets }"}' | python3 -c "import sys, json; markets = json.load(sys.stdin).get('data', {}).get('allMarkets', []); print('\n'.join(markets))"
}

# Function to create a new market
create_market() {
    local event_id="$1"
    local description="$2"
    local event_time="$3"
    local home_team="$4"
    local away_team="$5"

    curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"mutation { createMarket(input: { eventId: \\\"$event_id\\\", description: \\\"$description\\\", eventTime: $event_time, marketType: MATCH_WINNER, homeTeam: \\\"$home_team\\\", awayTeam: \\\"$away_team\\\" }) }\"}" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "✅"
        return 0
    else
        echo "❌"
        return 1
    fi
}

# Function to add new markets when count is low
add_new_markets() {
    local current_count=$1
    local needed=$((TARGET_MARKETS - current_count))

    log_message "${YELLOW}Adding $needed new markets to reach target of $TARGET_MARKETS${NC}"

    # Current timestamp + various offsets for future events
    CURRENT_TIME=$(date +%s)

    # Array of potential new markets (rotate through these)
    # Format: event_id|description|days_offset|home_team|away_team
    MARKET_TEMPLATES=(
        "nba_lakers_warriors_$(date +%s)|NBA 2025: Lakers vs Warriors|1|Lakers|Warriors"
        "nfl_patriots_dolphins_$(date +%s)|NFL 2025: Patriots vs Dolphins|2|Patriots|Dolphins"
        "mlb_redsox_yankees_$(date +%s)|MLB 2025: Red Sox vs Yankees|3|Red Sox|Yankees"
        "nhl_bruins_canadiens_$(date +%s)|NHL 2025: Bruins vs Canadiens|4|Bruins|Canadiens"
        "soccer_barcelona_madrid_$(date +%s)|La Liga 2025: Barcelona vs Real Madrid|5|Barcelona|Real Madrid"
        "nba_heat_knicks_$(date +%s)|NBA 2025: Heat vs Knicks|6|Heat|Knicks"
        "nfl_packers_bears_$(date +%s)|NFL 2025: Packers vs Bears|7|Packers|Bears"
        "cricket_india_england_$(date +%s)|Cricket 2025: India vs England|8|India|England"
        "tennis_federer_nadal_$(date +%s)|Tennis 2025: Federer vs Nadal|9|Federer|Nadal"
        "ufc_mcgregor_diaz_$(date +%s)|UFC 2025: McGregor vs Diaz|10|McGregor|Diaz"
    )

    local added=0
    for i in $(seq 1 $needed); do
        # Pick a template (rotate through array)
        local template_index=$(( (i - 1) % ${#MARKET_TEMPLATES[@]} ))
        local template="${MARKET_TEMPLATES[$template_index]}"

        # Parse template
        IFS='|' read -r event_id description days_offset home_team away_team <<< "$template"

        # Calculate event time (current time + days offset in microseconds)
        local event_time=$(( (CURRENT_TIME + (days_offset * 86400)) * 1000000 ))

        echo -n "   Creating: $description... "
        if create_market "$event_id" "$description" "$event_time" "$home_team" "$away_team"; then
            added=$((added + 1))
            log_message "Created market: $event_id"
        else
            log_message "${RED}Failed to create market: $event_id${NC}"
        fi

        # Small delay between creations
        sleep 0.5
    done

    log_message "${GREEN}Successfully added $added new markets${NC}"
}

# Main monitoring function
monitor_markets() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   📊 FlashBet AI - Market Monitoring"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if service is running
    if ! curl -s -f "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -X POST -H "Content-Type: application/json" \
        -d '{"query":"{ allMarkets }"}' > /dev/null 2>&1; then
        log_message "${RED}ERROR: Linera service not responding at $BASE_URL${NC}"
        echo -e "${RED}❌ Service not running. Start with: ./scripts/start_service.sh${NC}"
        exit 1
    fi

    # Get current market count
    MARKET_COUNT=$(get_market_count)

    echo "Current Market Count: $MARKET_COUNT"
    echo "Minimum Required: $MIN_MARKETS"
    echo "Target: $TARGET_MARKETS"
    echo ""

    # Log status
    log_message "Market count: $MARKET_COUNT (min: $MIN_MARKETS, target: $TARGET_MARKETS)"

    # Check if we need to add markets
    if [ "$MARKET_COUNT" -lt "$MIN_MARKETS" ]; then
        echo -e "${RED}⚠️  WARNING: Market count ($MARKET_COUNT) below minimum ($MIN_MARKETS)${NC}"
        echo ""
        add_new_markets "$MARKET_COUNT"

        # Verify new count
        sleep 2
        NEW_COUNT=$(get_market_count)
        echo ""
        echo "New market count: $NEW_COUNT"
        log_message "Market count after adding: $NEW_COUNT"

    elif [ "$MARKET_COUNT" -lt "$TARGET_MARKETS" ]; then
        echo -e "${YELLOW}ℹ️  Market count ($MARKET_COUNT) below target ($TARGET_MARKETS)${NC}"
        echo ""
        read -p "Add markets to reach target? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            add_new_markets "$MARKET_COUNT"

            # Verify new count
            sleep 2
            NEW_COUNT=$(get_market_count)
            echo ""
            echo "New market count: $NEW_COUNT"
            log_message "Market count after adding: $NEW_COUNT"
        fi
    else
        echo -e "${GREEN}✅ Market count is healthy ($MARKET_COUNT >= $TARGET_MARKETS)${NC}"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   📋 Current Active Markets"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    get_all_markets | nl
    echo ""
}

# Function to run as cron job (silent mode)
monitor_markets_cron() {
    MARKET_COUNT=$(get_market_count)
    log_message "Cron check: Market count = $MARKET_COUNT"

    if [ "$MARKET_COUNT" -lt "$MIN_MARKETS" ]; then
        log_message "WARNING: Market count below minimum, auto-adding markets"
        add_new_markets "$MARKET_COUNT"
        NEW_COUNT=$(get_market_count)
        log_message "Market count after auto-add: $NEW_COUNT"
    fi
}

# Function to show statistics
show_stats() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   📊 Market Statistics"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Total Active Markets: $(get_market_count)"
    echo ""
    echo "Markets by Sport:"
    get_all_markets | grep -i "nba" | wc -l | xargs echo "  NBA:"
    get_all_markets | grep -i "nfl" | wc -l | xargs echo "  NFL:"
    get_all_markets | grep -i "mlb" | wc -l | xargs echo "  MLB:"
    get_all_markets | grep -i "nhl" | wc -l | xargs echo "  NHL:"
    get_all_markets | grep -i "soccer\|league" | wc -l | xargs echo "  Soccer:"
    get_all_markets | grep -i "cricket\|tennis\|ufc" | wc -l | xargs echo "  Other:"
    echo ""
    echo "Recent Log Entries:"
    tail -5 "$LOG_FILE" 2>/dev/null || echo "  No log entries yet"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --cron)
        monitor_markets_cron
        ;;
    --stats)
        show_stats
        ;;
    --add)
        CURRENT=$(get_market_count)
        add_new_markets "$CURRENT"
        ;;
    --help)
        echo "Usage: $0 [--cron|--stats|--add|--help]"
        echo ""
        echo "Options:"
        echo "  (no args)  Interactive monitoring (default)"
        echo "  --cron     Silent mode for cron jobs"
        echo "  --stats    Show market statistics"
        echo "  --add      Force add markets to reach target"
        echo "  --help     Show this help message"
        echo ""
        echo "Configuration (edit script to change):"
        echo "  MIN_MARKETS=$MIN_MARKETS"
        echo "  TARGET_MARKETS=$TARGET_MARKETS"
        echo "  LOG_FILE=$LOG_FILE"
        echo ""
        ;;
    *)
        monitor_markets
        ;;
esac
