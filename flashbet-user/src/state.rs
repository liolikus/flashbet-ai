//! User Chain State
//!
//! Manages user balances, active bets, and betting history.

use flashbet_shared::{Bet, MarketId, Payout};
use linera_sdk::{
    linera_base_types::Amount,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetUserState {
    /// User's available balance for betting
    pub balance: RegisterView<Amount>,

    /// Active bets (not yet resolved)
    /// Maps MarketId -> Bet
    pub active_bets: MapView<MarketId, Bet>,

    /// Betting history (all bets ever placed)
    /// Maps bet_id -> Bet
    pub bet_history: MapView<u64, Bet>,

    /// Payout history (all payouts received)
    /// Maps bet_id -> Payout
    pub payout_history: MapView<u64, Payout>,

    /// Counter for generating unique bet IDs
    pub next_bet_id: RegisterView<u64>,
}

impl FlashbetUserState {
    /// Get the current balance
    pub fn get_balance(&self) -> Amount {
        *self.balance.get()
    }

    /// Check if user has sufficient funds
    pub fn has_sufficient_funds(&self, amount: Amount) -> bool {
        self.get_balance() >= amount
    }

    /// Debit balance (for placing bet)
    pub fn debit(&mut self, amount: Amount) {
        let balance = self.balance.get_mut();
        *balance = balance
            .try_sub(amount)
            .expect("Insufficient funds - should be checked before calling debit");
    }

    /// Credit balance (for deposit or payout)
    pub fn credit(&mut self, amount: Amount) {
        let balance = self.balance.get_mut();
        *balance = balance
            .try_add(amount)
            .expect("Balance overflow");
    }

    /// Get next bet ID and increment counter
    pub fn get_next_bet_id(&mut self) -> u64 {
        let next_id = self.next_bet_id.get_mut();
        let id = *next_id;
        *next_id += 1;
        id
    }
}
