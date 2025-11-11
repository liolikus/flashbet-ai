/**
 * GraphQL Operations Index
 * Central export point for all GraphQL queries, mutations, fragments, and types
 */

// Queries
export {
  GET_USER_BALANCE,
  GET_CHAIN_ID,
  GET_TICKER_SYMBOL,
  GET_ALL_MARKETS,
  GET_MARKET_DETAILS,
  GET_ORACLE_STATUS,
} from './queries';

// Mutations
export {
  PLACE_BET,
  CREATE_MARKET,
  AUTHORIZE_ORACLE,
  PUBLISH_ORACLE_RESULT,
  PROCESS_ORACLE_RESULT,
  CLAIM_TOKENS,
} from './mutations';

// Fragments
export {
  MARKET_FIELDS_FRAGMENT,
  ORACLE_RESULT_FRAGMENT,
} from './fragments';

// Types
export type {
  // Query Response Types
  GetUserBalanceData,
  GetChainIdData,
  GetTickerSymbolData,
  GetAllMarketsData,
  GetMarketDetailsData,
  GetOracleStatusData,

  // Mutation Variable Types
  PlaceBetVariables,
  CreateMarketInput,
  CreateMarketVariables,
  AuthorizeOracleVariables,
  OracleResultInput,
  PublishOracleResultVariables,
  ProcessOracleResultVariables,
  ClaimTokensVariables,

  // Mutation Response Types
  PlaceBetData,
  CreateMarketData,
  AuthorizeOracleData,
  PublishOracleResultData,
  ProcessOracleResultData,
  ClaimTokensData,

  // Query Variable Types
  GetMarketDetailsVariables,
} from './types';
