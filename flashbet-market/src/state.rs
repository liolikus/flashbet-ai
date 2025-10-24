//! Market Chain State
//!
//! Manages a single prediction market's betting pools and resolution.

use flashbet_shared::{Bet, MarketInfo, MarketStatus, Outcome};
use linera_sdk::{
    linera_base_types::{Amount, ApplicationId, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, SetView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetMarketState {
    /// Market information (event details, teams, etc.)
    pub info: RegisterView<Option<MarketInfo>>,

    /// Current market status
    pub status: RegisterView<Option<MarketStatus>>,

    /// Betting pools for each outcome
    /// Maps Outcome -> Total Amount bet on that outcome
    pub pools: MapView<Outcome, Amount>,

    /// All bets placed on this market
    /// Maps bet_id -> Bet
    pub bets: MapView<u64, Bet>,

    /// Total pool across all outcomes
    pub total_pool: RegisterView<Amount>,

    /// Oracle chain ID (for subscribing to results)
    pub oracle_chain: RegisterView<Option<ChainId>>,

    /// Counter for total number of bets
    pub bet_count: RegisterView<u64>,

    /// Subscribed User applications (for receiving bet events)
    /// Tracks which User chains/apps we're listening to
    pub subscribed_users: SetView<ApplicationId>,
}

impl FlashbetMarketState {
    /// Get current market status
    pub fn get_status(&self) -> MarketStatus {
        self.status.get().clone().unwrap_or(MarketStatus::Open)
    }

    /// Check if market is open for betting
    pub fn is_open(&self) -> bool {
        matches!(self.status.get(), Some(MarketStatus::Open))
    }

    /// Get total pool amount
    pub fn get_total_pool(&self) -> Amount {
        *self.total_pool.get()
    }

    /// Get pool amount for a specific outcome
    pub async fn get_pool_for_outcome(&self, outcome: &Outcome) -> Amount {
        self.pools
            .get(outcome)
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO)
    }

    /// Add bet to market
    pub async fn add_bet(&mut self, bet: Bet) {
        // Update pool for this outcome
        let current_pool = self
            .pools
            .get(&bet.outcome)
            .await
            .ok()
            .flatten()
            .unwrap_or(Amount::ZERO);
        let new_pool = current_pool
            .try_add(bet.amount)
            .expect("Pool overflow");
        self.pools
            .insert(&bet.outcome, new_pool)
            .expect("Failed to insert pool");

        // Update total pool
        let total = self.total_pool.get_mut();
        *total = total.try_add(bet.amount).expect("Total pool overflow");

        // Store bet
        let bet_id = bet.bet_id;
        self.bets
            .insert(&bet_id, bet)
            .expect("Failed to insert bet");

        // Increment bet count
        let count = self.bet_count.get_mut();
        *count += 1;
    }

    /// Lock the market (no more bets accepted)
    pub fn lock_market(&mut self) {
        *self.status.get_mut() = Some(MarketStatus::Locked);
    }

    /// Resolve the market with winning outcome
    pub fn resolve_market(&mut self, winning_outcome: Outcome) {
        *self.status.get_mut() = Some(MarketStatus::Resolved(winning_outcome));
    }

    /// Cancel the market
    pub fn cancel_market(&mut self) {
        *self.status.get_mut() = Some(MarketStatus::Cancelled);
    }

    /// Get all bets for a specific outcome
    pub async fn get_bets_for_outcome(&self, outcome: &Outcome) -> Vec<Bet> {
        let mut bets = Vec::new();
        self.bets
            .for_each_index_value(|_id, bet| {
                if &bet.outcome == outcome {
                    bets.push(bet.into_owned());
                }
                Ok(())
            })
            .await
            .expect("Failed to iterate bets");
        bets
    }

    /// Calculate payout for a winning bet
    pub async fn calculate_payout(&self, bet: &Bet, winning_outcome: &Outcome) -> Amount {
        if &bet.outcome != winning_outcome {
            return Amount::ZERO;
        }

        let total_pool = self.get_total_pool();
        let winning_pool = self.get_pool_for_outcome(winning_outcome).await;

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
