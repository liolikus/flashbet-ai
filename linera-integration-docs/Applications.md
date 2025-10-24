# Linera Applications: A Comprehensive Guide

Linera applications are the smart contracts of the Linera protocol, enabling developers to build decentralized applications (dApps) that leverage Linera's high-performance, sharded blockchain architecture. These applications are compiled to WebAssembly (Wasm) and deployed on Linera chains, where they can manage state, interact with users, and communicate seamlessly with other applications across different chains.

This document serves as a guide for developers to understand the lifecycle of Linera applications, from development and deployment to interaction and advanced programmatic control.

## Table of Contents

1.  [Prerequisites and Environment Setup](#prerequisites-and-environment-setup)
    *   [Initializing Wallets and Requesting Chains](#initializing-wallets-and-requesting-chains)
2.  [Developing Linera Applications](#developing-linera-applications)
    *   [Compiling Application Modules to WebAssembly](#compiling-application-modules-to-webassembly)
    *   [Managing Application State with Views in Rust](#managing-application-state-with-views-in-rust)
3.  [Deploying Linera Applications](#deploying-linera-applications)
    *   [Publishing Application Modules](#publishing-application-modules)
    *   [Creating Application Instances from a Module ID](#creating-application-instances-from-a-module-id)
    *   [Publishing and Creating Applications (Simplified Deployment)](#publishing-and-creating-applications-simplified-deployment)
        *   [Counter Application](#counter-application)
        *   [Fungible Token Applications](#fungible-token-applications)
        *   [Automated Market Maker (AMM) Application](#automated-market-maker-amm-application)
        *   [Matching Engine Application](#matching-engine-application)
        *   [Request for Quote (RFQ) Application](#request-for-quote-rfq-application)
        *   [Crowd-Funding Campaign Application](#crowd-funding-campaign-application)
        *   [Large Language Model (LLM) Application](#large-language-model-llm-application)
        *   [Generative NFT Application](#generative-nft-application)
        *   [Social Application](#social-application)
        *   [Game-of-Life Application](#game-of-life-application)
4.  [Interacting with Linera Applications](#interacting-with-linera-applications)
    *   [Querying Applications via GraphQL](#querying-applications-via-graphql)
    *   [Mutating Application State via GraphQL](#mutating-application-state-via-graphql)
    *   [Interacting via Web Frontend](#interacting-via-web-frontend)
    *   [Programmatic Interaction (Rust SDK)](#programmatic-interaction-rust-sdk)
        *   [Calling Other Applications with Typed Interfaces](#calling-other-applications-with-typed-interfaces)
        *   [Managing Chains and Deploying Applications Programmatically](#managing-chains-and-deploying-applications-programmatically)

---

## Prerequisites and Environment Setup

Before deploying and interacting with Linera applications, you need to set up your Linera wallet and request chains. These chains will host your applications and manage your assets.

### Initializing Wallets and Requesting Chains

This process involves initializing your Linera wallet, configuring storage, and requesting new chains from a faucet. Each chain will have a unique ID and an associated owner.

```bash
# Set environment variables for wallet, keystore, and client storage
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

# Initialize the Linera wallet using a faucet URL
linera wallet init --faucet $FAUCET_URL

# Request multiple chains and capture their IDs and owner addresses
INFO_1=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN_1="${INFO_1[0]}"
OWNER_1="${INFO_1[1]}"

INFO_2=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN_2="${INFO_2[0]}"
OWNER_2="${INFO_2[1]}"

# For AMM example, you might request an additional chain for the AMM itself
INFO_AMM=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN_AMM="${INFO_AMM[0]}"
OWNER_AMM="${INFO_AMM[1]}"
```

*Note: The specific environment variables and number of chains requested may vary based on the application example. The `--with-wallet <wallet_id>` flag can be used to manage multiple wallets.*

---

## Developing Linera Applications

Linera applications are typically written in Rust and compiled to WebAssembly. The SDK provides tools for state management and cross-application communication.

### Compiling Application Modules to WebAssembly

Linera applications consist of a contract and a service, both compiled to WebAssembly. Use `cargo build` with the `--release` flag for optimized binaries and `--target wasm32-unknown-unknown` to specify the Wasm target.

First, navigate to the `examples` directory (or the root of your project if your application is not in `examples`).

```shell
cd examples
```

Then, compile your application:

```bash
# Compile all application examples for WebAssembly targets
cargo build --release --target wasm32-unknown-unknown
```

For a specific application, like the `fungible` token example, you would navigate into its directory first:

```bash
(cd examples/fungible && cargo build --release --target wasm32-unknown-unknown)
```

### Managing Application State with Views in Rust

Linera provides a powerful view system for persisting and managing application state in a type-safe manner. These views abstract away the underlying storage mechanisms.

```rust
use linera_sdk::views::{
    RootView, View, RegisterView, MapView, LogView, CustomMapView,
    ViewStorageContext,
};
use linera_sdk::base::{AccountOwner, Amount, Timestamp}; // Assuming these types are defined

// Define your application's state using various view types
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct ApplicationState {
    pub counter: RegisterView<u64>,
    pub balances: MapView<AccountOwner, Amount>,
    pub history: LogView<Transaction>,
    pub custom_data: CustomMapView<Key, Value>, // Assuming Key and Value are defined
}

// Implement methods to interact with the application state
impl ApplicationState {
    pub async fn increment_counter(&mut self) -> u64 {
        let current = *self.counter.get();
        let new_value = current + 1;
        self.counter.set(new_value);
        new_value
    }

    pub async fn add_balance(&mut self, owner: AccountOwner, amount: Amount) {
        let current = self.balances.get(&owner).await
            .expect("Failed to read")
            .unwrap_or(Amount::ZERO);
        let new_balance = current.saturating_add(amount);
        self.balances.insert(&owner, new_balance)
            .expect("Failed to update balance");
    }

    pub async fn record_transaction(&mut self, tx: Transaction) {
        self.history.push(tx);
    }

    pub async fn get_transaction(&self, index: usize) -> Option<Transaction> {
        self.history.get(index).await.expect("Failed to read")
    }

    pub async fn transaction_count(&self) -> usize {
        self.history.count()
    }
}

// Example Transaction struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub from: AccountOwner,
    pub to: AccountOwner,
    pub amount: Amount,
    pub timestamp: Timestamp,
}
```

---

## Deploying Linera Applications

Deploying an application on Linera involves two main steps: publishing its Wasm modules and then creating an instance of the application on a specific chain.

### Publishing Application Modules

Publishing an application module makes its bytecode available on the Linera network. This is a prerequisite for creating application instances.

**Publishing the Fungible Token Module:**

```bash
# Navigate to the fungible example directory and build
(cd examples/fungible && cargo build --release --target wasm32-unknown-unknown)

# Publish the fungible contract and service Wasm binaries
MODULE_ID=$(linera publish-module \
    examples/target/wasm32-unknown-unknown/release/fungible_{contract,service}.wasm)
```

**Publishing the Native Fungible Token Module:**

```bash
# Navigate to the native-fungible example directory and build
cd examples/native-fungible
cargo build --release --target wasm32-unknown-unknown

# Publish the native-fungible contract and service Wasm binaries
MODULE_ID="$(linera publish-module \
    ../target/wasm32-unknown-unknown/release/native_fungible_{contract,service}.wasm)"
```

**Publishing the Generative NFT Module:**

```bash
# Navigate to the gen-nft example directory and build
(cd examples/gen-nft && cargo build --release --target wasm32-unknown-unknown)

# Publish the gen-nft contract and service Wasm binaries
MODULE_ID=$(linera publish-module \
    examples/target/wasm32-unknown-unknown/release/gen_nft_{contract,service}.wasm)
```

### Creating Application Instances from a Module ID

Once a module is published, you can create multiple instances of the application using its `MODULE_ID`. This allows for flexible deployment of the same application logic with different initial states and parameters.

**Creating a Fungible Token Application Instance:**

This command creates a new fungible token application instance, initializing it with a specific owner's balance and a ticker symbol.

```bash
APP_ID=$(linera create-application $MODULE_ID \
    --json-argument "{ \"accounts\": { \"$OWNER_1\": \"100.\" } }" \
    --json-parameters "{ \"ticker_symbol\": \"FUN\" }"
)
```

**Creating a Native Fungible Token Application Instance:**

Similar to the fungible token, this creates an instance of the native fungible token.

```bash
LINERA_APPLICATION_ID=$(linera create-application $MODULE_ID \
    --json-argument '{ "accounts": {
        "$OWNER_1": "100."
    } }' \
    --json-parameters '{ "ticker_symbol": "NAT" }')
```

**Creating a Generative NFT Application Instance:**

This command creates an instance of the generative NFT application using a previously published module.

```bash
APP_ID=$(linera create-application $MODULE_ID)
```

### Publishing and Creating Applications (Simplified Deployment)

The `linera project publish-and-create` command simplifies deployment by combining the module publishing and application instance creation steps into a single command, often directly from the project's source directory.

#### Counter Application

This command compiles the counter application and deploys an instance of it, initializing its value to `1`.

```bash
# Navigate to the counter example directory
cd examples/counter
cargo build --release --target wasm32-unknown-unknown

# Publish and create the counter application instance
LINERA_APPLICATION_ID=$(linera publish-and-create \
  ../target/wasm32-unknown-unknown/release/counter_{contract,service}.wasm \
  --json-argument "1")
```

#### Fungible Token Applications

These commands publish and create multiple instances of the fungible token application, each with distinct initial balances and ticker symbols.

**Example 1: Initializing two fungible tokens for an AMM**

```bash
# Build the fungible application
(cd examples/fungible && cargo build --release --target wasm32-unknown-unknown)

# Publish and create FUN1 with initial balance for AMM owner
FUN1_APP_ID=$(linera --wait-for-outgoing-messages \
  publish-and-create examples/target/wasm32-unknown-unknown/release/fungible_{contract,service}.wasm \
    --json-argument "{ \"accounts\": { \"$OWNER_AMM\": \"100.\" } }" \
    --json-parameters "{ \"ticker_symbol\": \"FUN1\" }"
)

# Publish and create FUN2 with initial balance for AMM owner
FUN2_APP_ID=$(linera --wait-for-outgoing-messages \
  publish-and-create examples/target/wasm32-unknown-unknown/release/fungible_{contract,service}.wasm \
    --json-argument "{ \"accounts\": { \"$OWNER_AMM\": \"100.\" } }" \
    --json-parameters "{ \"ticker_symbol\": \"FUN2\" }"
)
```

**Example 2: Initializing two fungible tokens for RFQ**

```bash
# Build the fungible application
(cd examples/fungible && cargo build --release --target wasm32-unknown-unknown)

# Publish and create FUN1 with initial balances for two owners
APP_ID_0=$(linera --with-wallet 1 project publish-and-create \
           examples/fungible \
           --json-argument '{ "accounts": { "'$OWNER_1'": "500", "'$OWNER_2'": "500" } }' \
           --json-parameters "{ \"ticker_symbol\": \"FUN1\" }" )

# Publish and create FUN2 with initial balances for two owners
APP_ID_1=$(linera --with-wallet 1 project publish-and-create \
           examples/fungible \
           --json-argument '{ "accounts": { "'$OWNER_1'": "500", "'$OWNER_2'": "500" } }' \
           --json-parameters "{ \"ticker_symbol\": \"FUN2\" }" )
```

**Example 3: Initializing two fungible tokens for Matching Engine**

```bash
FUN1_APP_ID=$(linera --wait-for-outgoing-messages \
  project publish-and-create examples/fungible \
    --json-argument "{ \"accounts\": {\n        \"$OWNER_1\": \"100.\",\n        \"$OWNER_2\": \"150.\"\n    } }" \
    --json-parameters "{ \"ticker_symbol\": \"FUN1\" }" \
)

FUN2_APP_ID=$(linera --wait-for-outgoing-messages \
  project publish-and-create examples/fungible \
    --json-argument "{ \"accounts\": {\n        \"$OWN_1\": \"100.\",\n        \"$OWNER_2\": \"150.\"\n    } }" \
    --json-parameters "{ \"ticker_symbol\": \"FUN2\" }" \
)
```

**Example 4: Initializing a single fungible token for Crowd-Funding**

```bash
APP_ID_0=$(linera --with-wallet 1 project publish-and-create \
           examples/fungible \
           --json-argument '{ "accounts": { "'$OWNER_1'": "100", "'$OWNER_2'": "200" } }' \
           --json-parameters "{ \"ticker_symbol\": \"FUN\" }")

# Wait for it to fully complete (important for subsequent dependent operations)
sleep 8
```

#### Automated Market Maker (AMM) Application

This deploys the AMM application, specifying the previously created fungible token application IDs as required dependencies.

```bash
# Build the AMM application
(cd examples/amm && cargo build --release --target wasm32-unknown-unknown)

# Publish and create the AMM application, linking to FUN1 and FUN2
AMM_APPLICATION_ID=$(linera --wait-for-outgoing-messages \
  publish-and-create examples/target/wasm32-unknown-unknown/release/amm_{contract,service}.wasm \
  --json-parameters "{\"tokens\":[\"$FUN1_APP_ID\",\"$FUN2_APP_ID\"]}" \
  --required-application-ids $FUN1_APP_ID $FUN2_APP_ID)
```

#### Matching Engine Application

This script publishes and deploys the matching engine application, requiring two fungible token application IDs as parameters.

```bash
MATCHING_ENGINE=$(linera --wait-for-outgoing-messages \
    project publish-and-create examples/matching-engine \
    --json-parameters "{\"tokens\":[\"$FUN1_APP_ID\",\"$FUN2_APP_ID\"]}" \
    --required-application-ids $FUN1_APP_ID $FUN2_APP_ID)
```

#### Request for Quote (RFQ) Application

Publishes and creates the RFQ application, specifying fungible application IDs as required dependencies.

```bash
APP_RFQ=$(linera -w 1 --wait-for-outgoing-messages \
    project publish-and-create examples/rfq \
    --required-application-ids $APP_ID_0 $APP_ID_1)
```

#### Crowd-Funding Campaign Application

Publishes and creates a crowd-funding campaign application, dependent on a fungible token application.

```bash
APP_ID_1=$(linera --with-wallet 1 \
           project publish-and-create \
           examples/crowd-funding \
           crowd_funding \
           --required-application-ids $APP_ID_0 \
           --json-argument '{ "owner": "'$OWNER_1'", "deadline": 4102473600000000, "target": "100." }' \
           --json-parameters '"'$APP_ID_0'"')

# Wait for it to fully complete
sleep 5
```

#### Large Language Model (LLM) Application

Deploys the LLM example application and creates an instance.

```bash
cd examples
APP_ID=$(linera project publish-and-create llm)
```

#### Generative NFT Application

This command publishes the generative NFT application and creates an instance.

```bash
# This command assumes you are in the examples directory or have built the project
# and the `gen-nft` binaries are available.
APP_ID=$(linera project publish-and-create examples/gen-nft)
```

#### Social Application

Publishes the 'social' example application and creates an instance.

```bash
APP_ID=$(linera --with-wallet 1 project publish-and-create examples/social)
```

#### Game-of-Life Application

Publishes the Game-of-Life challenge application and creates an instance on a specified chain. It also starts the Linera service for the application.

```bash
APP_ID=$(linera -w1 --wait-for-outgoing-messages \
  project publish-and-create examples/game-of-life-challenge gol_challenge $CHAIN_1 \
    --json-argument "null")

# Start the Linera service for interaction
linera -w1 service --port 8080 &
```

---

## Interacting with Linera Applications

Once deployed, applications can be interacted with using the Linera CLI, GraphQL queries and mutations, or programmatically via the Rust SDK.

### Querying Applications via GraphQL

Linera applications expose GraphQL endpoints for querying their state and available applications on a chain.

**Querying All Applications on a Chain:**

This query retrieves a list of applications on a specified chain, including their IDs and associated links.

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

**Querying a Counter Application's Value:**

This query retrieves the current value of a deployed counter application.

```graphql
query {
  value
}
```

**Retrieving an Application by ID (HTTP API):**

The Linera service provides an HTTP GET endpoint to retrieve application details by ID.

```http
GET /application?id=your_application_id
```

**Description:** Retrieves an application for querying.

**Method:** `GET`

**Endpoint:** `/application`

**Query Parameters:**
*   `id` (string) - Required - The unique identifier of the application.

**Request Example:**
```json
{
  "id": "your_application_id"
}
```

**Response (200 OK):**
*   **Application** (object) - An object representing the queried application.

**Response Example:**
```json
{
  "application_data": "..."
}
```

**Errors:**
*   If the application ID is invalid.

### Mutating Application State via GraphQL

GraphQL mutations are used to change the state of an application on the Linera network.

**Incrementing a Counter Application:**

This mutation increments the counter application's value by a specified amount (e.g., 3).

```graphql
mutation {
  increment(value: 3)
}
```

**Adding Liquidity to an AMM Application:**

This mutation adds liquidity to an Automated Market Maker (AMM) application, specifying the owner and maximum amounts of tokens to deposit.

```graphql
mutation {
  addLiquidity(
    owner: "$OWNER_1",
    maxToken0Amount: "40",
    maxToken1Amount: "40"
  )
}
```

### Interacting via Web Frontend

Some Linera applications come with web frontends for easier user interaction.

**Starting a Local Development Server for a Web Frontend:**

This command starts a local Vite development server for the web frontend of an application (e.g., the counter application).

```bash
# Ensure LINERA_APPLICATION_ID and LINERA_FAUCET_URL are set
export LINERA_APPLICATION_ID
export LINERA_FAUCET_URL

# Install dependencies and start the development server
pnpm install
pnpm dev
```

### Programmatic Interaction (Rust SDK)

Linera provides a Rust SDK for advanced programmatic interaction, including cross-application calls and on-chain management.

#### Calling Other Applications with Typed Interfaces

Linera contracts can interact with other deployed applications using their typed ABIs, enabling complex cross-application logic. This example demonstrates transferring tokens and performing token swaps.

```rust
use linera_sdk::{Contract, ContractRuntime};
use linera_sdk::base::{AccountOwner, Amount, Account}; // Assuming these types are defined
use fungible::{FungibleTokenAbi, Operation as FungibleOperation, FungibleResponse}; // Assuming these are from the fungible app's ABI

// Assuming AmmState is defined elsewhere
pub struct AmmContract {
    state: AmmState,
    runtime: ContractRuntime<Self>,
}

impl AmmContract {
    // Helper function to transfer tokens via the fungible token application
    fn transfer_token(
        &mut self,
        token_index: u32,
        owner: AccountOwner,
        amount: Amount,
        target: Account,
    ) {
        let params = self.runtime.application_parameters(); // Assuming parameters contain token app IDs
        let token_app_id = params.tokens[token_index as usize];

        let operation = FungibleOperation::Transfer {
            owner,
            amount,
            target_account: target,
        };

        // Call the fungible token application
        let response = self.runtime.call_application(
            true,  // authenticated call
            token_app_id,
            &operation,
        );

        assert!(matches!(response, FungibleResponse::Ok));
    }

    // Example of a swap function interacting with fungible tokens
    async fn swap(
        &mut self,
        owner: AccountOwner,
        input_token_idx: u32,
        input_amount: Amount,
        min_output: Amount,
    ) -> Amount {
        let output_token_idx = 1 - input_token_idx;

        // Transfer input tokens from the owner to the AMM application
        self.transfer_token(
            input_token_idx,
            owner,
            input_amount,
            Account {
                chain_id: self.runtime.chain_id(),
                owner: AccountOwner::Application(
                    self.runtime.application_id().forget_abi() // AMM application itself is the owner
                ),
            },
        );

        // Calculate output amount based on AMM reserves (simplified)
        let (reserve_in, reserve_out) = if input_token_idx == 0 {
            (self.state.reserve0.get(), self.state.reserve1.get())
        } else {
            (self.state.reserve1.get(), self.state.reserve0.get())
        };

        let output_amount = self.get_amount_out(input_amount, reserve_in, reserve_out);
        assert!(output_amount >= min_output, "Insufficient output amount");

        // Transfer output tokens from the AMM application to the owner
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

#### Managing Chains and Deploying Applications Programmatically

Linera contracts can also manage chains and deploy other applications directly on-chain, enabling powerful factory patterns or governance mechanisms.

```rust
use linera_sdk::{Contract, ContractRuntime};
use linera_sdk::base::{ChainOwnership, ApplicationPermissions, Bytecode, VmRuntime}; // Assuming these types are defined
use linera_sdk::contract::Response; // Assuming Response enum is defined

// Assuming FactoryContract, Operation, and Response enums are defined elsewhere
impl Contract for FactoryContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::CreateChain { initial_balance, owner } => {
                let chain_ownership = ChainOwnership::single(owner);
                let permissions = ApplicationPermissions::default();

                // Open a new chain with specified ownership and initial balance
                let new_chain_id = self.runtime.open_chain(
                    chain_ownership,
                    permissions,
                    initial_balance,
                );

                Response::ChainCreated { chain_id: new_chain_id }
            }
            Operation::DeployApplication { module_id, parameters, argument } => {
                // Create a new application instance on the current chain
                let app_id = self.runtime.create_application(
                    module_id,
                    &parameters,
                    &argument,
                    vec![],  // required_application_ids
                );

                Response::ApplicationCreated { application_id: app_id }
            }
            Operation::PublishModule { contract_bytes, service_bytes } => {
                let contract = Bytecode::load_from_bytes(contract_bytes);
                let service = Bytecode::load_from_bytes(service_bytes);

                // Publish a new application module from raw bytecode
                let module_id = self.runtime.publish_module(
                    contract,
                    service,
                    VmRuntime::Wasm,
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

---

## Conclusion

Linera offers a robust and flexible platform for developing and deploying decentralized applications. By understanding the core concepts of application modules, instances, and the various methods of interaction—from CLI and GraphQL to the powerful Rust SDK—developers can build sophisticated dApps that leverage the full potential of the Linera protocol.

This guide has covered the essential steps for setting up your environment, compiling, deploying, and interacting with Linera applications. For more detailed information, refer to the official Linera documentation and example repositories.
