//! Oracle Chain State
//!
//! Stores sports event results and manages authorized oracle publishers.

use flashbet_shared::{EventId, EventResult};
use linera_sdk::{
    linera_base_types::AccountOwner,
    views::{linera_views, MapView, RegisterView, RootView, SetView, ViewStorageContext},
};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FlashbetOracleState {
    /// Published event results
    /// Maps EventId -> EventResult
    pub event_results: MapView<EventId, EventResult>,

    /// Authorized oracle publishers (can submit results)
    pub authorized_oracles: SetView<AccountOwner>,

    /// Oracle chain owner (can authorize new oracles)
    pub owner: RegisterView<Option<AccountOwner>>,

    /// Counter for total results published
    pub result_count: RegisterView<u64>,
}

impl FlashbetOracleState {
    /// Check if an oracle is authorized
    pub async fn is_authorized(&self, oracle: &AccountOwner) -> bool {
        self.authorized_oracles
            .contains(oracle)
            .await
            .unwrap_or(false)
    }

    /// Check if a result already exists for an event
    pub async fn has_result(&self, event_id: &EventId) -> bool {
        self.event_results
            .get(event_id)
            .await
            .ok()
            .flatten()
            .is_some()
    }

    /// Get result for an event
    pub async fn get_result(&self, event_id: &EventId) -> Option<EventResult> {
        self.event_results.get(event_id).await.ok().flatten()
    }

    /// Publish a new result
    pub async fn publish_result(&mut self, result: EventResult) {
        let event_id = result.event_id.clone();
        self.event_results
            .insert(&event_id, result)
            .expect("Failed to insert result");

        let count = self.result_count.get_mut();
        *count += 1;
    }

    /// Authorize a new oracle
    pub async fn authorize_oracle(&mut self, oracle: AccountOwner) {
        self.authorized_oracles
            .insert(&oracle)
            .expect("Failed to authorize oracle");
    }

    /// Revoke oracle authorization
    pub async fn revoke_oracle(&mut self, oracle: &AccountOwner) {
        self.authorized_oracles
            .remove(oracle)
            .expect("Failed to revoke oracle");
    }

    /// Get the owner
    pub fn get_owner(&self) -> Option<&AccountOwner> {
        self.owner.get().as_ref()
    }

    /// Check if an account is the owner
    pub fn is_owner(&self, account: &AccountOwner) -> bool {
        self.owner.get().as_ref() == Some(account)
    }
}
