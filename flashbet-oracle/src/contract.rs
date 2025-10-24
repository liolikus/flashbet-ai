#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use flashbet_oracle::{InstantiationArgument, Message, Operation};
use flashbet_shared::OracleEvent;
use linera_sdk::{
    linera_base_types::{StreamName, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::FlashbetOracleState;

pub struct FlashbetOracleContract {
    state: FlashbetOracleState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(FlashbetOracleContract);

impl WithContractAbi for FlashbetOracleContract {
    type Abi = flashbet_oracle::FlashbetOracleAbi;
}

impl Contract for FlashbetOracleContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InstantiationArgument;
    type EventValue = OracleEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = FlashbetOracleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetOracleContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        // Validate application parameters
        self.runtime.application_parameters();

        // Set the chain creator as owner
        let owner = self.runtime.authenticated_signer().expect("Missing signature");
        self.state.owner.set(Some(owner));

        // Authorize initial oracles
        for oracle in argument.initial_oracles {
            self.state
                .authorized_oracles
                .insert(&oracle)
                .expect("Failed to authorize initial oracle");
        }

        // Initialize result count
        self.state.result_count.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::PublishResult { result } => {
                // 1. Validate caller is authorized oracle
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("Must be signed operation");

                assert!(
                    self.state.is_authorized(&signer).await,
                    "Unauthorized oracle: {:?}",
                    signer
                );

                // 2. Check if this event already has a result (prevent duplicates)
                let existing = self
                    .state
                    .event_results
                    .get(&result.event_id)
                    .await
                    .ok()
                    .flatten();

                assert!(
                    existing.is_none(),
                    "Result already published for event: {}",
                    result.event_id.0
                );

                // 3. Store the result
                self.state.publish_result(result.clone()).await;

                // 4. Emit event for subscribers (Market Chains)
                self.runtime.emit(
                    StreamName::from(b"oracle_results".to_vec()),
                    &OracleEvent::ResultPublished {
                        result: result.clone(),
                    },
                );
            }

            Operation::AuthorizeOracle { oracle } => {
                // Only owner can authorize oracles
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("Must be signed operation");

                let owner = self.state.owner.get().expect("Owner not set");
                assert!(signer == owner, "Only owner can authorize oracles");

                // Add to authorized set
                self.state
                    .authorized_oracles
                    .insert(&oracle)
                    .expect("Failed to authorize oracle");

                // Emit event
                self.runtime.emit(
                    StreamName::from(b"oracle_events".to_vec()),
                    &OracleEvent::OracleAuthorized { oracle },
                );
            }

            Operation::RevokeOracle { oracle } => {
                // Only owner can revoke oracles
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("Must be signed operation");

                let owner = self.state.owner.get().expect("Owner not set");
                assert!(signer == owner, "Only owner can revoke oracles");

                // Remove from authorized set
                self.state
                    .authorized_oracles
                    .remove(&oracle)
                    .expect("Failed to revoke oracle");
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // Wave 1: No messages received
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

#[cfg(test)]
mod tests {
    use futures::FutureExt as _;
    use linera_sdk::{util::BlockingWait, views::View, Contract, ContractRuntime};

    use flashbet_oracle::Operation;

    use super::{FlashbetOracleContract, FlashbetOracleState};

    #[test]
    fn operation() {
        let initial_value = 10u64;
        let mut app = create_and_instantiate_app(initial_value);

        let increment = 10u64;

        let _response = app
            .execute_operation(Operation::Increment { value: increment })
            .now_or_never()
            .expect("Execution of application operation should not await anything");

        assert_eq!(*app.state.value.get(), initial_value + increment);
    }

    fn create_and_instantiate_app(initial_value: u64) -> FlashbetOracleContract {
        let runtime = ContractRuntime::new().with_application_parameters(());
        let mut contract = FlashbetOracleContract {
            state: FlashbetOracleState::load(runtime.root_view_storage_context())
                .blocking_wait()
                .expect("Failed to read from mock key value store"),
            runtime,
        };

        contract
            .instantiate(initial_value)
            .now_or_never()
            .expect("Initialization of application state should not await anything");

        assert_eq!(*contract.state.value.get(), initial_value);

        contract
    }
}
