#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use flashbet_shared::{Bet, UserEvent};
use flashbet_token; // BET token application for cross-application calls
use flashbet_user::{InstantiationArgument, Message, Operation, OperationResponse};
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

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        // Validate application parameters
        self.runtime.application_parameters();

        // Store BET token application ID
        // Convert from untyped ApplicationId to typed ApplicationId<FlashbetTokenAbi>
        // This is safe because ApplicationId's type parameter is phantom data for type safety only
        let typed_app_id: linera_sdk::linera_base_types::ApplicationId<flashbet_token::FlashbetTokenAbi> =
            unsafe { std::mem::transmute(argument.bet_token_id) };
        self.state.bet_token_id.set(Some(typed_app_id));

        // Initialize bet ID counter
        // Note: Balances are now managed by BET token application
        self.state.next_bet_id.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::Balance { owner } => {
                // Query BET token balance by calling BET token application
                use linera_sdk::abis::fungible::FungibleResponse;

                let bet_token_id = self
                    .state
                    .bet_token_id
                    .get()
                    .expect("BET token ID not initialized");
                let balance_operation = flashbet_token::Operation::Balance { owner };

                let response = self
                    .runtime
                    .call_application::<flashbet_token::FlashbetTokenAbi>(
                        true,
                        bet_token_id,
                        &balance_operation,
                    );

                match response {
                    FungibleResponse::Balance(balance) => OperationResponse::Balance(balance),
                    _ => panic!("Unexpected response from BET token Balance operation"),
                }
            }

            Operation::TickerSymbol => {
                // Query BET token ticker symbol by calling BET token application
                use linera_sdk::abis::fungible::FungibleResponse;

                let bet_token_id = self
                    .state
                    .bet_token_id
                    .get()
                    .expect("BET token ID not initialized");
                let ticker_operation = flashbet_token::Operation::TickerSymbol;

                let response = self
                    .runtime
                    .call_application::<flashbet_token::FlashbetTokenAbi>(
                        true,
                        bet_token_id,
                        &ticker_operation,
                    );

                match response {
                    FungibleResponse::TickerSymbol(symbol) => {
                        OperationResponse::TickerSymbol(symbol)
                    }
                    _ => panic!("Unexpected response from BET token TickerSymbol operation"),
                }
            }

            Operation::Transfer { to_chain, amount } => {
                // Transfer BET tokens to another chain via BET token application
                use linera_sdk::{abis::fungible::FungibleResponse, linera_base_types::AccountOwner};

                // 1. Validate amount
                assert!(amount > Amount::ZERO, "Transfer amount must be positive");

                // 2. Get authenticated signer
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("Transfer operation must be signed");

                // 3. Check user has permission
                self.runtime
                    .check_account_permission(signer)
                    .expect("User not authorized");

                // 4. Call BET token TransferCrossChain operation
                let bet_token_id = self
                    .state
                    .bet_token_id
                    .get()
                    .expect("BET token ID not initialized");
                let transfer_operation = flashbet_token::Operation::TransferCrossChain {
                    destination: to_chain,
                    to: AccountOwner::CHAIN, // Transfer to chain balance
                    amount,
                };

                let response = self
                    .runtime
                    .call_application::<flashbet_token::FlashbetTokenAbi>(
                        true, // Forward authentication to BET token app
                        bet_token_id,
                        &transfer_operation,
                    );

                match response {
                    FungibleResponse::Ok => OperationResponse::Ok,
                    _ => panic!("Unexpected response from BET token TransferCrossChain operation"),
                }
            }

            Operation::PlaceBet {
                market_chain,
                market_id,
                event_id,
                outcome,
                amount,
            } => {
                // 1. Validate amount
                assert!(amount > Amount::ZERO, "Bet amount must be positive");

                // 2. Get authenticated signer
                let signer = self
                    .runtime
                    .authenticated_signer()
                    .expect("PlaceBet operation must be signed");

                // 3. Check user has permission to spend
                self.runtime
                    .check_account_permission(signer)
                    .expect("User not authorized");

                // 4. Create bet record
                let bet_id = self.state.get_next_bet_id();
                let user_chain = self.runtime.chain_id();

                let bet = Bet {
                    bet_id,
                    market_id,
                    event_id,
                    user: signer,
                    outcome,
                    amount,
                    timestamp: self.runtime.system_time(),
                    user_chain,
                };

                // 5. Transfer BET tokens to Market chain via BET token application
                // This will fail if user has insufficient balance (checked by BET token app)
                use linera_sdk::{abis::fungible::FungibleResponse, linera_base_types::AccountOwner};

                let bet_token_id = self
                    .state
                    .bet_token_id
                    .get()
                    .expect("BET token ID not initialized");
                let transfer_operation = flashbet_token::Operation::TransferCrossChain {
                    destination: market_chain,
                    to: AccountOwner::CHAIN, // Transfer to Market chain balance
                    amount,
                };

                let response = self
                    .runtime
                    .call_application::<flashbet_token::FlashbetTokenAbi>(
                        true, // Forward authentication to BET token app
                        bet_token_id,
                        &transfer_operation,
                    );

                match response {
                    FungibleResponse::Ok => {}
                    _ => panic!("Unexpected response from BET token TransferCrossChain operation"),
                }

                // 6. Record bet in active bets
                self.state
                    .active_bets
                    .insert(&market_id, bet.clone())
                    .expect("Failed to insert active bet");

                self.state
                    .bet_history
                    .insert(&bet_id, bet.clone())
                    .expect("Failed to insert bet history");

                // 7. Emit BetPlaced event for Market chain to process
                self.runtime.emit(
                    StreamName::from(b"user_bets".to_vec()),
                    &UserEvent::BetPlaced {
                        market_chain,
                        bet: bet.clone(),
                    },
                );

                OperationResponse::Ok
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
                // Note: Native tokens are automatically received via runtime.transfer()
                // from Market chain. This message just updates our state tracking.

                // 1. Remove from active bets
                self.state
                    .active_bets
                    .remove(&payout.market_id)
                    .expect("Failed to remove active bet");

                // 2. Record payout in history
                self.state
                    .payout_history
                    .insert(&payout.bet_id, payout.clone())
                    .expect("Failed to insert payout history");

                // 3. Emit event
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

        app.instantiate(InstantiationArgument {})
            .now_or_never()
            .expect("Instantiation should not await");

        assert_eq!(*app.state.next_bet_id.get(), 0);
    }

    #[test]
    fn test_balance_query() {
        use linera_sdk::linera_base_types::AccountOwner;

        let mut app = create_app();
        app.instantiate(InstantiationArgument {})
            .now_or_never()
            .expect("Instantiation should not await");

        // Test balance operation
        let response = app.execute_operation(Operation::Balance {
            owner: AccountOwner::CHAIN,
        })
        .now_or_never()
        .expect("Balance operation should not await");

        // Verify response is Balance variant
        match response {
            OperationResponse::Balance(amount) => {
                // Balance query succeeded, amount should be non-negative
                assert!(amount >= Amount::ZERO);
            }
            _ => panic!("Expected Balance response"),
        }
    }

    #[test]
    fn test_ticker_symbol() {
        let mut app = create_app();
        app.instantiate(InstantiationArgument {})
            .now_or_never()
            .expect("Instantiation should not await");

        // Test ticker symbol operation
        let response = app.execute_operation(Operation::TickerSymbol)
            .now_or_never()
            .expect("TickerSymbol operation should not await");

        // Verify response is TickerSymbol variant with "BET"
        match response {
            OperationResponse::TickerSymbol(symbol) => {
                assert_eq!(symbol, "BET", "Ticker symbol should be 'BET'");
            }
            _ => panic!("Expected TickerSymbol response"),
        }
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
}
