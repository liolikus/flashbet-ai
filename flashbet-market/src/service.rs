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
        // Get all market IDs
        let all_market_ids = self.get_all_market_ids().await;

        // Pre-fetch data for all markets
        let mut markets_data = std::collections::HashMap::new();
        for event_id_str in &all_market_ids {
            let event_id = EventId::new(event_id_str.clone());
            let data = self.get_market_data(&event_id).await;
            let bets = self.get_market_bets(&event_id).await;
            markets_data.insert(event_id_str.clone(), (data, bets));
        }

        // Get latest market event ID for default queries
        let latest_event_id = self.get_latest_market_event_id().await;

        // Get Market chain's native token balance (escrow holding)
        // This follows the native-fungible example pattern
        let escrow_balance = self.runtime.owner_balance(
            linera_sdk::linera_base_types::AccountOwner::CHAIN
        );

        Schema::build(
            QueryRoot {
                all_market_ids,
                markets_data,
                latest_event_id,
                escrow_balance,
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

type MarketData = (MarketInfo, MarketStatus, Amount, Amount, Amount, Amount, u64);

struct QueryRoot {
    all_market_ids: Vec<String>,
    markets_data: std::collections::HashMap<String, (MarketData, Vec<Bet>)>,
    latest_event_id: Option<EventId>,
    escrow_balance: Amount,
}

#[Object]
impl QueryRoot {
    /// Get event ID (optionally specify eventId, defaults to latest market)
    async fn event_id(&self, event_id: Option<String>) -> String {
        self.resolve_event_id(event_id)
    }

    /// Get market description (optionally specify eventId, defaults to latest market)
    async fn description(&self, event_id: Option<String>) -> String {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((info, _, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            info.description.clone()
        } else {
            "Market not found".to_string()
        }
    }

    /// Get home team name (optionally specify eventId, defaults to latest market)
    async fn home_team(&self, event_id: Option<String>) -> String {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((info, _, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            info.home_team.clone()
        } else {
            "N/A".to_string()
        }
    }

    /// Get away team name (optionally specify eventId, defaults to latest market)
    async fn away_team(&self, event_id: Option<String>) -> String {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((info, _, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            info.away_team.clone()
        } else {
            "N/A".to_string()
        }
    }

    /// Get event time (as microseconds since epoch, optionally specify eventId, defaults to latest market)
    async fn event_time(&self, event_id: Option<String>) -> u64 {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((info, _, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            info.event_time.micros()
        } else {
            0
        }
    }

    /// Get current market status (as string, optionally specify eventId, defaults to latest market)
    async fn status(&self, event_id: Option<String>) -> String {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, status, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            format!("{:?}", status)
        } else {
            "Open".to_string()
        }
    }

    /// Check if market is resolved (optionally specify eventId, defaults to latest market)
    async fn is_resolved(&self, event_id: Option<String>) -> bool {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, status, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            matches!(status, MarketStatus::Resolved(_))
        } else {
            false
        }
    }

    /// Check if market is open for betting (optionally specify eventId, defaults to latest market)
    async fn is_open(&self, event_id: Option<String>) -> bool {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, status, _, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            matches!(status, MarketStatus::Open)
        } else {
            false
        }
    }

    /// Get total pool across all outcomes (optionally specify eventId, defaults to latest market)
    async fn total_pool(&self, event_id: Option<String>) -> Amount {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, total_pool, _, _, _, _), _)) = self.markets_data.get(&target_id) {
            *total_pool
        } else {
            Amount::ZERO
        }
    }

    /// Get betting pool for Home outcome (optionally specify eventId, defaults to latest market)
    async fn home_pool(&self, event_id: Option<String>) -> Amount {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, _, home_pool, _, _, _), _)) = self.markets_data.get(&target_id) {
            *home_pool
        } else {
            Amount::ZERO
        }
    }

    /// Get betting pool for Away outcome (optionally specify eventId, defaults to latest market)
    async fn away_pool(&self, event_id: Option<String>) -> Amount {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, _, _, away_pool, _, _), _)) = self.markets_data.get(&target_id) {
            *away_pool
        } else {
            Amount::ZERO
        }
    }

    /// Get betting pool for Draw outcome (optionally specify eventId, defaults to latest market)
    async fn draw_pool(&self, event_id: Option<String>) -> Amount {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, _, _, _, draw_pool, _), _)) = self.markets_data.get(&target_id) {
            *draw_pool
        } else {
            Amount::ZERO
        }
    }

    /// Get all bets placed on this market (optionally specify eventId, defaults to latest market)
    async fn all_bets(&self, event_id: Option<String>) -> Vec<Bet> {
        let target_id = self.resolve_event_id(event_id);
        if let Some((_, bets)) = self.markets_data.get(&target_id) {
            bets.clone()
        } else {
            Vec::new()
        }
    }

    /// Get total number of bets placed (optionally specify eventId, defaults to latest market)
    async fn bet_count(&self, event_id: Option<String>) -> u64 {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, _, _, _, _, bet_count), _)) = self.markets_data.get(&target_id) {
            *bet_count
        } else {
            0
        }
    }

    /// Get odds for Home outcome (optionally specify eventId, defaults to latest market)
    async fn home_odds(&self, event_id: Option<String>) -> f64 {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, total_pool, home_pool, _, _, _), _)) = self.markets_data.get(&target_id) {
            if *home_pool > Amount::ZERO {
                let total: u128 = (*total_pool).into();
                let home: u128 = (*home_pool).into();
                (total as f64) / (home as f64)
            } else {
                1.0
            }
        } else {
            1.0
        }
    }

    /// Get odds for Away outcome (optionally specify eventId, defaults to latest market)
    async fn away_odds(&self, event_id: Option<String>) -> f64 {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, total_pool, _, away_pool, _, _), _)) = self.markets_data.get(&target_id) {
            if *away_pool > Amount::ZERO {
                let total: u128 = (*total_pool).into();
                let away: u128 = (*away_pool).into();
                (total as f64) / (away as f64)
            } else {
                1.0
            }
        } else {
            1.0
        }
    }

    /// Get odds for Draw outcome (optionally specify eventId, defaults to latest market)
    async fn draw_odds(&self, event_id: Option<String>) -> f64 {
        let target_id = self.resolve_event_id(event_id);
        if let Some(((_, _, total_pool, _, _, draw_pool, _), _)) = self.markets_data.get(&target_id) {
            if *draw_pool > Amount::ZERO {
                let total: u128 = (*total_pool).into();
                let draw: u128 = (*draw_pool).into();
                (total as f64) / (draw as f64)
            } else {
                1.0
            }
        } else {
            1.0
        }
    }

    /// Get list of all market event IDs
    async fn all_markets(&self) -> Vec<String> {
        self.all_market_ids.clone()
    }

    /// Get Market chain's native token balance (total escrow balance)
    async fn escrow_balance(&self) -> Amount {
        self.escrow_balance
    }
}

impl QueryRoot {
    /// Helper: resolve eventId parameter to actual String (defaults to latest)
    fn resolve_event_id(&self, event_id: Option<String>) -> String {
        match event_id {
            Some(id) => id,
            None => self.latest_event_id.as_ref()
                .map(|e| e.0.clone())
                .unwrap_or_else(|| "none".to_string()),
        }
    }
}
