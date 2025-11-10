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
  uri: `${BASE_URL}/chains/PLACEHOLDER/applications/PLACEHOLDER`,
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

// Application IDs from Local Testnet deployment (Native Token Integration + Transfer Operation)
export const APP_IDS = {
  // All applications deployed on same chain for local testnet
  CHAIN: '8e9b4031d41c1d2fcf85d9f422b4f26a6c69c1297558aa94cb6c806d706525fa', // Local testnet
  MARKET_CHAIN: '8e9b4031d41c1d2fcf85d9f422b4f26a6c69c1297558aa94cb6c806d706525fa', // Local testnet
  ORACLE_CHAIN: '8e9b4031d41c1d2fcf85d9f422b4f26a6c69c1297558aa94cb6c806d706525fa', // Local testnet
  ORACLE: '0b47afb1296d2a8eb5f588b21d36daa578ec481ced9da248896040f055f43b42', // Local testnet
  MARKET: 'ebfb477457ad2ee174fde46c96622293dacc1364c4678451cf65529c5bc7cab8', // Local testnet (Native Token Integration)
  USER: '478dd1d59316ab0390fdd6027b87d3bf52ad987f79763d289d16d8f3b44f9229', // Local testnet (Native Token Integration + Transfer)
  // AccountOwner for local testnet
  USER_ACCOUNT_OWNER: '0x8545151afa816e0794442bc3a7a83a0ee7ef9f4cc1e5e78611b00d118db9569a',
  // AccountOwner for Oracle Chain (same wallet owner)
  ORACLE_ACCOUNT_OWNER: '0x8545151afa816e0794442bc3a7a83a0ee7ef9f4cc1e5e78611b00d118db9569a',
};
