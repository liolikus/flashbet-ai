#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use flashbet_shared::{Bet, Payout};
use flashbet_user::Operation;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use self::state::FlashbetUserState;

pub struct FlashbetUserService {
    state: FlashbetUserState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(FlashbetUserService);

impl WithServiceAbi for FlashbetUserService {
    type Abi = flashbet_user::FlashbetUserAbi;
}

impl Service for FlashbetUserService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = FlashbetUserState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetUserService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        // Query native token balance (following native-fungible pattern)
        let chain_id = self.runtime.chain_id();

        // Get chain's native token balance using runtime API
        // This follows the native-fungible example pattern
        let balance = self.runtime.owner_balance(linera_sdk::linera_base_types::AccountOwner::CHAIN);

        let mut active_bets = Vec::new();
        self.state
            .active_bets
            .for_each_index_value(|_key, bet| {
                active_bets.push(bet.into_owned());
                Ok(())
            })
            .await
            .expect("Failed to iterate active bets");

        let mut bet_history = Vec::new();
        self.state
            .bet_history
            .for_each_index_value(|_key, bet| {
                bet_history.push(bet.into_owned());
                Ok(())
            })
            .await
            .expect("Failed to iterate bet history");

        let mut payout_history = Vec::new();
        self.state
            .payout_history
            .for_each_index_value(|_key, payout| {
                payout_history.push(payout.into_owned());
                Ok(())
            })
            .await
            .expect("Failed to iterate payout history");

        Schema::build(
            QueryRoot {
                chain_id,
                balance,
                active_bets,
                bet_history,
                payout_history,
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    chain_id: linera_sdk::linera_base_types::ChainId,
    balance: Amount,
    active_bets: Vec<Bet>,
    bet_history: Vec<Bet>,
    payout_history: Vec<Payout>,
}

#[Object]
impl QueryRoot {
    /// Get the chain ID
    async fn chain_id(&self) -> linera_sdk::linera_base_types::ChainId {
        self.chain_id
    }

    /// Get the user's current native token balance
    async fn balance(&self) -> Amount {
        self.balance
    }

    /// Get the ticker symbol for BET tokens
    async fn ticker_symbol(&self) -> String {
        "BET".to_string()
    }

    /// Get all active bets (not yet resolved)
    async fn active_bets(&self) -> &Vec<Bet> {
        &self.active_bets
    }

    /// Get complete betting history
    async fn bet_history(&self) -> &Vec<Bet> {
        &self.bet_history
    }

    /// Get complete payout history
    async fn payout_history(&self) -> &Vec<Payout> {
        &self.payout_history
    }

    /// Get total number of bets placed
    async fn total_bets(&self) -> u64 {
        self.bet_history.len() as u64
    }

    /// Get total number of payouts received
    async fn total_payouts(&self) -> u64 {
        self.payout_history.len() as u64
    }
}
