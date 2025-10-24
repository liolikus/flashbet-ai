# Design Patterns in Linera

This document outlines common design patterns and best practices for developing applications on the Linera blockchain. It covers state management, inter-application communication, external integrations, chain lifecycle, and GraphQL API implementation.

## Table of Contents
1. [State Management with Views](#state-management-with-views)
2. [HTTP Requests and Oracle Patterns](#http-requests-and-oracle-patterns)
3. [Cross-Application Communication](#cross-application-communication)
4. [Chain Lifecycle Management](#chain-lifecycle-management)
5. [GraphQL Service Implementation](#graphql-service-implementation)

---

## 1. State Management with Views

Linera provides a robust, type-safe view abstraction layer for persisting application state. Views are memory-efficient and allow developers to define complex data structures that are automatically stored and retrieved from the underlying storage context. This pattern is fundamental for any stateful Linera application.

### Practical Use Cases
*   **Counters and simple values:** Using `RegisterView` for single, atomic values.
*   **Account balances or key-value stores:** Employing `MapView` for efficient lookup and modification of data associated with unique keys.
*   **Transaction logs and event histories:** Leveraging `LogView` for append-only data structures.
*   **Complex custom data structures:** Combining multiple views within a `RootView` or `CustomMapView` to build intricate application states.

### Code Example: `ApplicationState` with various Views

This example demonstrates how to define an `ApplicationState` struct using `RootView` and various Linera view types to manage a counter, account balances, a transaction history, and custom key-value data.

```rust
use linera_sdk::views::{
    RootView, View, RegisterView, MapView, LogView, CustomMapView,
    ViewStorageContext,
};
use linera_base_types::{AccountOwner, Amount, Timestamp}; // Assuming these types are available
use serde::{Deserialize, Serialize}; // For Transaction struct

// Define the root view for your application's state.
// The `#[view(context = ViewStorageContext)]` attribute specifies the storage context.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct ApplicationState {
    /// A simple counter, stored as a RegisterView<u64>.
    pub counter: RegisterView<u64>,
    /// Balances for different account owners, stored in a MapView.
    pub balances: MapView<AccountOwner, Amount>,
    /// A log of transactions, useful for historical data.
    pub history: LogView<Transaction>,
    /// Custom key-value data, demonstrating CustomMapView.
    pub custom_data: CustomMapView<Key, Value>,
}

// Implement methods to interact with the application state.
impl ApplicationState {
    /// Increments the counter and returns the new value.
    pub async fn increment_counter(&mut self) -> u64 {
        let current = *self.counter.get(); // Dereference to get the current u64 value
        let new_value = current + 1;
        self.counter.set(new_value); // Update the RegisterView
        new_value
    }

    /// Adds an amount to an account owner's balance.
    pub async fn add_balance(&mut self, owner: AccountOwner, amount: Amount) {
        // Retrieve current balance, or use ZERO if not found.
        let current = self.balances.get(&owner).await
            .expect("Failed to read balance from MapView")
            .unwrap_or(Amount::ZERO);
        let new_balance = current.saturating_add(amount); // Safely add amount
        self.balances.insert(&owner, new_balance)
            .expect("Failed to update balance in MapView");
    }

    /// Records a new transaction in the history log.
    pub async fn record_transaction(&mut self, tx: Transaction) {
        self.history.push(tx); // Append transaction to LogView
    }

    /// Retrieves a transaction by its index from the history.
    pub async fn get_transaction(&self, index: usize) -> Option<Transaction> {
        self.history.get(index).await.expect("Failed to read transaction from LogView")
    }

    /// Returns the total number of transactions recorded.
    pub async fn transaction_count(&self) -> usize {
        self.history.count()
    }
}

// Example structs for `Transaction`, `Key`, and `Value`
// These would typically be defined elsewhere in your application.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub from: AccountOwner,
    pub to: AccountOwner,
    pub amount: Amount,
    pub timestamp: Timestamp,
}

// Placeholder for Key and Value types used in CustomMapView
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub struct Key(pub String);
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Value(pub String);
```

### See also
*   [Applications.md](Applications.md): For how to integrate `RootView` into a full Linera application.
*   Linera SDK documentation on `linera_sdk::views`.

---

## 2. HTTP Requests and Oracle Patterns

Linera contracts can interact with external services and other Linera applications. This pattern demonstrates how to make HTTP requests to off-chain APIs (e.g., for price feeds) and query other deployed Linera services, effectively acting as an oracle.

### Practical Use Cases
*   **Price Oracles:** Fetching real-world asset prices from external exchanges.
*   **Data Feeds:** Integrating with external data providers for weather, sports scores, or other information.
*   **Cross-Service Queries:** Retrieving data from another application's service on the same or a different chain.
*   **Scheduled Tasks:** Performing operations at specific times, often triggered by a scheduler and relying on external data.

### Code Example: `OracleContract` for HTTP and Service Queries

This `OracleContract` illustrates `http_request` for fetching data from an external API and `query_service` for interacting with another Linera application. It also shows how to handle time-sensitive operations using `assert_before`.

```rust
use linera_sdk::{Contract, ContractRuntime};
use serde::{Deserialize, Serialize};
use linera_base_types::Amount; // Assuming Amount is defined

// Placeholder for OracleContract's state and operation/response types.
// In a real application, these would be fully defined.
pub struct OracleContract {
    state: OracleState,
    runtime: ContractRuntime<Self>,
}

#[derive(Default)]
pub struct OracleState {
    pub prices: MapView<String, Amount>,
    pub external_prices: MapView<String, Amount>,
}

#[derive(Deserialize, Serialize)]
pub enum Operation {
    FetchPrice { symbol: String },
    QueryOtherService { app_id: linera_base_types::ApplicationId, symbol: String },
    ScheduledUpdate { timestamp: linera_base_types::Timestamp },
}

#[derive(Deserialize, Serialize)]
pub enum Response {
    PriceUpdated { symbol: String, price: Amount },
    ExternalPriceReceived { symbol: String, price: Amount },
    Error(String),
    Ok,
}

// Contract implementation for handling operations.
impl Contract for OracleContract {
    // In a real contract, load and store methods would be present.
    // For this example, we focus on execute_operation.
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        // Placeholder for loading state.
        // let state = OracleState::load(runtime.root_view_storage_context()).await.expect("Failed to load state");
        OracleContract { state: OracleState::default(), runtime }
    }

    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::FetchPrice { symbol } => {
                // Construct an HTTP GET request to an external API.
                let request = http::Request::builder()
                    .method("GET")
                    .uri(format!("https://api.example.com/price/{}", symbol))
                    .header("Accept", "application/json")
                    .body(Vec::new())
                    .expect("Failed to build HTTP request");

                // Execute the HTTP request using the runtime.
                let response = self.runtime.http_request(request);

                // Process the HTTP response.
                if response.status() == http::StatusCode::OK {
                    let body = String::from_utf8(response.body().to_vec())
                        .expect("HTTP response body is not valid UTF-8");
                    let price: Price = serde_json::from_str(&body)
                        .expect("Failed to parse JSON response into Price struct");

                    // Store the fetched price in the contract's state.
                    self.state.prices.insert(&symbol, price.value)
                        .expect("Failed to store price in state");

                    Response::PriceUpdated { symbol, price: price.value }
                } else {
                    Response::Error(format!("Failed to fetch price: HTTP Status {}", response.status()))
                }
            }
            Operation::QueryOtherService { app_id, symbol } => {
                // Define the query for another application's service.
                let query = PriceQuery { symbol: symbol.clone() };
                // Execute the query to another Linera application's service.
                let result: PriceResponse = self.runtime.query_service(
                    app_id,
                    query,
                );

                // Store the price received from the other service.
                self.state.external_prices.insert(&symbol, result.price)
                    .expect("Failed to store external price");

                Response::ExternalPriceReceived { symbol, price: result.price }
            }
            Operation::ScheduledUpdate { timestamp } => {
                // Assert a time constraint: ensure this operation is executed before a specific timestamp.
                self.runtime.assert_before(timestamp);

                // Perform time-sensitive operations, e.g., update prices based on a schedule.
                // This `update_prices` function would contain logic to fetch and store prices.
                self.update_prices().await;

                Response::Ok
            }
        }
    }

    // Placeholder for a method that would update prices, potentially calling FetchPrice internally.
    async fn update_prices(&mut self) {
        // Example: Fetch price for a specific symbol
        // let _ = self.execute_operation(Operation::FetchPrice { symbol: "BTC".to_string() }).await;
    }

    async fn store(mut self) {
        // self.state.save().await.expect("Failed to save state");
    }
}

// Structs for parsing HTTP response and service query.
#[derive(Serialize, Deserialize)]
struct Price {
    symbol: String,
    value: Amount,
    timestamp: u64,
}

#[derive(Serialize, Deserialize)]
struct PriceQuery {
    symbol: String,
}

#[derive(Serialize, Deserialize)]
struct PriceResponse {
    price: Amount,
}
```

### See also
*   [Cross-Application Communication](#cross-application-communication): For more details on interacting with other Linera applications.
*   Linera SDK documentation on `ContractRuntime::http_request` and `ContractRuntime::query_service`.

---

## 3. Cross-Application Communication

Linera applications are designed to interact seamlessly, both on the same chain and across different chains. This pattern covers various forms of inter-application communication, including direct calls, message passing, and event subscriptions.

### Practical Use Cases
*   **Token Transfers:** Sending tokens from one account to another, potentially across chains, often involving a fungible token application.
*   **Decentralized Exchanges (DEXs):** Implementing token swaps by calling fungible token contracts to manage reserves and transfers.
*   **Social Media Feeds:** Subscribing to events (e.g., new posts) from other social media applications on different chains.
*   **Building Composability:** Creating complex dApps by combining functionalities from multiple smaller, specialized applications.

### See also
*   [HTTP Requests and Oracle Patterns](#http-requests-and-oracle-patterns): For querying other services.
*   [Applications.md](Applications.md): For general application development.
*   Linera SDK documentation on `ContractRuntime::call_application`, `ContractRuntime::prepare_message`, `ContractRuntime::send_to`, `ContractRuntime::subscribe_to_events`, `ContractRuntime::emit`, and `ContractRuntime::read_event`.

---

## 4. Chain Lifecycle Management

Linera allows applications to programmatically manage the lifecycle of chains and other applications. This includes creating new chains, deploying applications, publishing modules, and closing chains. CLI tools also provide direct ways to manage these aspects.

### Practical Use Cases
*   **Decentralized Autonomous Organizations (DAOs):** Creating new sub-chains for specific proposals or working groups.
*   **Multi-Tenant Applications:** Provisioning dedicated chains for individual users or organizations.
*   **Application Factories:** A "factory" contract that deploys instances of other applications with specific parameters.
*   **Automated Deployment:** Scripting the deployment of complex application ecosystems.

### See also
*   [chain-management.md](chain-management.md): For a more in-depth guide on managing chains.
*   Linera SDK documentation on `ContractRuntime::open_chain`, `ContractRuntime::create_application`, `ContractRuntime::publish_module`, and `ContractRuntime::close_chain`.
*   Linera CLI documentation.

---

## 5. GraphQL Service Implementation

Linera applications can expose a GraphQL API, allowing clients to query application state and execute operations using a standardized, flexible interface. This pattern is essential for building user-facing applications and integrating with front-ends.

### Practical Use Cases
*   **Querying Application State:** Retrieving account balances, transaction histories, social media posts, or any other data stored in views.
*   **Executing Operations:** Initiating token transfers, creating posts, incrementing counters, or any other contract operation.
*   **Rich Client Interfaces:** Providing a powerful and type-safe API for web and mobile applications.
*   **Cross-Chain Interactions:** Facilitating claims or other operations that span multiple chains via GraphQL mutations.

### See also
*   [State Management with Views](#state-management-with-views): For the underlying data structures queried by GraphQL.
*   [Cross-Application Communication](#cross-application-communication): For how mutations might trigger cross-chain messages.
*   Linera SDK documentation on `linera_sdk::Service` and `async_graphql`.
