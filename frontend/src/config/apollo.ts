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

// Application IDs from Local Testnet deployment (Native Token Integration)
export const APP_IDS = {
  // All applications deployed on same chain for local testnet
  CHAIN: 'f72fba0e0af9faec630ab63f05f801622c8d62799aca2e5cb5c2b359f95c516e', // Local testnet
  MARKET_CHAIN: 'f72fba0e0af9faec630ab63f05f801622c8d62799aca2e5cb5c2b359f95c516e', // Local testnet
  ORACLE_CHAIN: 'f72fba0e0af9faec630ab63f05f801622c8d62799aca2e5cb5c2b359f95c516e', // Local testnet
  ORACLE: '4be0984e8077f10a08eb00b4464e00d2f75f46e3ac2ce44b864c4db37bc5bf29', // Local testnet
  MARKET: '0e694ac7be7384ea87ca4d92b50a7828b869c9721112192cec524d9607dc4853', // Local testnet (Native Token Integration)
  USER: '8d2ec2ac59adfccc5acfd5bb5b113ce6b3bc126dc9e5aecaaa66e4c43243afaa', // Local testnet (Native Token Integration)
  // AccountOwner for local testnet
  USER_ACCOUNT_OWNER: '0xb94fab4f7c746ecb4de0c0da52dd4cb74cec8edd88d1d8d3772dabe20497c154',
  // AccountOwner for Oracle Chain (same wallet owner)
  ORACLE_ACCOUNT_OWNER: '0xb94fab4f7c746ecb4de0c0da52dd4cb74cec8edd88d1d8d3772dabe20497c154',
};
