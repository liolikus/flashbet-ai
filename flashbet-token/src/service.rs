#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use flashbet_token::Operation;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, WithServiceAbi},
    Service, ServiceRuntime,
};
use std::sync::Arc;

pub struct FlashbetTokenService {
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(FlashbetTokenService);

impl WithServiceAbi for FlashbetTokenService {
    type Abi = flashbet_token::FlashbetTokenAbi;
}

/// An entry in the account table.
#[derive(SimpleObject)]
pub struct AccountEntry {
    pub owner: AccountOwner,
    pub value: Amount,
}

/// The accounts query object
pub struct Accounts {
    runtime: Arc<ServiceRuntime<FlashbetTokenService>>,
}

#[Object]
impl Accounts {
    /// Query a single account balance
    async fn entry(&self, key: AccountOwner) -> AccountEntry {
        AccountEntry {
            owner: key,
            value: self.runtime.owner_balance(key),
        }
    }

    /// Query all account balances
    async fn entries(&self) -> Vec<AccountEntry> {
        self.runtime
            .owner_balances()
            .into_iter()
            .map(|(owner, value)| AccountEntry { owner, value })
            .collect()
    }

    /// Query all account owners
    async fn keys(&self) -> Vec<AccountOwner> {
        self.runtime.balance_owners()
    }
}

#[Object]
impl FlashbetTokenService {
    /// Get the ticker symbol
    async fn ticker_symbol(&self) -> String {
        flashbet_token::TICKER_SYMBOL.to_string()
    }

    /// Query accounts
    async fn accounts(&self) -> Accounts {
        Accounts {
            runtime: self.runtime.clone(),
        }
    }
}

impl Service for FlashbetTokenService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        FlashbetTokenService {
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            self.clone(),
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

impl Clone for FlashbetTokenService {
    fn clone(&self) -> Self {
        FlashbetTokenService {
            runtime: self.runtime.clone(),
        }
    }
}
