//! Oracle Chain - Sports event results provider
//!
//! Publishes verified sports event results to be consumed by Market Chains.

use async_graphql::{Request, Response};
use flashbet_shared::EventResult;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct FlashbetOracleAbi;

impl ContractAbi for FlashbetOracleAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for FlashbetOracleAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that can be performed on the Oracle Chain
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Publish a new event result (only authorized oracles can call this)
    PublishResult { result: EventResult },

    /// Authorize a new oracle address (only owner can call this)
    AuthorizeOracle { oracle: AccountOwner },

    /// Revoke oracle authorization (only owner can call this)
    RevokeOracle { oracle: AccountOwner },
}

/// Messages received by the Oracle Chain
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    // Wave 1: No cross-chain messages received
    // Markets subscribe to Oracle events via event streams
}

/// Instantiation argument for Oracle Chain
#[derive(Debug, Deserialize, Serialize)]
pub struct InstantiationArgument {
    /// Initial oracle addresses to authorize
    pub initial_oracles: Vec<AccountOwner>,
}
