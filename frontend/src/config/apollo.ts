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

// Application IDs from deployment
export const APP_IDS = {
  CHAIN: '2ded66b2c1277f566a798343954aa0fb2297ed7f902d93de7cb7b6afe43e0299',
  ORACLE: '4354163cac4183dc17bef63ec9e8d22a949c6046d9f36092e1e1a53eb1ca0c99',
  MARKET: 'b50abb232c6bf41e9fd8ba315790f766d35b7c16da993eb3e2a112e5d5a31050',
  USER: '874a0002bcf3195f98bed4d26f6e2ea5f577f70c12d9d715ac97247d1b8bfb53',
};
