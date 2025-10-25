import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Linera uses chain and application-specific endpoints
// Format: http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}
const BASE_URL = 'http://localhost:8080';

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

// Application IDs from deployment (separate chains for cross-chain messaging)
export const APP_IDS = {
  CHAIN: 'fe63387ba41a621967b44bd078a03b1dd2821984c2c261fc93d97a01a1fdeefd', // User Chain
  MARKET_CHAIN: '8287cb972a617fc1c648bcf4a8ed6dd9f61c9c80607bdd98055540447caf7786', // Market Chain (for queries and mutations)
  ORACLE_CHAIN: '2ded66b2c1277f566a798343954aa0fb2297ed7f902d93de7cb7b6afe43e0299', // Oracle Chain
  ORACLE: 'e2646fcfe6fa7538d03f977089d46d8f445f69a01f689973ea4b8e28a9d63522',
  MARKET: '418d460849bc59357c844ef2bff2840a68d707e8f0d8374d31a7a65bd6be80da',
  USER: '749383362ba7305eeb770d020014458e4c47078840a8eada81f172c28769958c',
  // AccountOwner for User Chain (Wave 1: hardcoded for demo)
  USER_ACCOUNT_OWNER: '0xdbc3e7d07b2175fdd625e68d670d772a4d232b4b938c2803e743e1959daf4f3f',
};
