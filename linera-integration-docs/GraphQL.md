# GraphQL API Reference for Linera

## Table of Contents
1. [Getting Started](#getting-started)
   - [Starting the GraphQL Service](#starting-the-graphql-service)
   - [Accessing the GraphiQL Interface](#accessing-the-graphiql-interface)
2. [Query Operations](#query-operations)
   - [Account Balances](#account-balances)
   - [Application State](#application-state)
   - [Chain Information](#chain-information)
   - [NFT Queries](#nft-queries)
   - [Game State Queries](#game-state-queries)
3. [Mutation Operations](#mutation-operations)
   - [Token Transfers](#token-transfers)
   - [NFT Operations](#nft-operations)
   - [Application Interactions](#application-interactions)
   - [Chain Management](#chain-management)
4. [Subscriptions](#subscriptions)
5. [Integration Examples](#integration-examples)
   - [Rust Service Implementation](#rust-service-implementation)

---

## 1. Getting Started

Linera applications expose a GraphQL API for interacting with their state and executing operations. This section details how to get started with the Linera GraphQL service and access its interactive interface.

### Starting the GraphQL Service

To interact with Linera chains and applications via GraphQL, you first need to start a local Linera node service. This service provides a GraphQL endpoint for your wallet and applications.

**Description:**
Starts a local Linera node service for the current wallet on a specified port, enabling connection via GraphQL clients. The command outputs the GraphQL endpoint URL, which can then be used to access the API or the GraphiQL interface.

**Command:**

```bash
PORT=8080
linera service --port $PORT &
echo "http://localhost:8080/chains/$CHAIN/applications/$LINERA_APPLICATION_ID"
```

**Usage Notes:**
*   Replace `$PORT` with your desired port (e.g., `8080`).
*   Replace `$CHAIN` with the ID of the chain you want to interact with.
*   Replace `$LINERA_APPLICATION_ID` with the ID of the specific application you want to query or mutate.
*   The `&` at the end runs the service in the background.
*   The `echo` command prints the expected GraphiQL endpoint URL.

### Accessing the GraphiQL Interface

Once the Linera service is running, you can access the interactive GraphiQL interface by navigating to the provided endpoint URL in your web browser. GraphiQL is an in-browser GraphQL IDE that allows you to explore the schema, construct queries, and execute mutations.

**Access URL Example:**
`http://localhost:8080/chains/0123456789abcdef0123456789abcdef/applications/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`

**Usage Notes:**
*   The exact URL will depend on the `PORT`, `CHAIN`, and `LINERA_APPLICATION_ID` you configured when starting the service.
*   GraphiQL provides auto-completion and documentation for the available queries, mutations, and types, making it an excellent tool for development and exploration.

---

## 2. Query Operations

Query operations allow you to retrieve the current state of the Linera blockchain and its deployed applications without making any state changes.

### Account Balances

These queries are used to retrieve information about token balances for various accounts.

#### Query Specific Account Balance

**Description:**
Retrieves the balance of fungible tokens for a specific account owner on a given chain.

**Query:**

```graphql
query GetBalance($owner: AccountOwner!) {
    accounts {
        entry(key: $owner) {
            value
        }
    }
}
```

**Example Variables:**

```json
{
    "owner": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
}
```

**Expected Response:**

```json
{
    "data": {
        "accounts": {
            "entry": {
                "value": "100.00"
            }
        }
    }
}
```

#### Query All Accounts and Balances

**Description:**
Retrieves a list of all account owners and their corresponding balances.

**Query:**

```graphql
query GetAllAccounts {
    accounts {
        keys
        entries {
            key
            value
        }
    }
}
```

### Application State

These queries allow you to inspect the state of various Linera applications.

#### Query Application Parameters (Token Info)

**Description:**
Retrieves global parameters of a fungible token application, such as its ticker symbol and total supply.

**Query:**

```graphql
query GetTokenInfo {
    tickerSymbol
    totalSupply
}
```

#### Query Counter Value

**Description:**
Retrieves the current value of a simple counter application.

**Query:**

```graphql
query {
  value
}
```

### Chain Information

These queries provide general information about the Linera chain itself.

#### Query General Chain Information

**Description:**
Retrieves fundamental information about the current chain, including its ID, current block height, timestamp, total chain balance, and owner balances.

**Query:**

```graphql
query GetChainInfo {
    chainId
    blockHeight
    timestamp
    chainBalance
    ownerBalances
}
```

### NFT Queries

These queries are specific to Non-Fungible Token (NFT) applications.

#### List All NFTs

**Description:**
Returns a list of all NFTs currently available within the application.

**Query:**

```graphql
query {
  nfts
}
```

#### Retrieve Specific NFT Details

**Description:**
Fetches the detailed information for a specific NFT, identified by its `tokenId`.

**Query:**

```graphql
query {
  nft(tokenId: "$TOKEN_ID") {
    tokenId,
    owner,
    prompt,
    minter,
    name,
    payload
  }
}
```

#### Check Owned NFTs

**Description:**
Retrieves a list of all NFTs owned by a specific account.

**Query:**

```graphql
query {
  ownedNfts(owner: "$OWNER_1") {
    tokenId,
    prompt
  }
}
```

### Game State Queries

These queries are used to inspect the state of game applications.

#### Query Game Chains

**Description:**
Retrieves a list of game chains managed by the application.

**Query:**

```graphql
query {
  gameChains {
    keys(count: 3)
  }
}
```

---

## 3. Mutation Operations

Mutation operations allow you to change the state of the Linera blockchain and its deployed applications.

### Token Transfers

These mutations facilitate the movement and management of fungible tokens.

#### Transfer Tokens

**Description:**
Initiates a token transfer between two accounts.

**Mutation:**

```graphql
mutation Transfer($owner: AccountOwner!, $amount: String!, $targetChain: ChainId!, $targetOwner: AccountOwner!) {
    transfer(
        owner: $owner
        amount: $amount
        targetAccount: {
            chainId: $targetChain
            owner: $targetOwner
        }
    )
}
```

**Example Variables:**

```json
{
    "owner": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    "amount": "50.00",
    "targetChain": "0xabcde12345abcde12345abcde12345abcde12345abcde12345abcde12345abcde",
    "targetOwner": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

**Usage Notes:**
*   Cross-chain transfers are supported by specifying a different `targetChainId`.
*   See [Cross-chain-messaging.md](Cross-chain-messaging.md) for more details on cross-chain operations.

#### Claim Fungible Tokens

**Description:**
Claim fungible tokens from a source account on one chain and transfer them to a target account on another chain.

**Mutation:**

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

### NFT Operations

These mutations allow for the creation and management of NFTs.

#### Mint a New NFT

**Description:**
Mint a new Non-Fungible Token (NFT).

**Mutation:**

```graphql
mutation {
  mint(
    minter: "$OWNER_1",
    prompt: "Hello!"
  )
}
```

**Usage Notes:**
*   The `prompt` string can be used to describe the NFT's content or characteristics.

### Application Interactions

These mutations cover various interactions with different Linera applications.

#### Subscribe to Another Chain's Posts

**Description:**
Allows a chain to subscribe to notifications or posts from another specified chain.

**Mutation:**

```graphql
mutation Subscribe($chainId: ChainId!) {
    subscribe(chainId: $chainId)
}
```

#### Create a Social Media Post

**Description:**
Publishes a new message to a Linera social media chain.

**Mutation:**

```graphql
mutation CreatePost($text: String!, $imageUrl: String) {
    post(
        text: $text
        imageUrl: $imageUrl
    )
}
```

#### Increment Counter Value

**Description:**
Increments the counter application's value by a specified amount.

**Mutation:**

```graphql
mutation {
  increment(value: 3)
}
```

### Chain Management

These mutations relate to chain-level operations.

#### Perform HTTP Request in Contract

**Description:**
Instructs a Linera contract to initiate an HTTP request.

**Mutation:**

```graphql
mutation {
  performHttpRequestInContract
}
```

**Usage Notes:**
*   Refer to [Design-Patterns.md](Design-Patterns.md) for more on oracle patterns.

---

## 4. Subscriptions

The provided examples do not include typical GraphQL subscriptions for real-time data streams. The `Subscribe` mutation refers to a state-changing operation where one chain registers to receive messages from another, rather than a client-side GraphQL subscription for live updates.

If real-time GraphQL subscriptions are supported by the Linera GraphQL service, additional examples and documentation would be required.

---

## 5. Integration Examples

### Rust Service Implementation

Linera applications can expose their own GraphQL service interfaces, implemented in Rust. This allows developers to define custom queries and mutations for their application's state.

**Description:**
This Rust code implements a GraphQL query interface for a Linera blockchain application, specifically a fungible token. It defines the `FungibleService` struct and implements the `Service` trait.

**Code:**

```rust
use linera_sdk::{
    Service, ServiceRuntime,
    linera_base_types::WithServiceAbi,
    views::View,
    graphql::GraphQLMutationRoot,
};
use async_graphql::{Object, Request, Response, Schema, EmptySubscription};
use std::sync::Arc;

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
            Operation::mutation_root(self.runtime.clone()),
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

    /// Retrieves the balance for a specific account owner.
    async fn balance(&self, owner: AccountOwner) -> Amount {
        self.state.accounts.get(&owner).await
            .expect("Failed to read balance")
            .unwrap_or(Amount::ZERO)
    }

    /// Retrieves the ticker symbol of the fungible token.
    async fn ticker_symbol(&self) -> String {
        self.runtime.application_parameters().ticker_symbol.clone()
    }

    /// Calculates and retrieves the total supply of the fungible token.
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
    Transfer { owner: AccountOwner, amount: Amount, target_account: Account },
}

linera_sdk::service!(FungibleService);
```

**Usage Notes:**
*   The `#[Object]` macro from `async_graphql` exposes methods as GraphQL fields.
*   `ServiceRuntime` provides access to application parameters and runtime context.
*   `GraphQLMutationRoot` defines the mutations available for the service.
*   For more details on service implementation, see [Design-Patterns.md](Design-Patterns.md#graphql-service-implementation).

---

## See Also

*   [Design-Patterns.md](Design-Patterns.md): GraphQL service implementation patterns
*   [Applications.md](Applications.md): Application deployment and lifecycle
*   [Cross-chain-messaging.md](Cross-chain-messaging.md): Cross-chain operations and messaging
*   [Wallets.md](Wallets.md): Wallet management and chain interactions
