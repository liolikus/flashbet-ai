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
}

/// Messages sent/received by the User Chain
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Payout from a winning bet (received from Market Chain)
    Payout(Payout),

    /// Cross-chain bet message (sent to Market Chain)
    CrossChainBet(flashbet_shared::Bet),
}

/// Instantiation argument for User Chain
#[derive(Debug, Deserialize, Serialize, SimpleObject)]
pub struct InstantiationArgument {
    /// Initial balance for the user
    pub initial_balance: Amount,
}
