/**
 * GraphQL Operation Types
 * Type definitions for query/mutation variables and responses
 */

import type { EventId, ChainId, Amount, Outcome } from '../types';

// ============================================================================
// Query Response Types
// ============================================================================

export interface GetUserBalanceData {
  balance: Amount;
}

export interface GetChainIdData {
  chainId: ChainId;
}

export interface GetTickerSymbolData {
  tickerSymbol: string;
}

export interface GetAllMarketsData {
  allMarkets: EventId[];
}

export interface GetMarketDetailsData {
  eventId: EventId;
  description: string;
  homeTeam?: string;
  awayTeam?: string;
  eventTime: number;
  status: string;
  isResolved: boolean;
  isOpen: boolean;
  totalPool: Amount;
  homePool: Amount;
  awayPool: Amount;
  drawPool: Amount;
  betCount: number;
  homeOdds: number;
  awayOdds: number;
  drawOdds: number;
}

export interface GetOracleStatusData {
  chainId: ChainId;
}

// ============================================================================
// Mutation Variable Types
// ============================================================================

export interface PlaceBetVariables {
  marketChain: ChainId;
  eventId: EventId;
  outcome: Outcome;
  amount: Amount;
}

export interface CreateMarketInput {
  eventId: EventId;
  description: string;
  eventTime: number;
  marketType: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface CreateMarketVariables {
  input: CreateMarketInput;
}

export interface AuthorizeOracleVariables {
  oracle: string;
}

export interface OracleResultInput {
  eventId: EventId;
  outcome: Outcome;
  timestamp: number;
  score?: { home: number; away: number };
}

export interface PublishOracleResultVariables {
  result: OracleResultInput;
}

export interface ProcessOracleResultVariables {
  result: OracleResultInput;
}

export interface ClaimTokensVariables {
  amount: Amount;
}

// ============================================================================
// Mutation Response Types
// ============================================================================

export interface PlaceBetData {
  placeBet: string; // Transaction hash
}

export interface CreateMarketData {
  createMarket: string; // Transaction hash
}

export interface AuthorizeOracleData {
  authorizeOracle: string; // Transaction hash
}

export interface PublishOracleResultData {
  publishResult: string; // Transaction hash
}

export interface ProcessOracleResultData {
  processOracleResult: string; // Transaction hash
}

export interface ClaimTokensData {
  claim: string; // Transaction hash
}

// ============================================================================
// Query Variable Types
// ============================================================================

export interface GetMarketDetailsVariables {
  eventId: EventId;
}
