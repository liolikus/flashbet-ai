#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use flashbet_market::{InstantiationArgument, Message, Operation};
use flashbet_shared::{
    EventResult, MarketEvent, MarketId, MarketStatus, Payout, UserMessage,
};
use linera_sdk::{
    linera_base_types::{ApplicationId, StreamName, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::FlashbetMarketState;

pub struct FlashbetMarketContract {
    state: FlashbetMarketState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(FlashbetMarketContract);

impl WithContractAbi for FlashbetMarketContract {
    type Abi = flashbet_market::FlashbetMarketAbi;
}

impl Contract for FlashbetMarketContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InstantiationArgument;
    type EventValue = MarketEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = FlashbetMarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetMarketContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        // Validate application parameters
        self.runtime.application_parameters();

        // Store oracle chain ID
        self.state.oracle_chain.set(argument.oracle_chain);

        // Subscribe to Oracle Chain events
        // This allows us to receive event results automatically
        self.runtime.subscribe(
            argument.oracle_chain,
            StreamName::from(b"oracle_events".to_vec()),
        );

        // Initialize bet count
        self.state.bet_count.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::CreateMarket { input } => {
                // Validate event ID format
                let event_id = flashbet_shared::EventId::new(input.event_id.clone());
                flashbet_shared::validate_event_id(&event_id)
                    .expect("Invalid event ID format");

                // Convert input to MarketInfo
                let info = flashbet_shared::MarketInfo {
                    event_id: event_id.clone(),
                    description: input.description.clone(),
                    event_time: input.event_time,
                    market_type: input.market_type.into(), // Convert MarketTypeInput -> MarketType
                    home_team: input.home_team.clone(),
                    away_team: input.away_team.clone(),
                };

                // Store market info
                self.state.info.set(info.clone());

                // Set initial status to Open
                self.state.status.set(MarketStatus::Open);

                // Initialize total pool
                self.state.total_pool.set(linera_sdk::linera_base_types::Amount::ZERO);

                // Emit MarketCreated event
                self.runtime.emit(
                    StreamName::from(b"market_events".to_vec()),
                    &MarketEvent::MarketCreated {
                        market_id: MarketId(0), // Market ID is based on chain creation
                        event_id,
                        description: input.description,
                    },
                );
            }

            Operation::LockMarket => {
                // Only allow locking if market is currently open
                assert!(
                    self.state.is_open(),
                    "Market is not open, current status: {:?}",
                    self.state.get_status()
                );

                self.state.lock_market();

                self.runtime.emit(
                    StreamName::from(b"market_events".to_vec()),
                    &MarketEvent::MarketLocked {
                        market_id: MarketId(0),
                    },
                );
            }

            Operation::CancelMarket => {
                // Can only cancel if not already resolved
                let status = self.state.get_status();
                assert!(
                    !matches!(status, MarketStatus::Resolved(_)),
                    "Cannot cancel already resolved market"
                );

                self.state.cancel_market();

                // TODO: Implement refunds to all bettors
                // For Wave 1, we'll skip refund logic
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::PlaceBet { bet } => {
                // 1. Validate market is open
                assert!(
                    self.state.is_open(),
                    "Market is not open for betting, status: {:?}",
                    self.state.get_status()
                );

                // 2. Validate outcome is valid for this market type
                let market_info = self.state.info.get();
                assert!(
                    flashbet_shared::validate_outcome_for_market(bet.outcome, &market_info.market_type),
                    "Invalid outcome {:?} for market type {:?}",
                    bet.outcome,
                    market_info.market_type
                );

                // 3. Add bet to market state
                self.state.add_bet(bet.clone()).await;

                // 4. Emit BetPlaced event
                let total_pool = self.state.get_total_pool();
                self.runtime.emit(
                    StreamName::from(b"market_events".to_vec()),
                    &MarketEvent::BetPlaced {
                        market_id: bet.market_id,
                        bet_id: bet.bet_id,
                        outcome: bet.outcome,
                        amount: bet.amount,
                        total_pool,
                    },
                );
            }

            Message::OracleResult(_) => {
                // Oracle results come via event streams, not direct messages
                // This variant exists for type safety but shouldn't be called
            }
        }
    }

    async fn process_streams(&mut self) {
        // Process Oracle events to automatically resolve markets
        let oracle_chain = *self.state.oracle_chain.get();

        // Read all new events from the Oracle stream
        let updates = self.runtime.query_events_from(
            oracle_chain,
            StreamName::from(b"oracle_events".to_vec()),
        );

        for event_update in updates {
            // Parse the event
            if let Ok(oracle_event) = serde_json::from_slice::<flashbet_shared::OracleEvent>(&event_update.value) {
                match oracle_event {
                    flashbet_shared::OracleEvent::ResultPublished { result } => {
                        self.handle_oracle_result(result).await;
                    }
                    _ => {
                        // Ignore other oracle events (like OracleAuthorized)
                    }
                }
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl FlashbetMarketContract {
    /// Handle an oracle result and resolve the market
    async fn handle_oracle_result(&mut self, result: EventResult) {
        // Check if this result is for our market
        let market_info = self.state.info.get();
        if result.event_id != market_info.event_id {
            // Not for this market, ignore
            return;
        }

        // Check if market is already resolved
        if matches!(self.state.get_status(), MarketStatus::Resolved(_)) {
            // Already resolved, ignore
            return;
        }

        // Resolve the market
        self.state.resolve_market(result.outcome);

        let total_pool = self.state.get_total_pool();
        let winning_pool = self.state.get_pool_for_outcome(&result.outcome).await;

        // Get all winning bets
        let winning_bets = self.state.get_bets_for_outcome(&result.outcome).await;
        let num_winners = winning_bets.len() as u64;

        // Emit MarketResolved event
        self.runtime.emit(
            StreamName::from(b"market_events".to_vec()),
            &MarketEvent::MarketResolved {
                market_id: MarketId(0),
                winning_outcome: result.outcome,
                total_pool,
                winning_pool,
                num_winners,
            },
        );

        // Distribute payouts to winners
        for bet in winning_bets {
            let payout_amount = self.state.calculate_payout(&bet, &result.outcome).await;

            if payout_amount > linera_sdk::linera_base_types::Amount::ZERO {
                let payout = Payout {
                    market_id: bet.market_id,
                    bet_id: bet.bet_id,
                    amount: payout_amount,
                    timestamp: self.runtime.system_time(),
                };

                // Send payout message to the user's chain
                let user_app_id = ApplicationId {
                    application_description_hash: self.runtime.application_id().application_description_hash,
                };

                self.runtime
                    .prepare_message(UserMessage::Payout(payout))
                    .send_to(bet.user_chain);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use flashbet_market::InstantiationArgument;
    use flashbet_shared::MarketTypeInput;
    use futures::FutureExt;
    use linera_sdk::{linera_base_types::{ChainId, Timestamp}, util::BlockingWait, views::View, ContractRuntime};

    #[test]
    fn test_instantiate() {
        let mut contract = create_contract();
        let oracle_chain = ChainId::root(0);

        contract
            .instantiate(InstantiationArgument { oracle_chain })
            .now_or_never()
            .expect("Instantiation should not await");

        assert_eq!(*contract.state.oracle_chain.get(), oracle_chain);
        assert_eq!(*contract.state.bet_count.get(), 0);
    }

    #[test]
    fn test_create_market() {
        let mut contract = create_and_instantiate_contract();

        let input = flashbet_market::CreateMarketInput {
            event_id: "mlb_game_20251024_001".to_string(),
            description: "Yankees vs Red Sox".to_string(),
            event_time: Timestamp::from(1729800000000000),
            market_type: MarketTypeInput::MatchWinner,
            home_team: "Yankees".to_string(),
            away_team: "Red Sox".to_string(),
        };

        contract
            .execute_operation(Operation::CreateMarket { input: input.clone() })
            .now_or_never()
            .expect("CreateMarket should not await");

        let stored_info = contract.state.info.get();
        assert_eq!(stored_info.description, input.description);
        assert_eq!(stored_info.home_team, input.home_team);
        assert_eq!(stored_info.away_team, input.away_team);
        assert!(contract.state.is_open());
    }

    fn create_contract() -> FlashbetMarketContract {
        let runtime = ContractRuntime::new().with_application_parameters(());
        FlashbetMarketContract {
            state: FlashbetMarketState::load(runtime.root_view_storage_context())
                .blocking_wait()
                .expect("Failed to load state"),
            runtime,
        }
    }

    fn create_and_instantiate_contract() -> FlashbetMarketContract {
        let mut contract = create_contract();
        let oracle_chain = ChainId::root(0);

        contract
            .instantiate(InstantiationArgument { oracle_chain })
            .now_or_never()
            .expect("Instantiation should not await");

        contract
    }
}
