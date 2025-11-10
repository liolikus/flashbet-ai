#![cfg_attr(target_arch = "wasm32", no_main)]

use flashbet_token::{Message, Operation};
use linera_sdk::{
    abis::fungible::{FungibleResponse, InitialState},
    linera_base_types::{Account, AccountOwner, Amount, WithContractAbi},
    Contract, ContractRuntime,
};

pub struct FlashbetTokenContract {
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(FlashbetTokenContract);

impl WithContractAbi for FlashbetTokenContract {
    type Abi = flashbet_token::FlashbetTokenAbi;
}

impl Contract for FlashbetTokenContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InitialState;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        FlashbetTokenContract { runtime }
    }

    async fn instantiate(&mut self, state: Self::InstantiationArgument) {
        // Transfer initial balances from CHAIN to each account
        for (owner, amount) in state.accounts {
            let account = Account {
                chain_id: self.runtime.chain_id(),
                owner,
            };
            self.runtime.transfer(AccountOwner::CHAIN, account, amount);
        }
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::Balance { owner } => {
                let balance = self.runtime.owner_balance(owner);
                FungibleResponse::Balance(balance)
            }

            Operation::TickerSymbol => {
                FungibleResponse::TickerSymbol(flashbet_token::TICKER_SYMBOL.to_string())
            }

            Operation::Claim { amount } => {
                assert!(amount > Amount::ZERO, "Amount must be positive");

                let claimer = self
                    .runtime
                    .authenticated_signer()
                    .expect("Claim must be signed");

                self.runtime
                    .check_account_permission(claimer)
                    .expect("Not authorized");

                // Transfer from CHAIN balance to claimer
                let target_account = Account {
                    chain_id: self.runtime.chain_id(),
                    owner: claimer,
                };
                self.runtime
                    .transfer(AccountOwner::CHAIN, target_account, amount);

                FungibleResponse::Ok
            }

            Operation::Transfer { to, amount } => {
                assert!(amount > Amount::ZERO, "Amount must be positive");

                let from = self
                    .runtime
                    .authenticated_signer()
                    .expect("Transfer must be signed");

                self.runtime
                    .check_account_permission(from)
                    .expect("Not authorized");

                let target_account = Account {
                    chain_id: self.runtime.chain_id(),
                    owner: to,
                };
                self.runtime.transfer(from, target_account, amount);

                FungibleResponse::Ok
            }

            Operation::TransferCrossChain {
                destination,
                to,
                amount,
            } => {
                assert!(amount > Amount::ZERO, "Amount must be positive");

                let from = self
                    .runtime
                    .authenticated_signer()
                    .expect("Transfer must be signed");

                self.runtime
                    .check_account_permission(from)
                    .expect("Not authorized");

                // Transfer to destination chain
                let target_account = Account {
                    chain_id: destination,
                    owner: to,
                };
                self.runtime.transfer(from, target_account, amount);

                FungibleResponse::Ok
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::Credit { owner, amount } => {
                // Transfer from CHAIN to recipient (cross-chain receive)
                let target_account = Account {
                    chain_id: self.runtime.chain_id(),
                    owner,
                };
                self.runtime
                    .transfer(AccountOwner::CHAIN, target_account, amount);
            }
        }
    }

    async fn store(self) {
        // No state to save - native tokens handled by runtime
    }
}
