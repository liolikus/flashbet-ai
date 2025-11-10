#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{EmptySubscription, Request, Response, Schema};
use flashbet_token::Operation;
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::WithServiceAbi,
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

impl Service for FlashbetTokenService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        FlashbetTokenService {
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            async_graphql::EmptyMutation,
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}
