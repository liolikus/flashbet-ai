//! User Chain - Personal betting chain for each user
//!
//! Handles balance management, bet placement, and payout reception.

use async_graphql::{Request, Response, SimpleObject};
use flashbet_shared::{EventId, MarketId, Outcome, Payout, UserEvent};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// FlashBet native token ticker symbol
pub const TICKER_SYMBOL: &str = "BET";

pub struct FlashbetUserAbi;

impl ContractAbi for FlashbetUserAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl ServiceAbi for FlashbetUserAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Response types for User operations
#[derive(Debug, Serialize, Deserialize)]
pub enum OperationResponse {
    /// Balance query response (returns Amount)
    Balance(Amount),
    /// Ticker symbol query response (returns String)
    TickerSymbol(String),
    /// Generic success response
    Ok,
}

/// Operations that users can perform on their User Chain
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Query native token balance for an account owner
    /// Follows native-fungible example pattern
    Balance {
        /// Account owner to query balance for
        owner: AccountOwner,
    },

    /// Query the ticker symbol for FlashBet native tokens
    /// Returns "BET"
    TickerSymbol,

    /// Transfer native tokens to another chain
    /// Uses runtime.transfer() for cross-chain transfers
    Transfer {
        /// Destination chain ID
        to_chain: ChainId,
        /// Amount to transfer (in native tokens)
        amount: Amount,
    },

    /// Place a bet on a market
    /// This operation transfers native tokens from user to Market chain
    PlaceBet {
        /// The Market Chain to send the bet to
        market_chain: ChainId,
        /// Market ID within that chain
        market_id: MarketId,
        /// Event ID for the market (for multi-market support)
        event_id: EventId,
        /// Chosen outcome (Home/Away/Draw)
        outcome: Outcome,
        /// Bet amount (in native tokens)
        amount: Amount,
    },
}

/// Messages sent/received by the User Chain
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Payout from a winning bet (received from Market Chain)
    Payout(Payout),

    /// Cross-chain bet message (sent to Market Chain)
    /// Must match Market Chain's Message::PlaceBet format
    PlaceBet { bet: flashbet_shared::Bet },
}

/// Instantiation argument for User Chain
/// Users receive native tokens via Linera's native token system
pub type InstantiationArgument = ();
