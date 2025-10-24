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
  ORACLE: '16f282df931295c6e6c1201444135ee11d26bcfdd003f1a7f38283cdc8ac96f9',
  MARKET: '22b417a675df8caa440161061a5a7209e1ae2c9e8a9b0f40de16d6756f8de993',
  USER: '60f252f3cdeeefcc0ad3160b4f010f22a6b3e8cf026c2876b3e2f86b91a7a1cb',
};
