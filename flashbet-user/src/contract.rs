#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use flashbet_shared::{Bet, UserEvent};
use flashbet_user::{InstantiationArgument, Message, Operation};
use linera_sdk::{
    linera_base_types::{Amount, StreamName, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::FlashbetUserState;

pub struct FlashbetUserContract {
    state: FlashbetUserState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(FlashbetUserContract);

impl WithContractAbi for FlashbetUserContract {
    type Abi = flashbet_user::FlashbetUserAbi;
}

impl Contract for FlashbetUserContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InstantiationArgument;
    type EventValue = UserEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = FlashbetUserState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FlashbetUserContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Validate application parameters
        self.runtime.application_parameters();

        // Set initial balance to zero (users deposit funds via Deposit operation)
        self.state.balance.set(Amount::ZERO);

        // Initialize bet ID counter
        self.state.next_bet_id.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::PlaceBet {
                market_chain,
                market_id,
                outcome,
                amount,
            } => {
                // 1. Validate amount
                assert!(amount > linera_sdk::linera_base_types::Amount::ZERO, "Bet amount must be positive");

                // 2. Check sufficient funds
                assert!(
                    self.state.has_sufficient_funds(amount),
                    "Insufficient funds: balance={}, required={}",
                    self.state.get_balance(),
                    amount
                );

                // 3. Get authenticated signer
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("PlaceBet operation must be signed");

                // 4. Debit balance
                self.state.debit(amount);

                // 5. Create bet record
                let bet_id = self.state.get_next_bet_id();
                let user_chain = self.runtime.chain_id();

                let bet = Bet {
                    bet_id,
                    market_id,
                    user: signer,
                    outcome,
                    amount,
                    timestamp: self.runtime.system_time(),
                    user_chain,
                };

                // 6. Record bet in active bets
                self.state
                    .active_bets
                    .insert(&market_id, bet.clone())
                    .expect("Failed to insert active bet");

                self.state
                    .bet_history
                    .insert(&bet_id, bet.clone())
                    .expect("Failed to insert bet history");

                // 7. Emit BetPlaced event
                // Wave 1: Frontend will relay this bet to Market chain via RegisterBet operation
                // Wave 2+: Market chain will subscribe to this event and process automatically
                self.runtime.emit(
                    StreamName::from(b"user_bets".to_vec()),
                    &UserEvent::BetPlaced {
                        market_chain,
                        bet: bet.clone(),
                    },
                );
            }

            Operation::Deposit { amount } => {
                // Credit balance
                self.state.credit(amount);

                // Emit event
                self.runtime
                    .emit(StreamName::from(b"user_events".to_vec()), &UserEvent::Deposited { amount });
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::PlaceBet { .. } => {
                // This message is sent TO Market Chains, not received by User Chain
                // If we receive it back (bounced), just ignore it
            }

            Message::Payout(payout) => {
                // 1. Credit the payout amount to balance
                self.state.credit(payout.amount);

                // 2. Remove from active bets
                self.state
                    .active_bets
                    .remove(&payout.market_id)
                    .expect("Failed to remove active bet");

                // 3. Record payout in history
                self.state
                    .payout_history
                    .insert(&payout.bet_id, payout.clone())
                    .expect("Failed to insert payout history");

                // 4. Emit event
                self.runtime.emit(
                    StreamName::from(b"user_events".to_vec()),
                    &UserEvent::PayoutReceived {
                        market_id: payout.market_id,
                        bet_id: payout.bet_id,
                        amount: payout.amount,
                    },
                );
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use flashbet_user::InstantiationArgument;
    use futures::FutureExt;
    use linera_sdk::{util::BlockingWait, views::View, ContractRuntime};

    #[test]
    fn test_instantiate() {
        let mut app = create_app();
        let initial_balance = linera_sdk::linera_base_types::Amount::from_tokens(1000);

        app.instantiate(InstantiationArgument { initial_balance })
            .now_or_never()
            .expect("Instantiation should not await");

        assert_eq!(*app.state.balance.get(), initial_balance);
        assert_eq!(*app.state.next_bet_id.get(), 0);
    }

    #[test]
    fn test_deposit() {
        let mut app = create_and_instantiate_app();
        let deposit_amount = linera_sdk::linera_base_types::Amount::from_tokens(500);
        let initial_balance = *app.state.balance.get();

        app.execute_operation(Operation::Deposit {
            amount: deposit_amount,
        })
        .now_or_never()
        .expect("Deposit should not await");

        let expected_balance = initial_balance
            .checked_add(deposit_amount)
            .expect("Balance overflow");
        assert_eq!(*app.state.balance.get(), expected_balance);
    }

    fn create_app() -> FlashbetUserContract {
        let runtime = ContractRuntime::new().with_application_parameters(());
        FlashbetUserContract {
            state: FlashbetUserState::load(runtime.root_view_storage_context())
                .blocking_wait()
                .expect("Failed to load state"),
            runtime,
        }
    }

    fn create_and_instantiate_app() -> FlashbetUserContract {
        let mut app = create_app();
        let initial_balance = linera_sdk::linera_base_types::Amount::from_tokens(1000);

        app.instantiate(InstantiationArgument { initial_balance })
            .now_or_never()
            .expect("Instantiation should not await");

        app
    }
}
