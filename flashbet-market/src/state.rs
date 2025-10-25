//! Market Chain State
//!
//! Manages multiple prediction markets' betting pools and resolution.

use flashbet_shared::{Bet, EventId, MarketInfo, MarketStatus, Outcome};
use linera_sdk::{
    linera_base_types::{Amount, ApplicationId, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, SetView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetMarketState {
    /// Markets indexed by EventId
    /// Maps EventId -> MarketInfo
    pub markets: MapView<EventId, MarketInfo>,

    /// Market status for each event
    /// Maps EventId -> MarketStatus
    pub statuses: MapView<EventId, MarketStatus>,

    /// Betting pools for each market and outcome
    /// Maps (EventId, Outcome) -> Amount
    pub pools: MapView<(EventId, Outcome), Amount>,

    /// All bets placed across all markets
    /// Maps (EventId, bet_id) -> Bet
    pub bets: MapView<(EventId, u64), Bet>,

    /// Total pool for each market
    /// Maps EventId -> Amount
    pub total_pools: MapView<EventId, Amount>,

    /// Bet counter for each market
    /// Maps EventId -> u64
    pub bet_counts: MapView<EventId, u64>,

    /// Oracle chain ID (shared across all markets)
    pub oracle_chain: RegisterView<Option<ChainId>>,

    /// Oracle application ID (shared across all markets)
    pub oracle_app_id: RegisterView<Option<ApplicationId>>,

    /// Subscribed User applications (shared across all markets)
    /// Tracks which User chains/apps we're listening to
    pub subscribed_users: SetView<ApplicationId>,
}

impl FlashbetMarketState {
    /// Get market info for a specific event
    pub async fn get_market(&self, event_id: &EventId) -> Option<MarketInfo> {
        self.markets
            .get(event_id)
            .await
            .ok()
            .flatten()
            .map(|info| info.to_owned())
    }

    /// Get current market status for a specific event
    pub async fn get_status(&self, event_id: &EventId) -> MarketStatus {
        self.statuses
            .get(event_id)
            .await
            .ok()
            .flatten()
            .map(|status| status.to_owned())
            .unwrap_or(MarketStatus::Open)
    }

    /// Check if market exists
    pub async fn market_exists(&self, event_id: &EventId) -> bool {
        self.markets.get(event_id).await.ok().flatten().is_some()
    }

    /// Check if market is open for betting
    pub async fn is_open(&self, event_id: &EventId) -> bool {
        matches!(
            self.statuses.get(event_id).await.ok().flatten().map(|s| s.to_owned()),
            Some(MarketStatus::Open)
        )
    }

    /// Get total pool amount for a market
    pub async fn get_total_pool(&self, event_id: &EventId) -> Amount {
        self.total_pools
            .get(event_id)
            .await
            .ok()
            .flatten()
            .map(|amount| amount.to_owned())
            .unwrap_or(Amount::ZERO)
    }

    /// Get pool amount for a specific outcome in a market
    pub async fn get_pool_for_outcome(&self, event_id: &EventId, outcome: &Outcome) -> Amount {
        self.pools
            .get(&(event_id.clone(), *outcome))
            .await
            .ok()
            .flatten()
            .map(|amount| amount.to_owned())
            .unwrap_or(Amount::ZERO)
    }

    /// Create a new market
    pub async fn create_market(&mut self, info: MarketInfo) -> Result<(), String> {
        // Check if market already exists
        if self.market_exists(&info.event_id).await {
            return Err(format!("Market {} already exists", info.event_id));
        }

        // Store market info
        self.markets
            .insert(&info.event_id, info.clone())
            .expect("Failed to insert market");

        // Set initial status to Open
        self.statuses
            .insert(&info.event_id, MarketStatus::Open)
            .expect("Failed to set market status");

        // Initialize total pool
        self.total_pools
            .insert(&info.event_id, Amount::ZERO)
            .expect("Failed to initialize total pool");

        // Initialize bet count
        self.bet_counts
            .insert(&info.event_id, 0)
            .expect("Failed to initialize bet count");

        Ok(())
    }

    /// Add bet to a market
    pub async fn add_bet(&mut self, bet: Bet) {
        let event_id = bet.event_id.clone();

        // Update pool for this outcome
        let current_pool = self.get_pool_for_outcome(&event_id, &bet.outcome).await;
        let new_pool = current_pool
            .try_add(bet.amount)
            .expect("Pool overflow");
        self.pools
            .insert(&(event_id.clone(), bet.outcome), new_pool)
            .expect("Failed to insert pool");

        // Update total pool
        let current_total = self.get_total_pool(&event_id).await;
        let new_total = current_total
            .try_add(bet.amount)
            .expect("Total pool overflow");
        self.total_pools
            .insert(&event_id, new_total)
            .expect("Failed to update total pool");

        // Store bet
        let bet_id = bet.bet_id;
        self.bets
            .insert(&(event_id.clone(), bet_id), bet)
            .expect("Failed to insert bet");

        // Increment bet count
        let current_count = self.bet_counts
            .get(&event_id)
            .await
            .ok()
            .flatten()
            .map(|c| c.to_owned())
            .unwrap_or(0);
        self.bet_counts
            .insert(&event_id, current_count + 1)
            .expect("Failed to increment bet count");
    }

    /// Lock a market (no more bets accepted)
    pub async fn lock_market(&mut self, event_id: &EventId) {
        self.statuses
            .insert(event_id, MarketStatus::Locked)
            .expect("Failed to lock market");
    }

    /// Resolve a market with winning outcome
    pub async fn resolve_market(&mut self, event_id: &EventId, winning_outcome: Outcome) {
        self.statuses
            .insert(event_id, MarketStatus::Resolved(winning_outcome))
            .expect("Failed to resolve market");
    }

    /// Cancel a market
    pub async fn cancel_market(&mut self, event_id: &EventId) {
        self.statuses
            .insert(event_id, MarketStatus::Cancelled)
            .expect("Failed to cancel market");
    }

    /// Get all bets for a specific outcome in a market
    pub async fn get_bets_for_outcome(&self, event_id: &EventId, outcome: &Outcome) -> Vec<Bet> {
        let mut bets = Vec::new();
        self.bets
            .for_each_index_value(|(bet_event_id, _bet_id), bet| {
                if bet_event_id == *event_id && &bet.outcome == outcome {
                    bets.push(bet.into_owned());
                }
                Ok(())
            })
            .await
            .expect("Failed to iterate bets");
        bets
    }

    /// Get bet count for a market
    pub async fn get_bet_count(&self, event_id: &EventId) -> u64 {
        self.bet_counts
            .get(event_id)
            .await
            .ok()
            .flatten()
            .map(|c| c.to_owned())
            .unwrap_or(0)
    }

    /// Calculate payout for a winning bet
    pub async fn calculate_payout(&self, bet: &Bet, winning_outcome: &Outcome) -> Amount {
        if &bet.outcome != winning_outcome {
            return Amount::ZERO;
        }

        let event_id = &bet.event_id;
        let total_pool = self.get_total_pool(event_id).await;
        let winning_pool = self.get_pool_for_outcome(event_id, winning_outcome).await;

        if winning_pool == Amount::ZERO {
            // No winners (shouldn't happen, but handle gracefully)
            return Amount::ZERO;
        }

        // Payout = (bet_amount / winning_pool) * total_pool
        // Convert to u128 for calculation
        let bet_amount: u128 = bet.amount.into();
        let total_pool_u128: u128 = total_pool.into();
        let winning_pool_u128: u128 = winning_pool.into();

        if winning_pool_u128 == 0 {
            return Amount::ZERO;
        }

        // Using checked math to prevent overflow
        let numerator = bet_amount.saturating_mul(total_pool_u128);
        let payout_u128 = numerator / winning_pool_u128;

        // Convert to Amount (from_attos takes u128)
        Amount::from_attos(payout_u128)
    }
}
