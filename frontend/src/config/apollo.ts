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

// Application IDs from Conway Testnet deployment
export const APP_IDS = {
  // All applications deployed on same chain for Conway testnet
  CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // User Chain (Conway)
  MARKET_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // Market Chain (Conway)
  ORACLE_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // Oracle Chain (Conway)
  ORACLE: '90df46516a4f1537ebd3928d0021bbf2aea88b830bc95f0075cdf0ff086bafae', // Conway testnet
  MARKET: '0e27ca73983601c97fb09317665cce3bb87c7a76658683d02ce53291f9af06d5', // Conway testnet
  USER: '879942fa885b00a798a67c9d207f42d96496b73b51cd57a63fc020d403aaa798', // Conway testnet
  // AccountOwner for Conway testnet
  USER_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
  // AccountOwner for Oracle Chain (same wallet owner)
  ORACLE_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
};
