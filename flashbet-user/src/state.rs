//! User Chain State
//!
//! Manages active bets and betting history.
//! Balances are now tracked via Linera's native token system (runtime.owner_balance()).

use flashbet_shared::{Bet, MarketId, Payout};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetUserState {
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
    /// Get next bet ID and increment counter
    pub fn get_next_bet_id(&mut self) -> u64 {
        let next_id = self.next_bet_id.get_mut();
        let id = *next_id;
        *next_id += 1;
        id
    }
}
