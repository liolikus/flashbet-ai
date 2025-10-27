#!/bin/bash

# FlashBet AI - Market Monitoring Daemon
# Runs continuously in background, monitors markets, auto-adds when low

set -e

CHAIN_ID="15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7"
MARKET_APP="8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017"
BASE_URL="http://localhost:8080"

# Configuration
MIN_MARKETS=5          # Minimum number - triggers auto-add
TARGET_MARKETS=10      # Target to reach when adding
CHECK_INTERVAL=300     # Check every 5 minutes (300 seconds)
LOG_FILE="/tmp/market_monitor_daemon.log"
PID_FILE="/tmp/market_monitor_daemon.pid"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to get current market count
get_market_count() {
    local count=$(curl -s -X POST "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ allMarkets }"}' 2>/dev/null | \
        python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', {}).get('allMarkets', [])))" 2>/dev/null || echo "0")
    echo "$count"
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

    return $?
}

# Function to add new markets
add_markets_to_target() {
    local current_count=$1
    local needed=$((TARGET_MARKETS - current_count))

    log_message "⚠️  TRIGGER: Market count ($current_count) below minimum ($MIN_MARKETS)"
    log_message "🔄 Auto-adding $needed markets to reach target ($TARGET_MARKETS)"

    CURRENT_TIME=$(date +%s)

    # Market templates
    MARKET_TEMPLATES=(
        "nba_auto_$(date +%s)_1|NBA 2025: Lakers vs Warriors|1|Lakers|Warriors"
        "nfl_auto_$(date +%s)_2|NFL 2025: Patriots vs Dolphins|2|Patriots|Dolphins"
        "mlb_auto_$(date +%s)_3|MLB 2025: Red Sox vs Yankees|3|Red Sox|Yankees"
        "nhl_auto_$(date +%s)_4|NHL 2025: Bruins vs Canadiens|4|Bruins|Canadiens"
        "soccer_auto_$(date +%s)_5|La Liga 2025: Barcelona vs Real Madrid|5|Barcelona|Real Madrid"
        "nba_auto_$(date +%s)_6|NBA 2025: Heat vs Knicks|6|Heat|Knicks"
        "nfl_auto_$(date +%s)_7|NFL 2025: Packers vs Bears|7|Packers|Bears"
        "cricket_auto_$(date +%s)_8|Cricket 2025: India vs England|8|India|England"
        "tennis_auto_$(date +%s)_9|Tennis 2025: Djokovic vs Nadal|9|Djokovic|Nadal"
        "ufc_auto_$(date +%s)_10|UFC 2025: McGregor vs Diaz|10|McGregor|Diaz"
    )

    local added=0
    for i in $(seq 1 $needed); do
        local template_index=$(( (i - 1) % ${#MARKET_TEMPLATES[@]} ))
        local template="${MARKET_TEMPLATES[$template_index]}"

        IFS='|' read -r event_id description days_offset home_team away_team <<< "$template"

        local event_time=$(( (CURRENT_TIME + (days_offset * 86400)) * 1000000 ))

        if create_market "$event_id" "$description" "$event_time" "$home_team" "$away_team"; then
            added=$((added + 1))
            log_message "✅ Created: $description"
        else
            log_message "❌ Failed: $description"
        fi

        sleep 0.5
    done

    log_message "✅ Successfully added $added new markets (now total: $((current_count + added)))"
}

# Function to check if service is healthy
check_service_health() {
    if ! curl -s -f "${BASE_URL}/chains/${CHAIN_ID}/applications/${MARKET_APP}" \
        -X POST -H "Content-Type: application/json" \
        -d '{"query":"{ allMarkets }"}' > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Main monitoring loop
monitor_loop() {
    log_message "🚀 Market Monitor Daemon started (PID: $$)"
    log_message "📊 Configuration: MIN=$MIN_MARKETS, TARGET=$TARGET_MARKETS, CHECK_INTERVAL=${CHECK_INTERVAL}s"

    while true; do
        # Check service health
        if ! check_service_health; then
            log_message "⚠️  Service health check failed, waiting..."
            sleep 60
            continue
        fi

        # Get current market count
        MARKET_COUNT=$(get_market_count)

        # Check if we need to add markets
        if [ "$MARKET_COUNT" -lt "$MIN_MARKETS" ]; then
            add_markets_to_target "$MARKET_COUNT"

            # Verify new count
            sleep 2
            NEW_COUNT=$(get_market_count)
            log_message "📊 Market count after auto-add: $NEW_COUNT"
        else
            log_message "✅ Market count healthy: $MARKET_COUNT (threshold: $MIN_MARKETS)"
        fi

        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done
}

# Handle signals
cleanup() {
    log_message "🛑 Market Monitor Daemon stopped (PID: $$)"
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Daemon already running with PID $OLD_PID"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

# Save PID
echo $$ > "$PID_FILE"

# Start monitoring
monitor_loop
