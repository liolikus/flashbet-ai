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

// Application IDs from Conway Testnet deployment
export const APP_IDS = {
  // All applications deployed on same chain for Conway testnet
  CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // User Chain (Conway)
  MARKET_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // Market Chain (Conway)
  ORACLE_CHAIN: '15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7', // Oracle Chain (Conway)
  ORACLE: 'd4a3c79502b626278c2d10457947440a7b72f86207ac2349e68fd7ece154ce01', // Conway testnet
  MARKET: '8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017', // Conway testnet (UPDATED with flexible event ID validation)
  USER: '8fd6c26d5068f53015fcf90f3770e325d55b98e27ddadb9054d60372f6421156', // Conway testnet
  // AccountOwner for Conway testnet
  USER_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
  // AccountOwner for Oracle Chain (same wallet owner)
  ORACLE_ACCOUNT_OWNER: '0x243f5325625508178f5a545d084fb5167a376e429adcf58683d959300f4cff3e',
};
