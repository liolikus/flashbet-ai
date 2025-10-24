import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// GraphQL endpoint from Linera service
const HTTP_ENDPOINT = 'http://localhost:8080/graphql';
const WS_ENDPOINT = 'ws://localhost:8080/ws';

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: HTTP_ENDPOINT,
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_ENDPOINT,
  })
);

// Split traffic between HTTP and WebSocket based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Create Apollo Client
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
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
