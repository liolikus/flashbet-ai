//! Market Chain - Manages a single prediction market
//!
//! Handles bet collection, pool management, and payout distribution.

use async_graphql::{InputObject, Request, Response, SimpleObject};
use flashbet_shared::{Bet, EventId, EventResult, MarketTypeInput};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ChainId, ContractAbi, ServiceAbi, Timestamp},
};
use serde::{Deserialize, Serialize};

pub struct FlashbetMarketAbi;

impl ContractAbi for FlashbetMarketAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for FlashbetMarketAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Input for creating a new market
#[derive(Debug, Clone, Deserialize, Serialize, InputObject)]
pub struct CreateMarketInput {
    /// Event ID (e.g., "mlb_game_20251024_001")
    pub event_id: String,
    /// Human-readable description
    pub description: String,
    /// Scheduled event start time
    pub event_time: Timestamp,
    /// Type of market (Wave 1: only MatchWinner)
    pub market_type: MarketTypeInput,
    /// Home team name
    pub home_team: String,
    /// Away team name
    pub away_team: String,
}

/// Operations that can be performed on a Market Chain
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new market (only callable by market creator/admin)
    CreateMarket {
        /// Market information (event, teams, etc.)
        input: CreateMarketInput,
    },

    /// Register a bet from a User chain
    /// Wave 1: Called by frontend after user places bet
    /// Wave 2+: Will be triggered automatically via cross-app events
    RegisterBet {
        /// The bet to register
        bet: flashbet_shared::Bet,
    },

    /// Process an oracle result and resolve the market
    /// Wave 1: Called by frontend after oracle publishes result
    /// Wave 2+: Will be triggered automatically via Oracle event subscription
    ProcessOracleResult {
        /// The event result from Oracle
        result: flashbet_shared::EventResult,
    },

    /// Subscribe to a User chain to receive bet events
    /// This enables cross-application event streaming
    SubscribeToUser {
        /// User chain ID
        user_chain: ChainId,
        /// User application ID
        user_app_id: String,
    },

    /// Manually lock the market (no more bets accepted)
    LockMarket,

    /// Manually cancel the market (refund all bets)
    CancelMarket,
}

/// Messages received by the Market Chain
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Bet placement from a User Chain
    PlaceBet { bet: Bet },

    /// Oracle event result (received via event stream)
    OracleResult(EventResult),
}

/// Instantiation argument for Market Chain
#[derive(Debug, Deserialize, Serialize, SimpleObject, InputObject)]
#[graphql(input_name = "InstantiationArgumentInput")]
pub struct InstantiationArgument {
    /// Oracle Chain ID to subscribe to
    pub oracle_chain: ChainId,
    /// Oracle Application ID to subscribe to
    pub oracle_app_id: String,
}
