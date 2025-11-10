use linera_sdk::{
    linera_base_types::{AccountOwner, Amount},
    views::{MapView, RootView},
};

/// Token state - stores balances for all accounts
#[derive(RootView)]
pub struct TokenState {
    /// Account balances
    pub balances: MapView<AccountOwner, Amount>,
}

impl TokenState {
    /// Get balance for an account (returns 0 if account doesn't exist)
    pub async fn get_balance(&self, owner: &AccountOwner) -> Amount {
        self.balances
            .get(owner)
            .await
            .expect("Failed to read balance")
            .unwrap_or(Amount::ZERO)
    }

    /// Credit tokens to an account
    pub async fn credit(&mut self, owner: &AccountOwner, amount: Amount) {
        let current = self.get_balance(owner).await;
        // Add amounts using saturating_add to prevent overflow
        let new_balance = current.saturating_add(amount);
        self.balances
            .insert(owner, new_balance)
            .expect("Failed to update balance");
    }

    /// Debit tokens from an account
    pub async fn debit(&mut self, owner: &AccountOwner, amount: Amount) {
        let current = self.get_balance(owner).await;
        assert!(current >= amount, "Insufficient balance");
        // Subtract amounts using saturating_sub
        let new_balance = current.saturating_sub(amount);
        self.balances
            .insert(owner, new_balance)
            .expect("Failed to update balance");
    }
}
