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

// Application IDs from BET Token Deployment (Version 2)
export const APP_IDS = {
  // All applications deployed on same chain
  CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7',
  MARKET_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7',
  ORACLE_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7',
  TOKEN: '781b840751e0397da8afee1a869bd216e89001c9356b3b76b4dc8923fe42351f', // BET Token (50 supply)
  ORACLE: 'bd92f873e379c0b575c4605d7ad00ca15878f17e8438eaeb4897a70e5ed0d5bc',
  MARKET: 'a58d1eb3f46f18a3c3ac93146df51787be23363709bf5f4f427908bb922e8905',
  USER: 'dfcc282e744e3588372a9647659497af1319abad759e63313782e211f12f3b03',
  // AccountOwner for current deployment
  USER_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
  // AccountOwner for Oracle Chain (same wallet owner)
  ORACLE_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
};
