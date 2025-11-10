//! FlashBet Token (BET) - Fungible token for the FlashBet betting platform
//!
//! A simple fungible token application following Linera's native-fungible pattern

use async_graphql::Request;
use linera_sdk::{
    abis::fungible::{InitialState, FungibleResponse},
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// Token ticker symbol
pub const TICKER_SYMBOL: &str = "BET";

pub struct FlashbetTokenAbi;

impl ContractAbi for FlashbetTokenAbi {
    type Operation = Operation;
    type Response = FungibleResponse;
}

impl ServiceAbi for FlashbetTokenAbi {
    type Query = Request;
    type QueryResponse = async_graphql::Response;
}

/// Token operations
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Query token balance for an account owner
    Balance {
        /// Account owner to query
        owner: AccountOwner,
    },

    /// Query the ticker symbol
    TickerSymbol,

    /// Claim tokens from the CHAIN balance (for testing/demo)
    /// Transfers tokens from CHAIN to the caller
    Claim {
        /// Amount to claim
        amount: Amount,
    },

    /// Transfer tokens to another account on the same chain
    Transfer {
        /// Recipient account owner
        to: AccountOwner,
        /// Amount to transfer
        amount: Amount,
    },

    /// Transfer tokens to an account on another chain
    TransferCrossChain {
        /// Destination chain
        destination: ChainId,
        /// Recipient account owner
        to: AccountOwner,
        /// Amount to transfer
        amount: Amount,
    },
}

/// Cross-chain messages
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Credit tokens to an account (cross-chain transfer arrival)
    Credit {
        /// Recipient
        owner: AccountOwner,
        /// Amount to credit
        amount: Amount,
    },
}
