//! User Chain State
//!
//! Manages active bets and betting history.
//! Balances are now tracked via BET token application.

use flashbet_shared::{Bet, MarketId, Payout};
use linera_sdk::{
    linera_base_types::ApplicationId,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetUserState {
    /// BET token application ID for token operations
    /// Typed with FlashbetTokenAbi for cross-application calls
    pub bet_token_id: RegisterView<Option<ApplicationId<flashbet_token::FlashbetTokenAbi>>>,

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
