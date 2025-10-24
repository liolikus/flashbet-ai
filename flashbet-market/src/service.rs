#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use flashbet_market::Operation;
use flashbet_shared::{Bet, MarketInfo, MarketStatus, Outcome};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use self::state::FlashbetMarketState;

pub struct FlashbetMarketService {
    state: FlashbetMarketState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(FlashbetMarketService);

impl WithServiceAbi for FlashbetMarketService {
    type Abi = flashbet_market::FlashbetMarketAbi;
}

impl Service for FlashbetMarketService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = FlashbetMarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetMarketService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let info = self.state.info.get()
            .clone()
            .expect("Market not initialized - call CreateMarket operation first");
        let status = self.state.get_status().clone();
        let total_pool = self.state.get_total_pool();

        // Get pools for each outcome
        let home_pool = self.state.get_pool_for_outcome(&Outcome::Home).await;
        let away_pool = self.state.get_pool_for_outcome(&Outcome::Away).await;
        let draw_pool = self.state.get_pool_for_outcome(&Outcome::Draw).await;

        // Get all bets
        let mut all_bets = Vec::new();
        self.state
            .bets
            .for_each_index_value(|_id, bet| {
                all_bets.push(bet.into_owned());
                Ok(())
            })
            .await
            .expect("Failed to iterate bets");

        let bet_count = *self.state.bet_count.get();

        Schema::build(
            QueryRoot {
                info,
                status,
                total_pool,
                home_pool,
                away_pool,
                draw_pool,
                all_bets,
                bet_count,
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
    info: MarketInfo,
    status: MarketStatus,
    total_pool: Amount,
    home_pool: Amount,
    away_pool: Amount,
    draw_pool: Amount,
    all_bets: Vec<Bet>,
    bet_count: u64,
}

#[Object]
impl QueryRoot {
    /// Get event ID
    async fn event_id(&self) -> String {
        self.info.event_id.0.clone()
    }

    /// Get market description
    async fn description(&self) -> String {
        self.info.description.clone()
    }

    /// Get home team name
    async fn home_team(&self) -> String {
        self.info.home_team.clone()
    }

    /// Get away team name
    async fn away_team(&self) -> String {
        self.info.away_team.clone()
    }

    /// Get event time (as microseconds since epoch)
    async fn event_time(&self) -> u64 {
        self.info.event_time.micros()
    }

    /// Get current market status (as string for now)
    async fn status(&self) -> String {
        format!("{:?}", self.status)
    }

    /// Check if market is resolved
    async fn is_resolved(&self) -> bool {
        matches!(self.status, MarketStatus::Resolved(_))
    }

    /// Check if market is open for betting
    async fn is_open(&self) -> bool {
        matches!(self.status, MarketStatus::Open)
    }

    /// Get total pool across all outcomes
    async fn total_pool(&self) -> Amount {
        self.total_pool
    }

    /// Get betting pool for Home outcome
    async fn home_pool(&self) -> Amount {
        self.home_pool
    }

    /// Get betting pool for Away outcome
    async fn away_pool(&self) -> Amount {
        self.away_pool
    }

    /// Get betting pool for Draw outcome
    async fn draw_pool(&self) -> Amount {
        self.draw_pool
    }

    /// Get all bets placed on this market
    async fn all_bets(&self) -> &Vec<Bet> {
        &self.all_bets
    }

    /// Get total number of bets placed
    async fn bet_count(&self) -> u64 {
        self.bet_count
    }

    /// Get odds for Home outcome (based on pool distribution)
    async fn home_odds(&self) -> f64 {
        if self.home_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let home: u128 = self.home_pool.into();
            (total as f64) / (home as f64)
        } else {
            1.0 // Default odds if no bets yet
        }
    }

    /// Get odds for Away outcome (based on pool distribution)
    async fn away_odds(&self) -> f64 {
        if self.away_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let away: u128 = self.away_pool.into();
            (total as f64) / (away as f64)
        } else {
            1.0
        }
    }

    /// Get odds for Draw outcome (based on pool distribution)
    async fn draw_odds(&self) -> f64 {
        if self.draw_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let draw: u128 = self.draw_pool.into();
            (total as f64) / (draw as f64)
        } else {
            1.0
        }
    }
}
