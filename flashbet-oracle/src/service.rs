#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use flashbet_oracle::Operation;
use flashbet_shared::{EventId, EventResult, Outcome};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Timestamp, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use self::state::FlashbetOracleState;

pub struct FlashbetOracleService {
    state: FlashbetOracleState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(FlashbetOracleService);

impl WithServiceAbi for FlashbetOracleService {
    type Abi = flashbet_oracle::FlashbetOracleAbi;
}

impl Service for FlashbetOracleService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = FlashbetOracleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetOracleService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let owner = self.state.owner.get().as_ref().expect("Owner not set").clone();
        let result_count = *self.state.result_count.get();

        // Get all event results
        let mut all_results = Vec::new();
        self.state
            .event_results
            .for_each_index_value(|_id, result| {
                all_results.push(result.into_owned());
                Ok(())
            })
            .await
            .expect("Failed to iterate results");

        // Get all authorized oracles
        let mut authorized_oracles = Vec::new();
        self.state
            .authorized_oracles
            .for_each_index(|oracle| {
                authorized_oracles.push(oracle.clone());
                Ok(())
            })
            .await
            .expect("Failed to iterate oracles");

        Schema::build(
            QueryRoot {
                owner,
                result_count,
                all_results,
                authorized_oracles,
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    owner: AccountOwner,
    result_count: u64,
    all_results: Vec<EventResult>,
    authorized_oracles: Vec<AccountOwner>,
}

#[Object]
impl QueryRoot {
    /// Get chain owner address
    async fn owner(&self) -> String {
        format!("{:?}", self.owner)
    }

    /// Get total number of published results
    async fn result_count(&self) -> u64 {
        self.result_count
    }

    /// Get all published event results
    async fn all_results(&self) -> &Vec<EventResult> {
        &self.all_results
    }

    /// Get list of authorized oracle addresses
    async fn authorized_oracles(&self) -> Vec<String> {
        self.authorized_oracles
            .iter()
            .map(|o| format!("{:?}", o))
            .collect()
    }

    /// Check if an address is an authorized oracle
    async fn is_authorized(&self, oracle: String) -> bool {
        // For Wave 1, simple string comparison
        self.authorized_oracles
            .iter()
            .any(|o| format!("{:?}", o) == oracle)
    }

    /// Get result for a specific event ID
    async fn get_result(&self, event_id: String) -> Option<EventResultView> {
        let search_id = EventId::new(event_id);
        self.all_results
            .iter()
            .find(|r| r.event_id == search_id)
            .map(|r| EventResultView {
                event_id: r.event_id.0.clone(),
                outcome: format!("{:?}", r.outcome),
                score_home: r.score.as_ref().map(|s| s.home),
                score_away: r.score.as_ref().map(|s| s.away),
                timestamp: r.timestamp.micros(),
            })
    }
}

/// GraphQL-friendly view of EventResult
struct EventResultView {
    event_id: String,
    outcome: String,
    score_home: Option<u32>,
    score_away: Option<u32>,
    timestamp: u64,
}

#[Object]
impl EventResultView {
    async fn event_id(&self) -> &String {
        &self.event_id
    }
    async fn outcome(&self) -> &String {
        &self.outcome
    }
    async fn score_home(&self) -> Option<u32> {
        self.score_home
    }
    async fn score_away(&self) -> Option<u32> {
        self.score_away
    }
    async fn timestamp(&self) -> u64 {
        self.timestamp
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use async_graphql::{Request, Response, Value};
    use futures::FutureExt as _;
    use linera_sdk::{util::BlockingWait, views::View, Service, ServiceRuntime};
    use serde_json::json;

    use super::{FlashbetOracleService, FlashbetOracleState};

    #[test]
    fn query() {
        let value = 60u64;
        let runtime = Arc::new(ServiceRuntime::<FlashbetOracleService>::new());
        let mut state = FlashbetOracleState::load(runtime.root_view_storage_context())
            .blocking_wait()
            .expect("Failed to read from mock key value store");
        state.value.set(value);

        let service = FlashbetOracleService { state, runtime };
        let request = Request::new("{ value }");

        let response = service
            .handle_query(request)
            .now_or_never()
            .expect("Query should not await anything");

        let expected = Response::new(Value::from_json(json!({"value": 60})).unwrap());

        assert_eq!(response, expected)
    }
}
