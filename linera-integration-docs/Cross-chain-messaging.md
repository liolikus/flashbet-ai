# Cross-Chain Messaging in Linera

Cross-chain messaging is a fundamental capability of the Linera Protocol, enabling seamless communication and asset transfers between different chains. This document provides an overview of how cross-chain messages are handled, from programmatic implementation in Rust contracts to CLI operations and GraphQL interactions.

## Table of Contents

1.  [Core Concepts of Cross-Chain Messaging](#core-concepts-of-cross-chain-messaging)
    *   [Message Origin and Bouncing](#message-origin-and-bouncing)
    *   [Chain Synchronization and Inbox Processing](#chain-synchronization-and-inbox-processing)
2.  [Implementing Cross-Chain Logic in Rust Contracts](#implementing-cross-chain-logic-in-rust-contracts)
    *   [Sending Messages and Subscribing to Events](#sending-messages-and-subscribing-to-events)
    *   [Processing Incoming Messages and Streams](#processing-incoming-messages-and-streams)
    *   [Cross-Application Calls and Token Swaps](#cross-application-calls-and-token-swaps)
    *   [Fungible Token Contract Cross-Chain Transfers](#fungible-token-contract-cross-chain-transfers)
3.  [Cross-Chain Operations via CLI and GraphQL](#cross-chain-operations-via-cli-and-graphql)
    *   [CLI Token Transfers Between Chains](#cli-token-transfers-between-chains)
    *   [GraphQL Subscriptions](#graphql-subscriptions)
    *   [Posting Messages to Social Applications (GraphQL)](#posting-messages-to-social-applications-graphql)
    *   [Claiming Tokens Across Chains (GraphQL)](#claiming-tokens-across-chains-graphql)
    *   [Transferring Tokens Across Chains (GraphQL)](#transferring-tokens-across-chains-graphql)
    *   [Transferring NFTs Across Chains (GraphQL)](#transferring-nfts-across-chains-graphql)
    *   [Swapping Tokens (GraphQL)](#swapping-tokens-graphql)
4.  [Testing Cross-Chain Communication (Rust)](#testing-cross-chain-communication-rust)
5.  [Explorer API for Messages and Bundles](#explorer-api-for-messages-and-bundles)
    *   [Get Posted Messages for a Bundle](#get-posted-messages-for-a-bundle)
    *   [Get Incoming Bundles for a Block](#get-incoming-bundles-for-a-block)
6.  [JavaScript Client for Cross-Chain Transfers](#javascript-client-for-cross-chain-transfers)

---

## 1. Core Concepts of Cross-Chain Messaging

Linera's architecture facilitates efficient and secure communication between chains. Messages are fundamental to state changes and interactions across the network.

### Message Origin and Bouncing

When a contract processes a message, it can determine if the message originated from another chain and if it has "bounced" (i.e., failed to be processed on a target chain and returned to the sender).

```rust
use linera_sdk::{Contract, ContractRuntime, Response};
// Assuming Operation and other necessary types are defined

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        // Check message context
        if let Some(bouncing) = self.runtime.message_is_bouncing() {
            if bouncing {
                // Handle bounced message: e.g., refund, retry, log error
                // This indicates a message sent to another chain was rejected or couldn't be processed.
            }
        }

        if let Some(origin) = self.runtime.message_origin_chain_id() {
            // Handle cross-chain message: e.g., verify sender, process payload
            // This indicates the message originated from a different chain.
        }

        Response::Ok
    }
}
```

### Chain Synchronization and Inbox Processing

For a chain to receive and process messages sent from other chains, it must synchronize with the network and explicitly process its inbox.

```bash
# Synchronize the local chain with network validators to fetch latest blocks and messages
linera sync "$CHAIN1"

# Process any incoming messages that have arrived in the chain's inbox
linera process-inbox "$CHAIN1"
```
These CLI commands ensure that a chain's local state is up-to-date and that it can react to messages originating from other chains.

---

## 2. Implementing Cross-Chain Logic in Rust Contracts

Linera's Rust SDK provides powerful primitives for building contracts that interact across chains.

### Sending Messages and Subscribing to Events

Contracts can emit events that other chains can subscribe to, enabling a publish-subscribe pattern for cross-chain communication. They can also send direct messages.

```rust
use linera_sdk::{Contract, ContractRuntime, Response, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

// Assuming StreamName, Event, Post, Key are defined elsewhere in the contract's ABI

impl Contract for SocialContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::Subscribe { chain_id } => {
                let app_id = self.runtime.application_id().forget_abi();
                // Subscribe to events from another chain's application
                self.runtime.subscribe_to_events(
                    chain_id,
                    app_id,
                    StreamName::from(b"posts".to_vec()), // Subscribe to the "posts" stream
                );
                Response::Ok
            }
            Operation::Post { text } => {
                let timestamp = self.runtime.system_time();
                let post = Post {
                    author: self.runtime.chain_id(),
                    timestamp,
                    text: text.clone(),
                };
                let index = self.state.own_posts.count().try_into().unwrap();
                self.state.own_posts.push(post.clone());

                // Emit an event that other subscribed chains will receive
                self.runtime.emit(
                    StreamName::from(b"posts".to_vec()),
                    &Event::Post { post, index }
                );
                Response::Ok
            }
        }
    }
    // ... process_streams implementation below
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Event {
    Post { post: Post, index: u64 },
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
pub struct Post {
    pub author: ChainId,
    pub timestamp: Timestamp,
    pub text: String,
}
```

### Processing Incoming Messages and Streams

The `process_streams` function in a contract is where incoming messages and events from other subscribed chains are handled.

```rust
use linera_sdk::{Contract, ContractRuntime, Response, StreamUpdate};
// ... (previous code for SocialContract, Event, Post)

impl Contract for SocialContract {
    // ... execute_operation from above

    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            for index in update.new_indices() {
                // Read the event from the incoming stream
                let event: Event = self.runtime.read_event(
                    update.chain_id,
                    StreamName::from(b"posts".to_vec()),
                    index
                );
                match event {
                    Event::Post { post, .. } => {
                        let key = Key {
                            timestamp: post.timestamp,
                            author: post.author,
                        };
                        // Store the received post in the contract's state
                        self.state.received_posts.insert(&key, post)
                            .expect("Failed to store post");
                    }
                }
            }
        }
    }
}
```

### Cross-Application Calls and Token Swaps

Contracts can interact with other applications, even if those applications reside on different chains, using typed interfaces. This is crucial for building complex DeFi protocols like Automated Market Makers (AMMs).

```rust
use linera_sdk::{Contract, ContractRuntime};
use fungible::{FungibleTokenAbi, Operation as FungibleOperation, Response as FungibleResponse};
// Assuming AmmContract, AmmState, AccountOwner, Amount, Account are defined

pub struct AmmContract {
    state: AmmState,
    runtime: ContractRuntime<Self>,
}

impl AmmContract {
    /// Transfers a token by calling another fungible token application.
    fn transfer_token(
        &mut self,
        token_index: u32,
        owner: AccountOwner,
        amount: Amount,
        target: Account,
    ) {
        let params = self.runtime.application_parameters();
        let token_app_id = params.tokens[token_index as usize]; // Get the ID of the target token application

        let operation = FungibleOperation::Transfer {
            owner,
            amount,
            target_account: target,
        };

        // Call the fungible token application on its respective chain
        let response = self.runtime.call_application(
            true,  // authenticated
            token_app_id,
            &operation,
        );

        assert!(matches!(response, FungibleResponse::Ok));
    }

    /// Performs a token swap by transferring tokens between accounts,
    /// potentially across chains, using the `transfer_token` helper.
    async fn swap(
        &mut self,
        owner: AccountOwner,
        input_token_idx: u32,
        input_amount: Amount,
        min_output: Amount,
    ) -> Amount {
        let output_token_idx = 1 - input_token_idx;

        // Transfer input tokens from the owner to the AMM application's account
        self.transfer_token(
            input_token_idx,
            owner,
            input_amount,
            Account {
                chain_id: self.runtime.chain_id(),
                owner: AccountOwner::Application(
                    self.runtime.application_id().forget_abi()
                ),
            },
        );

        // ... AMM logic to calculate output_amount ...
        let (reserve_in, reserve_out) = if input_token_idx == 0 {
            (self.state.reserve0.get(), self.state.reserve1.get())
        } else {
            (self.state.reserve1.get(), self.state.reserve0.get())
        };
        let output_amount = self.get_amount_out(input_amount, reserve_in, reserve_out);
        assert!(output_amount >= min_output, "Insufficient output amount");

        // Transfer output tokens from the AMM application's account back to the owner
        self.transfer_token(
            output_token_idx,
            AccountOwner::Application(self.runtime.application_id().forget_abi()),
            output_amount,
            Account { chain_id: self.runtime.chain_id(), owner },
        );

        output_amount
    }
}
```

### Fungible Token Contract Cross-Chain Transfers

A fungible token contract demonstrates how to handle both intra-chain and cross-chain transfers. Cross-chain transfers involve preparing a message to be sent to the target chain.

```rust
use linera_sdk::{
    Contract,
    ContractRuntime,
    linera_base_types::{AccountOwner, Amount, ChainId, WithContractAbi},
    views::{RootView, View, MapView, ViewStorageContext},
    Response,
};
use serde::{Deserialize, Serialize};

// Define application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct FungibleTokenState {
    pub accounts: MapView<AccountOwner, Amount>,
}

// Define contract structure
pub struct FungibleContract {
    state: FungibleTokenState,
    runtime: ContractRuntime<Self>,
}

// Implement contract trait
impl Contract for FungibleContract {
    type Message = Message;
    type InstantiationArgument = InitialState;
    type Parameters = TokenParameters;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = FungibleTokenState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FungibleContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: InitialState) {
        self.state.accounts
            .insert(&argument.owner, argument.initial_amount)
            .expect("Failed to initialize account");
    }

    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::Transfer { owner, amount, target_account } => {
                self.runtime.check_account_permission(owner)
                    .expect("Permission denied");

                let mut balance = self.state.accounts.get(&owner)
                    .await.expect("Failed to read balance")
                    .expect("Account not found");
                balance.try_sub_assign(amount)
                    .expect("Insufficient balance");
                self.state.accounts.insert(&owner, balance)
                    .expect("Failed to update balance");

                // If target is on the same chain, update locally
                if target_account.chain_id == self.runtime.chain_id() {
                    let mut target_balance = self.state.accounts
                        .get(&target_account.owner).await
                        .expect("Failed to read")
                        .unwrap_or(Amount::ZERO);
                    target_balance.saturating_add_assign(amount);
                    self.state.accounts.insert(&target_account.owner, target_balance)
                        .expect("Failed to credit");
                } else {
                    // If target is on a different chain, prepare and send a cross-chain message
                    self.runtime.prepare_message(Message::Credit {
                        target: target_account.owner,
                        amount,
                    })
                    .with_authentication() // Authenticate the message
                    .with_tracking()      // Track the message status
                    .send_to(target_account.chain_id); // Send to the target chain
                }
                Response::Ok
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::Credit { target, amount } => {
                // Check if the message is bouncing (failed to be processed on target)
                let is_bouncing = self.runtime.message_is_bouncing()
                    .expect("Message status available");
                if !is_bouncing {
                    // If not bouncing, credit the target account
                    let mut balance = self.state.accounts.get(&target).await
                        .expect("Failed to read").unwrap_or(Amount::ZERO);
                    balance.saturating_add_assign(amount);
                    self.state.accounts.insert(&target, balance)
                        .expect("Failed to credit account");
                }
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

linera_sdk::contract!(FungibleContract);

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    Transfer { owner: AccountOwner, amount: Amount, target_account: Account },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    Credit { target: AccountOwner, amount: Amount },
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Account {
    pub chain_id: ChainId,
    pub owner: AccountOwner,
}
```

---

## 3. Cross-Chain Operations via CLI and GraphQL

The Linera CLI and GraphQL interface allow users to initiate cross-chain operations and query cross-chain data.

### CLI Token Transfers Between Chains

The Linera CLI supports native token transfers between different chains directly.

```bash
# Transfer 100 native tokens from CHAIN1 to CHAIN2
linera transfer 100 --from "$CHAIN1" --to "$CHAIN2"

# Transfer 2 units from an account on CHAIN1 to an account on CHAIN2
linera transfer 2 --from "$CHAIN1:$ACCOUNT1" --to "$CHAIN2:$ACCOUNT2"

# Query balances again to verify transfer
linera query-balance "$CHAIN1"
linera query-balance "$CHAIN2"
linera query-balance "$CHAIN1:$ACCOUNT1"
linera query-balance "$CHAIN2:$ACCOUNT2"
```

### GraphQL Subscriptions

Applications can expose GraphQL mutations that allow users to subscribe to events from other chains, as seen in social media applications.

```graphql
mutation {
  subscribe(
    chainId: "$CHAIN_1"
  )
}
```
This mutation allows the current chain (where the GraphQL service is running) to subscribe to events published by `$CHAIN_1`.

### Posting Messages to Social Applications (GraphQL)

In social media-like applications, users can post messages, which can then be propagated across chains via subscriptions.

```graphql
mutation {
  post(
    text: "Linera Social is the new Mastodon!"
    imageUrl: "https://linera.org/img/logo.svg" # optional
  )
}
```
After posting, subscribed chains will receive this message via their `process_streams` implementation. You can then query for received posts:

```graphql
# Query keys of received posts
query { receivedPosts { keys { timestamp author index } } }
```

```graphql
# Query details of a specific received post entry
query {
  receivedPosts {
    entry(key: { timestamp: 1705504131018960, author: "$CHAIN_1", index: 0 }) {
      value {
        key {
          timestamp
          author
          index
        }
        text
        imageUrl
        comments {
          text
          chainId
        }
        likes
      }
    }
  }
}
```

### Claiming Tokens Across Chains (GraphQL)

Fungible tokens can be claimed from a source account on one chain and transferred to a target account on another chain using a GraphQL mutation.

```graphql
mutation {
  claim(
    sourceAccount: {
      owner: "$OWNER_2",
      chainId: "$CHAIN_1"
    },
    amount: "200.",
    targetAccount: {
      owner: "$OWNER_2",
      chainId: "$CHAIN_2"
    }
  )
}
```
This mutation is essential for moving tokens between different chains, for example, to consolidate funds or participate in cross-chain applications. Similar `claim` mutations are used for specific token types like FUN1 and FUN2 in matching engine examples.

### Transferring Tokens Across Chains (GraphQL)

General token transfers can also be initiated via GraphQL, specifying the source owner, amount, and the target account (including its chain ID).

```graphql
mutation {
  transfer(
    owner: "$OWNER_1",
    amount: "50.",
    targetAccount: {
      chainId: "$CHAIN_2",
      owner: "$OWNER_2"
    }
  )
}
```
This example shows a transfer from `$OWNER_1` on the current chain to `$OWNER_2` on `$CHAIN_2`.

### Transferring NFTs Across Chains (GraphQL)

Non-fungible tokens (NFTs) can also be transferred between owners, potentially across different chains.

```graphql
mutation {
  transfer(
    sourceOwner: "$OWNER_1",
    tokenId: "$TOKEN_ID",
    targetAccount: {
      chainId: "$CHAIN_1", # Target chain for the NFT
      owner: "$OWNER_2"    # New owner on the target chain
    }
  )
}
```

### Swapping Tokens (GraphQL)

In AMM (Automated Market Maker) applications, users can perform token swaps using GraphQL mutations.

```graphql
mutation {
  swap(
    owner: "$OWNER_2",
    inputTokenIdx: 1,
    inputAmount: "1",
  )
}
```
This mutation executes a token swap, where `$OWNER_2` initiates a swap of `inputAmount` of `inputTokenIdx` within the AMM application.

---

## 4. Testing Cross-Chain Communication (Rust)

The Linera SDK provides testing utilities to simulate and verify cross-chain message flows in integration tests.

```rust
use linera_sdk::test::{TestValidator, ActiveChain};

#[tokio::test]
async fn test_cross_chain_message() {
    // 1. Set up a test validator and deploy the contract module
    let (validator, module_id) = TestValidator::with_current_module::<
        MyAbi, (), () // Replace MyAbi with your contract's ABI
    >().await;

    // 2. Create two new chains for the test
    let mut chain1 = validator.new_chain().await;
    let mut chain2 = validator.new_chain().await;

    // 3. Create application instances on both chains
    let app1 = chain1.create_application(module_id, (), (), vec![]).await;
    let app2 = chain2.create_application(module_id, (), (), vec![]).await;

    // 4. Send a message from chain1 to chain2
    chain1.add_block(|block| {
        block.with_operation(app1, Operation::SendMessage { // Assuming SendMessage operation
            target: chain2.id(),
            data: "Hello".to_string(),
        });
    }).await;

    // 5. Process the inbox on chain2 to receive the message
    chain2.add_block(|block| {
        block.with_incoming_messages();
    }).await;

    // 6. Verify that the message was received on chain2
    let result = chain2.graphql_query(
        app2,
        "query { receivedMessages { data } }" // Assuming a GraphQL query to check received messages
    ).await;
    assert_eq!(result.response["receivedMessages"][0]["data"], "Hello");
}
```
This test demonstrates the full lifecycle of a cross-chain message: sending from one chain, processing on another, and verifying receipt.

---

## 5. Explorer API for Messages and Bundles

The Linera Explorer provides API endpoints to inspect messages and bundles, offering transparency into cross-chain interactions.

### Get Posted Messages for a Bundle

Retrieves all posted messages associated with a specific incoming bundle.

```http
GET /api/bundles/:id/messages
```

**Description**
Retrieves all posted messages associated with a specific incoming bundle.

**Method**
`GET`

**Endpoint**
`/api/bundles/:id/messages`

**Parameters**
**Path Parameters**
- `id` (integer) - Required - The ID of the incoming bundle.

**Request Example**
`GET /api/bundles/1/messages`

**Response**
**Success Response (200)**
- `messages` (array) - An array of posted message objects.
  - `id` (integer) - The ID of the posted message.
  - `bundle_id` (integer) - The ID of the bundle this message belongs to.
  - `message_index` (integer) - The index of the message within the bundle.
  - `authenticated_signer` (string) - The authenticated signer of the message.
  - `grant_amount` (integer) - The amount granted by the message.
  - `refund_grant_to` (string) - The address to refund the grant to.
  - `message_kind` (string) - The kind of message.
  - `message_data` (string) - The data of the message.
  - `created_at` (string) - The timestamp when the message was created.

**Response Example**
```json
{
  "messages": [
    {
      "id": 1,
      "bundle_id": 1,
      "message_index": 0,
      "authenticated_signer": "0xuser1...",
      "grant_amount": 100,
      "refund_grant_to": "0xrecipient...",
      "message_kind": "transfer",
      "message_data": "0xdata...",
      "created_at": "2023-10-27T10:06:00Z"
    }
  ]
}
```

### Get Incoming Bundles for a Block

Retrieves all incoming bundles associated with a specific block, providing insight into transactions and messages within that block.

```http
GET /api/blocks/:hash/bundles
```

---

## 6. JavaScript Client for Cross-Chain Transfers

The Linera JavaScript client can also be used to initiate cross-chain transfers from a web frontend.

```javascript
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { ethers } from 'ethers';

// Helper function for GraphQL queries
const gql = (query, variables = {}) => JSON.stringify({ query, variables });

async function transfer(application, donor, amount, recipient) {
  const errorContainer = document.querySelector('#errors');
  // Clear previous errors
  for (const element of errorContainer.children) if (!(element instanceof HTMLTemplateElement)) errorContainer.removeChild(element);
  let errors = [];
  try {
    // Parse recipient address in "owner@chain_id" format
    const match = recipient.match(/^(0x[0-9a-f]{40}|0x[0-9a-f]{64})@([0-9a-f]{64})$/i);
    if (!match) throw new Error('Invalid recipient address: expected `owner@chain_id`');

    // Construct the GraphQL mutation for transfer
    const query = gql(
      `mutation( $donor: AccountOwner!, $amount: Amount!, $recipient: FungibleAccount!, ) { transfer(owner: $donor, amount: $amount, targetAccount: $recipient) }`,
      {
        donor,
        amount,
        recipient: { owner: match[1], chainId: match[2] }, // Extract owner and chainId
      }
    );
    // Execute the mutation via the application's GraphQL endpoint
    errors = JSON.parse(await application.query(query)).errors || [];
  } catch (e) {
    console.error(e);
    errors.push({ message: e.message });
  }
  // Display any errors
  for (const error of errors) prependEntry(errorContainer, error);
}

async function run() {
  // ... (wallet initialization and chain claiming as in CHAIN_OWNERSHIP.MD) ...

  await linera.default();
  const faucet = await new linera.Faucet(import.meta.env.LINERA_FAUCET_URL);
  const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
  const signer = PrivateKey.fromMnemonic(mnemonic);
  const wallet = await faucet.createWallet();
  const owner = signer.address();
  const chainId = await faucet.claimChain(wallet, owner);
  const client = await new linera.Client(wallet, signer);

  const me = await client.identity(); // Get current client's identity

  // Perform a cross-chain transfer using the client's direct transfer method
  await client.transfer({
    recipient: {
      chain_id: chainId, // Target chain ID
      owner: me,         // Target owner on that chain
    },
    amount: 10,
  });

  // ... (UI updates and notification handling) ...
}

run();
```
This JavaScript snippet illustrates how a web client can initiate a transfer operation, specifying a recipient account that could be on a different chain. The `client.transfer` method handles the underlying cross-chain messaging.
