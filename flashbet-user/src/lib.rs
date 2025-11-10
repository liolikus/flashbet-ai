//! User Chain - Personal betting chain for each user
//!
//! Handles balance management, bet placement, and payout reception.
//! Uses BET token application for all token operations.

use async_graphql::{Request, Response, SimpleObject};
use flashbet_shared::{EventId, MarketId, Outcome, Payout, UserEvent};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, ApplicationId, ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

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
    /// Query BET token balance for an account owner
    /// Calls BET token application's Balance operation
    Balance {
        /// Account owner to query balance for
        owner: AccountOwner,
    },

    /// Query the ticker symbol for BET tokens
    /// Calls BET token application's TickerSymbol operation
    /// Returns "BET"
    TickerSymbol,

    /// Transfer BET tokens to another chain
    /// Calls BET token application's TransferCrossChain operation
    Transfer {
        /// Destination chain ID
        to_chain: ChainId,
        /// Amount to transfer (in BET tokens)
        amount: Amount,
    },

    /// Place a bet on a market
    /// Calls BET token application to transfer tokens from user to Market chain
    PlaceBet {
        /// The Market Chain to send the bet to
        market_chain: ChainId,
        /// Market ID within that chain
        market_id: MarketId,
        /// Event ID for the market (for multi-market support)
        event_id: EventId,
        /// Chosen outcome (Home/Away/Draw)
        outcome: Outcome,
        /// Bet amount (in BET tokens)
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
/// Requires BET token ApplicationId for token operations
#[derive(Debug, Deserialize, Serialize, SimpleObject)]
pub struct InstantiationArgument {
    /// BET token application ID for calling token operations
    /// Stored without type parameter for GraphQL compatibility
    pub bet_token_id: ApplicationId,
}
