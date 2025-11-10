#!/bin/bash
# Update frontend configuration with current deployment IDs

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Update Frontend Config with Deployed IDs   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if we need to deploy first
if ! linera wallet show >/dev/null 2>&1; then
    echo -e "${RED}✗ Linera wallet not configured${NC}"
    echo "Please run: ./scripts/deploy.sh first"
    exit 1
fi

# Get chain ID
CHAIN=$(linera wallet show | grep "Public Key" -A 1 | tail -1 | awk '{print $1}')
OWNER=$(linera wallet show | grep "Owner" | head -1 | awk '{print $2}')

echo -e "${YELLOW}Current deployment:${NC}"
echo "  Chain:  $CHAIN"
echo "  Owner:  $OWNER"
echo ""

# Extract application IDs from wallet
echo -e "${YELLOW}Extracting Application IDs...${NC}"

# Get all application IDs
APPS=$(linera wallet show | grep -A 1000 "Applications" | grep -E "^[a-f0-9]{64}" | awk '{print $1}')

# Try to identify each app by querying its GraphQL schema
declare -A APP_MAP

for app in $APPS; do
    # Try to detect app type by checking if it has specific operations
    # This is a heuristic - may need adjustment
    if linera query-application "$CHAIN" "$app" --operation '"TickerSymbol"' >/dev/null 2>&1; then
        APP_MAP[TOKEN]=$app
        echo "  Found Token: $app"
    elif linera query-application "$CHAIN" "$app" --operation '{"PublishResult":{"result":{"event_id":"test","outcome":"HOME","score":{"home":0,"away":0},"timestamp":0}}}' 2>&1 | grep -q "Unauthorized\|Invalid\|not found"; then
        # Might be Oracle (rejects without authorization)
        APP_MAP[ORACLE]=$app
        echo "  Found Oracle: $app"
    fi
done

# If we can't auto-detect, ask user to run with deployment output
if [ ${#APP_MAP[@]} -lt 2 ]; then
    echo ""
    echo -e "${YELLOW}Could not auto-detect all applications.${NC}"
    echo -e "${YELLOW}Please provide the Application IDs from your deployment:${NC}"
    echo ""
    read -p "BET Token App ID: " TOKEN_APP
    read -p "Oracle App ID: " ORACLE_APP
    read -p "Market App ID: " MARKET_APP
    read -p "User App ID: " USER_APP
else
    # Use detected apps (this is basic - improve as needed)
    TOKEN_APP=${APP_MAP[TOKEN]}
    ORACLE_APP=${APP_MAP[ORACLE]}
    # For Market and User, we'd need more sophisticated detection
    echo ""
    echo -e "${YELLOW}Partial detection. Please provide missing IDs:${NC}"
    read -p "Market App ID: " MARKET_APP
    read -p "User App ID: " USER_APP
fi

echo ""
echo -e "${YELLOW}Updating frontend configuration...${NC}"

# Update the apollo.ts config file
cat > frontend/src/config/apollo.ts << EOF
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Linera uses chain and application-specific endpoints
// Format: http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}
//
// Environment Variables:
// - VITE_LINERA_GRAPHQL_URL: Your Linera GraphQL service endpoint
//   Development: http://localhost:8080
//   Production: http://YOUR_VPS_IP:8080 or https://your-domain.com
export const BASE_URL = import.meta.env.VITE_LINERA_GRAPHQL_URL || 'http://localhost:8080';

// HTTP link - will be overridden per query in components
const httpLink = new HttpLink({
  uri: \`\${BASE_URL}/chains/PLACEHOLDER/applications/PLACEHOLDER\`,
});

// Create Apollo Client
export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only', // Always fetch fresh data
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

// Application IDs from deployment with BET Token
export const APP_IDS = {
  // All applications deployed on same chain
  CHAIN: '$CHAIN',
  MARKET_CHAIN: '$CHAIN',
  ORACLE_CHAIN: '$CHAIN',
  TOKEN: '$TOKEN_APP',
  ORACLE: '$ORACLE_APP',
  MARKET: '$MARKET_APP',
  USER: '$USER_APP',
  // AccountOwner for the chain
  USER_ACCOUNT_OWNER: '$OWNER',
  ORACLE_ACCOUNT_OWNER: '$OWNER',
};
EOF

echo -e "${GREEN}✓ Frontend config updated!${NC}"
echo ""
echo -e "${YELLOW}Updated configuration:${NC}"
echo "  Chain:  $CHAIN"
echo "  Token:  $TOKEN_APP"
echo "  Oracle: $ORACLE_APP"
echo "  Market: $MARKET_APP"
echo "  User:   $USER_APP"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. cd frontend"
echo "  2. npm run build"
echo "  3. npm run preview  # Test locally"
echo "  4. git add . && git commit -m 'Update config'"
echo "  5. git push  # Deploy to Vercel"
echo ""
