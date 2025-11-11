import { gql } from '@apollo/client';

/**
 * User Balance Query
 * Returns the user's BET token balance via User application
 */
export const GET_USER_BALANCE = gql`
  query GetUserBalance {
    balance
  }
`;

/**
 * Chain ID Query
 * Returns the chain ID
 */
export const GET_CHAIN_ID = gql`
  query GetChainId {
    chainId
  }
`;

/**
 * Ticker Symbol Query
 * Returns the token ticker symbol (e.g., "BET")
 */
export const GET_TICKER_SYMBOL = gql`
  query GetTickerSymbol {
    tickerSymbol
  }
`;

/**
 * All Markets Query
 * Returns list of all eventIds for markets on Market chain
 */
export const GET_ALL_MARKETS = gql`
  query GetAllMarkets {
    allMarkets
  }
`;

/**
 * Market Details Query
 * Fetches all fields for a specific market by eventId
 * Note: Uses string interpolation for now due to Linera's parameterized query pattern
 */
export const GET_MARKET_DETAILS = gql`
  query GetMarketDetails($eventId: String!) {
    eventId(eventId: $eventId)
    description(eventId: $eventId)
    homeTeam(eventId: $eventId)
    awayTeam(eventId: $eventId)
    eventTime(eventId: $eventId)
    status(eventId: $eventId)
    isResolved(eventId: $eventId)
    isOpen(eventId: $eventId)
    totalPool(eventId: $eventId)
    homePool(eventId: $eventId)
    awayPool(eventId: $eventId)
    drawPool(eventId: $eventId)
    betCount(eventId: $eventId)
    homeOdds(eventId: $eventId)
    awayOdds(eventId: $eventId)
    drawOdds(eventId: $eventId)
  }
`;

/**
 * Oracle Status Query
 * Returns information about the oracle application
 */
export const GET_ORACLE_STATUS = gql`
  query GetOracleStatus {
    chainId
  }
`;
