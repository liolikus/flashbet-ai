//! FlashBet AI - Shared Types Module
//!
//! This module contains all shared data structures, enums, and message types
//! used across the User, Market, and Oracle chains.

use async_graphql::{Enum, InputObject, Scalar, ScalarType, SimpleObject, Value};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ChainId, Timestamp};
use serde::{Deserialize, Serialize};
use std::fmt;

// ============================================================================
// Core Types
// ============================================================================

/// Unique identifier for a prediction market
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct MarketId(pub u64);

impl fmt::Display for MarketId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Market#{}", self.0)
    }
}

// GraphQL scalar implementation for MarketId
#[Scalar]
impl ScalarType for MarketId {
    fn parse(value: Value) -> async_graphql::InputValueResult<Self> {
        if let Value::Number(ref n) = value {
            if let Some(id) = n.as_u64() {
                Ok(MarketId(id))
            } else {
                Err(async_graphql::InputValueError::expected_type(value))
            }
        } else {
            Err(async_graphql::InputValueError::expected_type(value))
        }
    }

    fn to_value(&self) -> Value {
        Value::Number(self.0.into())
    }
}

/// Unique identifier for a sports event
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EventId(pub String);

impl EventId {
    pub fn new(event_id: impl Into<String>) -> Self {
        EventId(event_id.into())
    }
}

impl fmt::Display for EventId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// GraphQL scalar implementation for EventId
#[Scalar]
impl ScalarType for EventId {
    fn parse(value: Value) -> async_graphql::InputValueResult<Self> {
        if let Value::String(s) = value {
            Ok(EventId(s))
        } else {
            Err(async_graphql::InputValueError::expected_type(value))
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.clone())
    }
}

/// Possible outcomes for a prediction market
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Enum)]
pub enum Outcome {
    /// Home team / Team A wins
    Home,
    /// Away team / Team B wins
    Away,
    /// Tie/Draw outcome
    Draw,
}

impl fmt::Display for Outcome {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Outcome::Home => write!(f, "Home Win"),
            Outcome::Away => write!(f, "Away Win"),
            Outcome::Draw => write!(f, "Draw"),
        }
    }
}

/// Market status lifecycle
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketStatus {
    /// Market is open for betting
    Open,
    /// Market is locked, no more bets accepted (event started)
    Locked,
    /// Market is resolved with winning outcome
    Resolved(Outcome),
    /// Market is cancelled (event cancelled, refunds issued)
    Cancelled,
}

// Note: MarketStatus cannot use Enum derive because it has a variant with data
// GraphQL will use SimpleObject on structs that contain this type

impl fmt::Display for MarketStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MarketStatus::Open => write!(f, "Open"),
            MarketStatus::Locked => write!(f, "Locked"),
            MarketStatus::Resolved(outcome) => write!(f, "Resolved: {}", outcome),
            MarketStatus::Cancelled => write!(f, "Cancelled"),
        }
    }
}

/// Type of market/bet
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketType {
    /// Simple winner prediction (Home/Away/Draw)
    MatchWinner,
    /// Over/Under total points (future)
    OverUnder { line: u32 },
    /// Point spread (future)
    Spread { line: i32 },
}

// Note: MarketType cannot use Enum derive because it has variants with data
// GraphQL will use SimpleObject on structs that contain this type

/// GraphQL input version of MarketType (Wave 1: only MatchWinner)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum MarketTypeInput {
    /// Simple winner prediction (Home/Away/Draw)
    MatchWinner,
}

impl From<MarketTypeInput> for MarketType {
    fn from(input: MarketTypeInput) -> Self {
        match input {
            MarketTypeInput::MatchWinner => MarketType::MatchWinner,
        }
    }
}

// ============================================================================
// Structs
// ============================================================================

/// Score representation for sports events
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "ScoreInput")]
pub struct Score {
    /// Home team score
    pub home: u32,
    /// Away team score
    pub away: u32,
}

/// Information about a prediction market
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MarketInfo {
    /// Unique event identifier (e.g., "mlb_game_20251024_001")
    pub event_id: EventId,
    /// Human-readable description (e.g., "Yankees vs Red Sox")
    pub description: String,
    /// Scheduled event start time
    pub event_time: Timestamp,
    /// Type of market
    pub market_type: MarketType,
    /// Home team name
    pub home_team: String,
    /// Away team name
    pub away_team: String,
}

/// A single bet record
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "BetInput")]
pub struct Bet {
    /// Unique bet identifier
    pub bet_id: u64,
    /// Market this bet is for
    pub market_id: MarketId,
    /// User who placed the bet (account owner)
    pub user: AccountOwner,
    /// Chosen outcome
    pub outcome: Outcome,
    /// Bet amount in native tokens
    pub amount: Amount,
    /// When the bet was placed
    pub timestamp: Timestamp,
    /// User's chain ID (for payouts)
    pub user_chain: ChainId,
}

/// Result from oracle for a sports event
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "EventResultInput")]
pub struct EventResult {
    /// Event identifier matching MarketInfo
    pub event_id: EventId,
    /// Winning outcome
    pub outcome: Outcome,
    /// Optional final score
    pub score: Option<Score>,
    /// When the result was determined
    pub timestamp: Timestamp,
}

/// Payout information for a winning bet
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct Payout {
    /// Market that was resolved
    pub market_id: MarketId,
    /// Bet ID that won
    pub bet_id: u64,
    /// Payout amount (original bet + winnings)
    pub amount: Amount,
    /// When the payout was calculated
    pub timestamp: Timestamp,
}

// ============================================================================
// Cross-Chain Messages
// ============================================================================

/// Messages sent TO the User Chain
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserMessage {
    /// Payout from a winning bet
    Payout(Payout),
}

/// Messages sent TO the Market Chain
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketMessage {
    /// User placing a bet
    PlaceBet { bet: Bet },
}

// ============================================================================
// Events (for GraphQL subscriptions)
// ============================================================================

/// Events emitted by the User Chain
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserEvent {
    /// User placed a bet (includes full bet details for Market chain to process)
    BetPlaced {
        /// The Market chain this bet is for
        market_chain: ChainId,
        /// Full bet details
        bet: Bet,
    },
    /// User received a payout
    PayoutReceived {
        market_id: MarketId,
        bet_id: u64,
        amount: Amount,
    },
    /// User deposited funds
    Deposited { amount: Amount },
}

/// Events emitted by the Market Chain
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketEvent {
    /// New market created
    MarketCreated {
        market_id: MarketId,
        event_id: EventId,
        description: String,
    },
    /// Bet was placed on this market
    BetPlaced {
        market_id: MarketId,
        bet_id: u64,
        outcome: Outcome,
        amount: Amount,
        total_pool: Amount,
    },
    /// Market was resolved
    MarketResolved {
        market_id: MarketId,
        winning_outcome: Outcome,
        total_pool: Amount,
        winning_pool: Amount,
        num_winners: u64,
    },
    /// Market was locked (no more bets)
    MarketLocked { market_id: MarketId },
    /// Payout distributed to winner
    PayoutDistributed {
        market_id: MarketId,
        bet_id: u64,
        user_chain: ChainId,
        amount: Amount,
    },
}

/// Events emitted by the Oracle Chain
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum OracleEvent {
    /// New event result published
    ResultPublished { result: EventResult },
    /// New oracle authorized
    OracleAuthorized { oracle: AccountOwner },
}

// ============================================================================
// Error Types
// ============================================================================

/// Errors that can occur in FlashBet operations
#[derive(Debug, thiserror::Error)]
pub enum FlashBetError {
    #[error("Insufficient funds: required {required}, available {available}")]
    InsufficientFunds { required: Amount, available: Amount },

    #[error("Market not found: {0}")]
    MarketNotFound(MarketId),

    #[error("Market is not open: {0}")]
    MarketNotOpen(MarketStatus),

    #[error("Invalid bet amount: {0}")]
    InvalidBetAmount(Amount),

    #[error("Invalid outcome for market type")]
    InvalidOutcome,

    #[error("Market already resolved")]
    MarketAlreadyResolved,

    #[error("Unauthorized oracle")]
    UnauthorizedOracle,

    #[error("Event result already published: {0}")]
    DuplicateResult(EventId),

    #[error("Event result too old: age {age_seconds}s exceeds max {max_seconds}s")]
    StaleResult {
        age_seconds: u64,
        max_seconds: u64,
    },

    #[error("Invalid event ID format: {0}")]
    InvalidEventId(String),
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Validate event ID format (must start with sport prefix)
pub fn validate_event_id(event_id: &EventId) -> Result<(), FlashBetError> {
    let id = &event_id.0;
    if id.starts_with("mlb_") || id.starts_with("nba_") || id.starts_with("nfl_") {
        Ok(())
    } else {
        Err(FlashBetError::InvalidEventId(id.clone()))
    }
}

/// Validate outcome is valid for market type
pub fn validate_outcome_for_market(outcome: Outcome, market_type: &MarketType) -> bool {
    match market_type {
        MarketType::MatchWinner => true, // All outcomes valid
        MarketType::OverUnder { .. } => matches!(outcome, Outcome::Home | Outcome::Away), // Over=Home, Under=Away
        MarketType::Spread { .. } => matches!(outcome, Outcome::Home | Outcome::Away),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_id_display() {
        let id = MarketId(42);
        assert_eq!(format!("{}", id), "Market#42");
    }

    #[test]
    fn test_event_id_validation() {
        assert!(validate_event_id(&EventId::new("mlb_game_001")).is_ok());
        assert!(validate_event_id(&EventId::new("nba_game_001")).is_ok());
        assert!(validate_event_id(&EventId::new("invalid_001")).is_err());
    }

    #[test]
    fn test_outcome_validation() {
        let match_winner = MarketType::MatchWinner;
        assert!(validate_outcome_for_market(Outcome::Home, &match_winner));
        assert!(validate_outcome_for_market(Outcome::Away, &match_winner));
        assert!(validate_outcome_for_market(Outcome::Draw, &match_winner));

        let over_under = MarketType::OverUnder { line: 200 };
        assert!(validate_outcome_for_market(Outcome::Home, &over_under));
        assert!(validate_outcome_for_market(Outcome::Away, &over_under));
        assert!(!validate_outcome_for_market(Outcome::Draw, &over_under));
    }
}
