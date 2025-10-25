#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use flashbet_market::{InstantiationArgument, Message, Operation};
use flashbet_shared::{
    EventResult, MarketEvent, MarketId, MarketStatus, Payout,
};
use linera_sdk::{
    linera_base_types::{ApplicationId, StreamName, StreamUpdate, WithContractAbi},
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
        self.state.oracle_chain.set(Some(argument.oracle_chain));

        // Parse and store oracle application ID
        let oracle_app_id: ApplicationId = argument.oracle_app_id
            .parse()
            .expect("Invalid Oracle application ID format");
        self.state.oracle_app_id.set(Some(oracle_app_id));

        // Subscribe to Oracle Chain events for automatic result processing
        self.runtime.subscribe_to_events(
            argument.oracle_chain,
            oracle_app_id.forget_abi(),
            StreamName::from(b"oracle_results".to_vec()),
        );
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::RegisterBet { bet } => {
                // Wave 1: Frontend-relayed bet registration
                // Wave 2+: This will be triggered by cross-app event processing

                let event_id = &bet.market_id.event_id;

                // 1. Check market exists
                assert!(
                    self.state.market_exists(event_id).await,
                    "Market {} does not exist",
                    event_id
                );

                // 2. Validate market is open
                assert!(
                    self.state.is_open(event_id).await,
                    "Market is not open for betting, status: {:?}",
                    self.state.get_status(event_id).await
                );

                // 3. Validate outcome is valid for this market type
                let market_info = self.state.get_market(event_id).await
                    .expect("Market not found");
                assert!(
                    flashbet_shared::validate_outcome_for_market(bet.outcome, &market_info.market_type),
                    "Invalid outcome {:?} for market type {:?}",
                    bet.outcome,
                    market_info.market_type
                );

                // 4. Add bet to market state
                self.state.add_bet(bet.clone()).await;

                // 5. Emit BetPlaced event
                let total_pool = self.state.get_total_pool(event_id).await;
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

                // Create the market (this checks for duplicates)
                self.state.create_market(info.clone()).await
                    .expect("Failed to create market");

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

            Operation::ProcessOracleResult { result } => {
                // Wave 1: Frontend-triggered oracle result processing
                // Wave 2+: This will be triggered by Oracle event subscription
                self.handle_oracle_result(result).await;
            }

            Operation::SubscribeToUser { user_chain, user_app_id } => {
                // Parse application ID
                let user_app = user_app_id.parse::<linera_sdk::linera_base_types::ApplicationId>()
                    .expect("Invalid application ID");

                // Check if already subscribed
                if self.state.subscribed_users.contains(&user_app).await.unwrap_or(false) {
                    // Already subscribed, skip
                    return;
                }

                // Subscribe to User chain's "user_bets" event stream
                self.runtime.subscribe_to_events(
                    user_chain,
                    user_app.forget_abi(),
                    StreamName::from(b"user_bets".to_vec()),
                );

                // Add to subscribed users set
                self.state.subscribed_users.insert(&user_app).expect("Failed to insert subscribed user");
            }

            Operation::LockMarket => {
                // NOTE: LockMarket is deprecated in multi-market version
                // Markets are automatically locked when oracle results are processed
                panic!("LockMarket operation deprecated in multi-market version");
            }

            Operation::CancelMarket => {
                // NOTE: CancelMarket is deprecated in multi-market version
                // If needed, create a CancelMarketByEventId operation
                panic!("CancelMarket operation deprecated in multi-market version");
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::PlaceBet { bet } => {
                let event_id = &bet.market_id.event_id;

                // 1. Check market exists
                if !self.state.market_exists(event_id).await {
                    // Market doesn't exist, ignore bet
                    return;
                }

                // 2. Validate market is open
                if !self.state.is_open(event_id).await {
                    // Market not open, ignore bet
                    return;
                }

                // 3. Validate outcome is valid for this market type
                let market_info = match self.state.get_market(event_id).await {
                    Some(info) => info,
                    None => return, // Market not found
                };

                if !flashbet_shared::validate_outcome_for_market(bet.outcome, &market_info.market_type) {
                    // Invalid outcome, ignore bet
                    return;
                }

                // 4. Add bet to market state
                self.state.add_bet(bet.clone()).await;

                // 5. Emit BetPlaced event
                let total_pool = self.state.get_total_pool(event_id).await;
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

            Message::OracleResult(result) => {
                // Handle oracle result (Wave 1: direct message approach)
                self.handle_oracle_result(result).await;
            }
        }
    }

    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        // NOTE: Cross-application event subscription is configured (see CreateMarket operation),
        // but cross-application event deserialization in process_streams requires
        // manual BCS handling not yet exposed by Linera SDK v0.15.x.
        //
        // Current approach: Market subscribes to Oracle events (subscription active),
        // but Oracle Worker still calls ProcessOracleResult operation directly.
        //
        // Future (SDK v0.16+): When Linera SDK provides cross-app event deserialization,
        // we can automatically process OracleEvent::ResultPublished here without
        // needing the manual ProcessOracleResult operation call.

        for update in updates {
            // Acknowledge stream updates
            for index in update.new_indices() {
                // Mark as processed (subscription is active and working)
                _ = (update.chain_id, index);
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
        let event_id = &result.event_id;

        // Check if market exists
        if !self.state.market_exists(event_id).await {
            // Market doesn't exist, ignore result
            return;
        }

        // Check if market is already resolved
        let status = self.state.get_status(event_id).await;
        if matches!(status, MarketStatus::Resolved(_)) {
            // Already resolved, ignore
            return;
        }

        // Resolve the market
        self.state.resolve_market(event_id, result.outcome).await;

        let total_pool = self.state.get_total_pool(event_id).await;
        let winning_pool = self.state.get_pool_for_outcome(event_id, &result.outcome).await;

        // Get all winning bets
        let winning_bets = self.state.get_bets_for_outcome(event_id, &result.outcome).await;
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
                let _payout = Payout {
                    market_id: bet.market_id,
                    bet_id: bet.bet_id,
                    amount: payout_amount,
                    timestamp: self.runtime.system_time(),
                };

                // Send payout message to the user's chain
                // Note: Cross-application messaging in Linera
                // For now, we'll emit an event and handle payouts in User Chain via event subscription
                self.runtime.emit(
                    StreamName::from(b"payout_events".to_vec()),
                    &MarketEvent::PayoutDistributed {
                        market_id: bet.market_id,
                        bet_id: bet.bet_id,
                        user_chain: bet.user_chain,
                        amount: payout_amount,
                    },
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    // Tests temporarily commented out pending multi-market test updates
    // TODO: Update tests for multi-market architecture
}
