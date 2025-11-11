import { gql } from '@apollo/client';

/**
 * Place Bet Mutation
 * Sends a bet to the User application, which forwards to Market chain
 */
export const PLACE_BET = gql`
  mutation PlaceBet(
    $marketChain: String!
    $eventId: String!
    $outcome: String!
    $amount: String!
  ) {
    placeBet(
      marketChain: $marketChain
      eventId: $eventId
      outcome: $outcome
      amount: $amount
    )
  }
`;

/**
 * Create Market Mutation
 * Creates a new betting market on the Market chain
 */
export const CREATE_MARKET = gql`
  mutation CreateMarket($input: CreateMarketInput!) {
    createMarket(input: $input)
  }
`;

/**
 * Authorize Oracle Mutation
 * Authorizes an oracle account to publish results
 */
export const AUTHORIZE_ORACLE = gql`
  mutation AuthorizeOracle($oracle: String!) {
    authorizeOracle(oracle: $oracle)
  }
`;

/**
 * Publish Oracle Result Mutation
 * Publishes an event result from the Oracle application
 */
export const PUBLISH_ORACLE_RESULT = gql`
  mutation PublishOracleResult($result: OracleResultInput!) {
    publishResult(result: $result)
  }
`;

/**
 * Process Oracle Result Mutation
 * Processes an oracle result on the Market chain to resolve a market
 */
export const PROCESS_ORACLE_RESULT = gql`
  mutation ProcessOracleResult($result: OracleResultInput!) {
    processOracleResult(result: $result)
  }
`;

/**
 * Claim Tokens Mutation
 * Claims BET tokens from the faucet (User application)
 */
export const CLAIM_TOKENS = gql`
  mutation ClaimTokens($amount: String!) {
    claim(amount: $amount)
  }
`;
