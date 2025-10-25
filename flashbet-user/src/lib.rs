//! User Chain - Personal betting chain for each user
//!
//! Handles balance management, bet placement, and payout reception.

use async_graphql::{Request, Response, SimpleObject};
use flashbet_shared::{MarketId, Outcome, Payout, UserEvent};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct FlashbetUserAbi;

impl ContractAbi for FlashbetUserAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for FlashbetUserAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that users can perform on their User Chain
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Place a bet on a market
    PlaceBet {
        /// The Market Chain to send the bet to
        market_chain: ChainId,
        /// Market ID within that chain
        market_id: MarketId,
        /// Chosen outcome (Home/Away/Draw)
        outcome: Outcome,
        /// Bet amount
        amount: Amount,
    },

    /// Deposit funds to the user's balance
    Deposit {
        /// Amount to deposit
        amount: Amount,
    },

    /// Receive a payout from a resolved market
    /// Wave 1: Called by frontend after market resolves
    /// Wave 2+: Will be triggered automatically via Market messages
    ReceivePayout {
        /// The payout information
        payout: Payout,
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
/// Wave 1: No init params - users start with zero and use Deposit
pub type InstantiationArgument = ();
