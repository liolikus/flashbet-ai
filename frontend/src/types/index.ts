// FlashBet AI - TypeScript Types
// Mirrors Rust types from Linera contracts

export type MarketId = string; // @deprecated - Use EventId as primary key
export type EventId = string;
export type ApplicationId = string;
export type ChainId = string;
export type Amount = string; // String representation of u128

// Outcome enum
export const Outcome = {
  Home: 'Home',
  Away: 'Away',
  Draw: 'Draw',
} as const;

export type Outcome = typeof Outcome[keyof typeof Outcome];

// Market Status enum
export const MarketStatus = {
  Open: 'Open',
  Locked: 'Locked',
  Resolved: 'Resolved',
  Cancelled: 'Cancelled',
} as const;

export type MarketStatus = typeof MarketStatus[keyof typeof MarketStatus];

// Bet structure
export interface Bet {
  eventId: EventId; // Primary key for multi-market architecture
  marketId?: MarketId; // @deprecated - Legacy field
  user: ChainId;
  outcome: Outcome;
  amount: Amount;
  timestamp: number;
  odds?: number;
}

// Market Info
export interface MarketInfo {
  eventId: EventId; // Primary key for multi-market architecture
  marketId?: MarketId; // @deprecated - Legacy field
  description: string;
  closeTime: number;
  eventTime: number;
  homeTeam?: string;
  awayTeam?: string;
}

// Market State (from Market Chain)
export interface MarketState {
  info: MarketInfo;
  status: MarketStatus;
  pools: Record<Outcome, Amount>;
  totalPool: Amount;
  betCount: number;
  winningOutcome?: Outcome;
}

// User State (from User Chain)
export interface UserState {
  balance: Amount;
  activeBets: Bet[];
  betHistory: Bet[];
  totalBets: number;
  totalWinnings: Amount;
}

// Oracle Result
export interface OracleResult {
  eventId: string;
  outcome: Outcome;
  timestamp: number;
  score?: string;
}

// GraphQL Query Variables
export interface DepositVariables {
  amount: Amount;
}

export interface PlaceBetVariables {
  marketChain: ChainId;
  eventId: EventId; // Primary key for multi-market architecture
  outcome: Outcome;
  amount: Amount;
}

export interface CreateMarketVariables {
  eventId: string;
  description: string;
  closeTime: number;
  eventTime: number;
}

export interface PublishResultVariables {
  eventId: string;
  outcome: Outcome;
  score?: string;
}

// UI-specific types
export interface MarketCardProps {
  market: MarketState;
  onPlaceBet: (eventId: EventId, outcome: Outcome, amount: Amount) => void;
}

export interface BetFormData {
  outcome: Outcome;
  amount: string;
}

// Utility types for odds calculation
export interface OddsCalculation {
  outcome: Outcome;
  odds: number;
  payout: Amount;
}
