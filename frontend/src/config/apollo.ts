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
  ORACLE: '289a0d0fee542805dd2668e89b4abb3310e6866f8fa04bff624d958cc3ed7886',
  MARKET: '29845b48d94cbe9a5887caa7e3722664683a7b05378a75327d37885a26f382c2',
  USER: 'a02b4c371e82f07abf4528854a7d033254de9bc00a61be0417f16c2322a08d65',
  // AccountOwner for User Chain (Wave 1: hardcoded for demo)
  USER_ACCOUNT_OWNER: '0xdbc3e7d07b2175fdd625e68d670d772a4d232b4b938c2803e743e1959daf4f3f',
  // AccountOwner for Oracle Chain (for authorizing oracle)
  ORACLE_ACCOUNT_OWNER: '0xc0dbcca80ebf9fb8b776417568481fef9268fd99929f0886d4b96923f924bcf4',
};
