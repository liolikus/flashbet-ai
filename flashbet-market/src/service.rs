#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use flashbet_market::Operation;
use flashbet_shared::{Bet, EventId, MarketInfo, MarketStatus, MarketType, Outcome};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, Timestamp, WithServiceAbi},
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
        // Get the latest market's event_id (for backward compatibility)
        // In multi-market mode, queries default to latest market unless event_id is specified
        let latest_event_id = self.get_latest_market_event_id().await;

        let event_id_for_query = match &latest_event_id {
            Some(id) => id.clone(),
            None => EventId::new("none".to_string()),
        };

        // Get market info (or default if no markets exist)
        let (info, status, total_pool, home_pool, away_pool, draw_pool, bet_count) =
            if latest_event_id.is_some() {
                self.get_market_data(&event_id_for_query).await
            } else {
                // No markets exist yet - return defaults
                (
                    MarketInfo {
                        event_id: EventId::new("none".to_string()),
                        description: "No market created yet".to_string(),
                        event_time: Timestamp::from(0),
                        market_type: MarketType::MatchWinner,
                        home_team: "N/A".to_string(),
                        away_team: "N/A".to_string(),
                    },
                    MarketStatus::Open,
                    Amount::ZERO,
                    Amount::ZERO,
                    Amount::ZERO,
                    Amount::ZERO,
                    0,
                )
            };

        // Get all bets for this market
        let all_bets = self.get_market_bets(&event_id_for_query).await;

        // Get list of all market event IDs
        let all_market_ids = self.get_all_market_ids().await;

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
                all_market_ids,
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

impl FlashbetMarketService {
    /// Get the latest market's event ID (most recently created)
    async fn get_latest_market_event_id(&self) -> Option<EventId> {
        let mut latest_id: Option<EventId> = None;
        self.state
            .markets
            .for_each_index_value(|event_id, _info| {
                latest_id = Some(event_id.to_owned());
                Ok(())
            })
            .await
            .ok()?;
        latest_id
    }

    /// Get all market event IDs
    async fn get_all_market_ids(&self) -> Vec<String> {
        let mut ids = Vec::new();
        self.state
            .markets
            .for_each_index_value(|event_id, _info| {
                ids.push(event_id.0.clone());
                Ok(())
            })
            .await
            .expect("Failed to iterate markets");
        ids
    }

    /// Get market data for a specific event
    async fn get_market_data(
        &self,
        event_id: &EventId,
    ) -> (MarketInfo, MarketStatus, Amount, Amount, Amount, Amount, u64) {
        let info = self.state.get_market(event_id).await.unwrap_or_else(|| MarketInfo {
            event_id: event_id.clone(),
            description: "Market not found".to_string(),
            event_time: Timestamp::from(0),
            market_type: MarketType::MatchWinner,
            home_team: "N/A".to_string(),
            away_team: "N/A".to_string(),
        });

        let status = self.state.get_status(event_id).await;
        let total_pool = self.state.get_total_pool(event_id).await;
        let home_pool = self.state.get_pool_for_outcome(event_id, &Outcome::Home).await;
        let away_pool = self.state.get_pool_for_outcome(event_id, &Outcome::Away).await;
        let draw_pool = self.state.get_pool_for_outcome(event_id, &Outcome::Draw).await;
        let bet_count = self.state.get_bet_count(event_id).await;

        (info, status, total_pool, home_pool, away_pool, draw_pool, bet_count)
    }

    /// Get all bets for a specific market
    async fn get_market_bets(&self, event_id: &EventId) -> Vec<Bet> {
        let mut bets = Vec::new();
        self.state
            .bets
            .for_each_index_value(|(bet_event_id, _bet_id), bet| {
                if bet_event_id == *event_id {
                    bets.push(bet.into_owned());
                }
                Ok(())
            })
            .await
            .expect("Failed to iterate bets");
        bets
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
    all_market_ids: Vec<String>,
}

#[Object]
impl QueryRoot {
    /// Get event ID (defaults to latest market)
    async fn event_id(&self) -> String {
        self.info.event_id.0.clone()
    }

    /// Get market description (defaults to latest market)
    async fn description(&self) -> String {
        self.info.description.clone()
    }

    /// Get home team name (defaults to latest market)
    async fn home_team(&self) -> String {
        self.info.home_team.clone()
    }

    /// Get away team name (defaults to latest market)
    async fn away_team(&self) -> String {
        self.info.away_team.clone()
    }

    /// Get event time (as microseconds since epoch, defaults to latest market)
    async fn event_time(&self) -> u64 {
        self.info.event_time.micros()
    }

    /// Get current market status (as string, defaults to latest market)
    async fn status(&self) -> String {
        format!("{:?}", self.status)
    }

    /// Check if market is resolved (defaults to latest market)
    async fn is_resolved(&self) -> bool {
        matches!(self.status, MarketStatus::Resolved(_))
    }

    /// Check if market is open for betting (defaults to latest market)
    async fn is_open(&self) -> bool {
        matches!(self.status, MarketStatus::Open)
    }

    /// Get total pool across all outcomes (defaults to latest market)
    async fn total_pool(&self) -> Amount {
        self.total_pool
    }

    /// Get betting pool for Home outcome (defaults to latest market)
    async fn home_pool(&self) -> Amount {
        self.home_pool
    }

    /// Get betting pool for Away outcome (defaults to latest market)
    async fn away_pool(&self) -> Amount {
        self.away_pool
    }

    /// Get betting pool for Draw outcome (defaults to latest market)
    async fn draw_pool(&self) -> Amount {
        self.draw_pool
    }

    /// Get all bets placed on this market (defaults to latest market)
    async fn all_bets(&self) -> &Vec<Bet> {
        &self.all_bets
    }

    /// Get total number of bets placed (defaults to latest market)
    async fn bet_count(&self) -> u64 {
        self.bet_count
    }

    /// Get odds for Home outcome (defaults to latest market)
    async fn home_odds(&self) -> f64 {
        if self.home_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let home: u128 = self.home_pool.into();
            (total as f64) / (home as f64)
        } else {
            1.0
        }
    }

    /// Get odds for Away outcome (defaults to latest market)
    async fn away_odds(&self) -> f64 {
        if self.away_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let away: u128 = self.away_pool.into();
            (total as f64) / (away as f64)
        } else {
            1.0
        }
    }

    /// Get odds for Draw outcome (defaults to latest market)
    async fn draw_odds(&self) -> f64 {
        if self.draw_pool > Amount::ZERO {
            let total: u128 = self.total_pool.into();
            let draw: u128 = self.draw_pool.into();
            (total as f64) / (draw as f64)
        } else {
            1.0
        }
    }

    /// Get list of all market event IDs
    async fn all_markets(&self) -> &Vec<String> {
        &self.all_market_ids
    }
}
