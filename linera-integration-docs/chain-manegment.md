# Chain Management in Linera

This document provides a comprehensive guide to managing chains and deploying applications within the Linera Protocol. It covers operations using the Linera Command-Line Interface (CLI), programmatic interactions via the Rust SDK, and querying chain data through GraphQL and REST APIs. Understanding these operations is fundamental for developing and maintaining decentralized applications on Linera.

## Table of Contents

1.  [Linera CLI for Chain Management](#linera-cli-for-chain-management)
    *   [Initializing Wallets and Requesting Chains](#initializing-wallets-and-requesting-chains)
    *   [Opening New Chains](#opening-new-chains)
    *   [Publishing Modules and Creating Applications](#publishing-modules-and-creating-applications)
    *   [Interacting with Applications via GraphQL Service](#interacting-with-applications-via-graphql-service)
    *   [Synchronizing Chains and Processing Messages](#synchronizing-chains-and-processing-messages)
    *   [Querying Balances and Performing Transfers](#querying-balances-and-performing-transfers)
    *   [Querying Network and Validator Information](#querying-network-and-validator-information)
    *   [Closing Chains](#closing-chains)
2.  [Programmatic Chain Management with Rust SDK](#programmatic-chain-management-with-rust-sdk)
    *   [Creating Chains and Deploying Applications](#creating-chains-and-deploying-applications)
    *   [Accessing Runtime Chain Information](#accessing-runtime-chain-information)
    *   [Implementing GraphQL Service Interface](#implementing-graphql-service-interface)
3.  [GraphQL and API Interactions](#graphql-and-api-interactions)
    *   [Querying Applications on a Chain](#querying-applications-on-a-chain)
    *   [Querying Game Chains](#querying-game-chains)
    *   [Querying Account and Token Balances](#querying-account-and-token-balances)
    *   [Publishing Data Blobs](#publishing-data-blobs)
    *   [Executing Orders (e.g., Matching Engine)](#executing-orders-eg-matching-engine)
    *   [Closing Chains via GraphQL](#closing-chains-via-graphql)
    *   [Explorer API Endpoints](#explorer-api-endpoints)
        *   [Get All Chains with Statistics](#get-all-chains-with-statistics)
        *   [Get Blocks for a Specific Chain](#get-blocks-for-a-specific-chain)
4.  [JavaScript Client Interactions](#javascript-client-interactions)
    *   [Getting Chain Identity](#getting-chain-identity)
    *   [Setting up Notification Handlers](#setting-up-notification-handlers)
5.  [Configuration](#configuration)
    *   [Configuring Chain Workers for Block Exporter](#configuring-chain-workers-for-block-exporter)

---

## 1. Linera CLI for Chain Management

The Linera CLI provides a powerful set of commands for interacting with the Linera network, from setting up wallets and chains to deploying and managing applications.

### Initializing Wallets and Requesting Chains

Before performing any chain operations, you typically need to initialize a Linera wallet and request one or more chains from a faucet. This process sets up your local environment and provides you with chain IDs and owner keys.

```bash
# Set environment variables for wallet, keystore, and storage paths
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

# Initialize a new user wallet from a faucet
linera wallet init --faucet $FAUCET_URL

# Request new chains and store their IDs and owner addresses
INFO1=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN1="${INFO1[0]}"
ACCOUNT1="${INFO1[1]}"

INFO2=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN2="${INFO2[0]}"
ACCOUNT2="${INFO2[1]}"

# Display the chains tracked by the wallet
linera wallet show
```

This sequence of commands initializes a wallet, requests two new chains, and stores their identifiers in environment variables for subsequent use. For more details on wallet management and chain ownership, refer to [Chain Ownership in Linera](Chain-ownership.md).

### Opening New Chains

You can explicitly open a new chain with an initial balance from an existing chain. This is useful for creating dedicated chains for specific applications or users.

```bash
# Open a new chain from CHAIN1 with an initial balance of 1000
linera open-chain --from "$CHAIN1" --initial-balance 1000
```

### Publishing Modules and Creating Applications

Linera applications are deployed by first publishing their bytecode modules (contract and service WASM files) and then creating an application instance from a published module.

```bash
# Publish bytecode module
linera publish-module \
    ./target/wasm32-unknown-unknown/release/contract.wasm \
    ./target/wasm32-unknown-unknown/release/service.wasm

# Create an application from a published module ID
# Replace $MODULE_ID with the ID obtained from `publish-module`
linera create-application $MODULE_ID \
    --json-parameters '{}' \
    --json-argument '{"owner": "..."}'

# Alternatively, publish and create an application in one step
linera project publish-and-create \
    ./my-app \
    --json-parameters '{"param1": "value"}' \
    --json-argument '{"initial_state": 42}'
```

The `publish-and-create` command is a convenience method that combines publishing the module and creating an application instance.

### Interacting with Applications via GraphQL Service

Once an application is deployed, you can interact with its service via a GraphQL endpoint. First, start the Linera service for your chain, then use `curl` or a GraphQL client to send queries or mutations.

```bash
# Start the Linera service on a specified port in the background
linera service --port 8080 &

# Example: Interact with an application via GraphQL to query a balance
curl -X POST http://localhost:8080/chains/$CHAIN1/applications/$APP_ID \
    -H "Content-Type: application/json" \
    -d '{
        "query": "query { balance(owner: \"...\") }",
        "variables": {}
    }'
```

### Synchronizing Chains and Processing Messages

To ensure your local chain state is up-to-date and to process any incoming messages from other chains, you need to synchronize with validators and process the chain's inbox.

```bash
# Synchronize the local chain with network validators
linera sync "$CHAIN1"

# Process any incoming messages in the chain's inbox
linera process-inbox "$CHAIN1"
```
These commands are crucial for maintaining consistency and enabling cross-chain communication. For more details on cross-chain messaging, refer to [Cross-Chain Messaging in Linera](Cross-chain-messaging.md).

### Querying Balances and Performing Transfers

The CLI allows for querying native token balances and performing transfers between chains or within a chain to specific accounts.

```bash
# Query the chain balance of some of the chains.
linera query-balance "$CHAIN1"
linera query-balance "$CHAIN2"

# Transfer native tokens between chains
linera transfer 10 --from "$CHAIN1" --to "$CHAIN2"

# Transfer tokens to a specific user account on the same chain
linera transfer 50 --from "$CHAIN1" --to "$CHAIN1:$ACCOUNT1"
linera query-balance "$CHAIN1:$ACCOUNT1"
```

### Querying Network and Validator Information

You can query the network for validator information and synchronize your chain with specific validators.

```bash
# Query the list of validators for a specific chain
linera query-validators "$CHAIN1"

# Synchronize a chain with a given validator address
linera sync-validator $VALIDATOR_ADDRESS --chains "$CHAIN1,$CHAIN2"
```

### Closing Chains

Chains can be closed when they are no longer needed.

```bash
# Close a specific chain
linera close-chain "$CHAIN1"
```

---

## 2. Programmatic Chain Management with Rust SDK

The Linera SDK provides Rust developers with tools to programmatically manage chains and deploy applications directly within smart contracts.

### Creating Chains and Deploying Applications

The `ContractRuntime` in the `linera_sdk` offers functions to open new chains, create applications, and publish modules. This is particularly useful for factory contracts that need to spawn new chains or applications.

```rust
use linera_sdk::{Contract, ContractRuntime, ApplicationPermissions, ChainOwnership, Bytecode, VmRuntime, Response};

impl Contract for FactoryContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::CreateChain { initial_balance, owner } => {
                // Define chain ownership (e.g., single owner)
                let chain_ownership = ChainOwnership::single(owner);
                // Define default application permissions
                let permissions = ApplicationPermissions::default();

                // Open a new chain with specified ownership, permissions, and initial balance
                let new_chain_id = self.runtime.open_chain(
                    chain_ownership,
                    permissions,
                    initial_balance,
                );

                Response::ChainCreated { chain_id: new_chain_id }
            }
            Operation::DeployApplication { module_id, parameters, argument } => {
                // Create a new application instance from a module
                let app_id = self.runtime.create_application(
                    module_id,
                    &parameters,
                    &argument,
                    vec![],  // required_application_ids
                );

                Response::ApplicationCreated { application_id: app_id }
            }
            Operation::PublishModule { contract_bytes, service_bytes } => {
                // Load bytecode from bytes
                let contract = Bytecode::load_from_bytes(contract_bytes);
                let service = Bytecode::load_from_bytes(service_bytes);

                // Publish the contract and service modules
                let module_id = self.runtime.publish_module(
                    contract,
                    service,
                    VmRuntime::Wasm, // Specify the VM runtime
                );

                Response::ModulePublished { module_id }
            }
            Operation::CloseChain => {
                // Close the current chain
                self.runtime.close_chain()
                    .expect("Failed to close chain");
                Response::Ok
            }
        }
    }
}
```

### Accessing Runtime Chain Information

Within a Linera contract, the `ContractRuntime` provides access to various metadata and system state of the current chain and application.

```rust
use linera_sdk::{Contract, ContractRuntime, Response};
// Assuming Operation and other necessary types are defined

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        // Get current chain information
        let chain_id = self.runtime.chain_id();
        let app_id = self.runtime.application_id();
        let block_height = self.runtime.block_height();
        let timestamp = self.runtime.system_time();

        // Access application parameters
        let params = self.runtime.application_parameters();

        // Query balances
        let chain_balance = self.runtime.chain_balance();
        // For owner-specific balance, see Chain Ownership documentation
        // let owner_balance = self.runtime.owner_balance(owner);

        // For ownership details, see Chain Ownership documentation
        // let ownership = self.runtime.chain_ownership();

        // For message context, see Cross-Chain Messaging documentation
        // if let Some(bouncing) = self.runtime.message_is_bouncing() { /* ... */ }
        // if let Some(origin) = self.runtime.message_origin_chain_id() { /* ... */ }

        Response::Ok
    }
}
```

### Implementing GraphQL Service Interface

Linera applications can expose a GraphQL service interface for querying their state. The `Service` trait, along with `async_graphql`, enables defining a schema and handling queries.

```rust
use linera_sdk::{
    Service, ServiceRuntime,
    linera_base_types::{AccountOwner, Amount, WithServiceAbi},
    views::{MapView, View, ViewStorageContext},
    graphql::GraphQLMutationRoot,
};
use async_graphql::{Object, Request, Response, Schema, EmptySubscription};
use std::sync::Arc;

// Assuming FungibleTokenState, TokenParameters, Operation, Account are defined

pub struct FungibleService {
    state: FungibleTokenState,
    runtime: Arc<ServiceRuntime<Self>>,
}

impl Service for FungibleService {
    type Parameters = TokenParameters;

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = FungibleTokenState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        FungibleService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            self.clone(),
            Operation::mutation_root(self.runtime.clone()), // Assuming Operation is also a mutation root
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

#[Object]
impl FungibleService {
    /// Retrieves all accounts and their balances.
    async fn accounts(&self) -> &MapView<AccountOwner, Amount> {
        &self.state.accounts
    }

    /// Retrieves the balance for a specific owner.
    async fn balance(&self, owner: AccountOwner) -> Amount {
        self.state.accounts.get(&owner).await
            .expect("Failed to read balance")
            .unwrap_or(Amount::ZERO)
    }

    /// Retrieves the ticker symbol for the fungible token.
    async fn ticker_symbol(&self) -> String {
        self.runtime.application_parameters().ticker_symbol.clone()
    }

    /// Calculates and retrieves the total supply of the token.
    async fn total_supply(&self) -> Amount {
        let mut total = Amount::ZERO;
        self.state.accounts.for_each_index_value(|_, balance| {
            total.saturating_add_assign(balance);
            Ok(())
        }).await.expect("Failed to calculate supply");
        total
    }
}

#[derive(GraphQLMutationRoot)]
pub enum Operation {
    // Example mutation, would be defined in the contract
    Transfer { owner: AccountOwner, amount: Amount, target_account: Account },
}

linera_sdk::service!(FungibleService);
```

---

## 3. GraphQL and API Interactions

Linera provides various ways to query chain and application state, as well as execute operations, using GraphQL and RESTful API endpoints.

### Querying Applications on a Chain

You can query a specific chain to discover the applications deployed on it, along with their IDs and links.

```graphql
query {
  applications(
    chainId: "$CHAIN_1"
  ) {
    id
    link
  }
}
```

### Querying Game Chains

For applications that manage multiple game-specific chains (like the Hex game example), you can query for a list of these chains or details of a specific game chain.

```graphql
# Query a list of game chains by fetching keys
query {
  gameChains {
    keys(count: 3)
  }
}
```

```graphql
# Query details of a specific game entry by owner's public key
query {
  gameChains {
    entry(key: "$OWNER_1") {
      value {
        chainId
      }
    }
  }
}
```

### Querying Account and Token Balances

You can retrieve the balance of fungible tokens for a specific account on a given chain using GraphQL.

```graphql
query {
  accounts {
    entry(key: "$OWNER_2") {
      value
    }
  }
}
```

### Publishing Data Blobs

Data blobs can be published to a specified chain using a GraphQL mutation, which returns a hash that can be used for other operations.

```graphql
mutation {
  publishDataBlob(
    chainId: "$CHAIN_1",
    bytes: [1, 2, 3, 4]
  )
}
```

### Executing Orders (e.g., Matching Engine)

Applications like a matching engine might expose GraphQL mutations to execute specific orders, such as an 'Ask' order.

```graphql
mutation {
  executeOrder(
    order: {
      Insert : {
        owner: "$OWNER_2",
        amount: "2",
        nature: Ask,
        price: {
            price:5
        }
      }
    }
  )
}
```

### Closing Chains via GraphQL

Some applications may expose a GraphQL mutation to programmatically close the chain they reside on.

```graphql
mutation { closeChain }
```

### Explorer API Endpoints

The Linera Explorer provides RESTful API endpoints to retrieve information about chains and blocks.

#### Get All Chains with Statistics

Retrieves a list of all chains on the Linera network along with their statistics.

```http
GET /api/chains
```

**Description**
Retrieves a list of all chains on the Linera network along with their statistics.

**Method**
`GET`

**Endpoint**
`/api/chains`

**Response**
**Success Response (200)**
- `chains` (array) - An array of chain objects.
  - `chain_id` (string) - The ID of the chain.
  - `block_count` (integer) - The total number of blocks in the chain.
  - `latest_height` (integer) - The height of the latest block in the chain.

**Response Example**
```json
{
  "chains": [
    {
      "chain_id": "chain1",
      "block_count": 100,
      "latest_height": 100
    }
  ]
}
```

#### Get Blocks for a Specific Chain

Fetches all blocks belonging to a particular chain, identified by its chain ID.

```http
GET /api/chains/:chainId/blocks
```

**Description**
Retrieves a list of blocks belonging to a specific chain.

**Method**
`GET`

**Endpoint**
`/api/chains/:chainId/blocks`

**Parameters**
**Path Parameters**
- `chainId` (string) - Required - The ID of the chain.

**Query Parameters**
- `limit` (integer) - Optional - The maximum number of blocks to return. Defaults to 20.
- `offset` (integer) - Optional - The number of blocks to skip. Defaults to 0.

**Request Example**
`GET /api/chains/chain1/blocks?limit=10&offset=0`

**Response**
**Success Response (200)**
- `blocks` (array) - An array of block objects belonging to the specified chain.
  - `hash` (string) - The hash of the block.
  - `chain_id` (string) - The ID of the chain the block belongs to.
  - `height` (integer) - The height of the block.
  - `created_at` (string) - The timestamp when the block was created.

**Response Example**
```json
{
  "blocks": [
    {
      "hash": "0xabc123...",
      "chain_id": "chain1",
      "height": 100,
      "created_at": "2023-10-27T10:00:00Z"
    }
  ]
}
```

---

## 4. JavaScript Client Interactions

The Linera JavaScript client library allows web frontends to interact with Linera chains.

### Getting Chain Identity

The client can fetch the identity of the default chain, which is crucial for establishing the active chain context for subsequent operations.

```typescript
client.identity(): Promise<any>
```

**Description**
Gets the identity of the default chain.

**Method**
`GET` (conceptually, as it retrieves information)

**Endpoint**
N/A (Method of the Client class)

**Errors**
If the chain couldn't be established.

**Returns**
`Promise<any>` - A promise that resolves with the identity of the default chain.

### Setting up Notification Handlers

The Linera client can subscribe to network notifications, enabling real-time updates and event handling in web applications.

```typescript
client.onNotification(handler)
```

**Description**
Sets a callback to be called when a notification is received from the network.

**Method**
`POST` (conceptually, as it sets up a subscription)

**Endpoint**
N/A (Method of the Client class)

**Parameters**
- `handler` (Function) - The callback function to handle incoming notifications.

**Panics**
If the handler function fails or we fail to subscribe to the notification stream.

**Returns**
`void`

---

## 5. Configuration

### Configuring Chain Workers for Block Exporter

Linera chain workers can be configured to send notifications about new blocks to a block exporter service. This is useful for monitoring and data indexing.

```toml
[[block_exporters]]
host = "exporter"
port = 12000
```
This TOML snippet would be part of a Linera chain worker's configuration file, specifying the host and port of the block exporter.
