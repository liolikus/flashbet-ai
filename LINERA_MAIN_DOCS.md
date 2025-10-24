# Linera Protocol: Integration Documentation

Welcome to the comprehensive integration documentation for the Linera Protocol. This collection provides everything you need to build, deploy, and manage applications on the Linera blockchain network.

## 📚 Documentation Overview

This documentation suite covers all aspects of Linera development, from initial wallet setup to advanced cross-chain messaging patterns. Each guide is designed to be self-contained while cross-referencing related topics for deeper understanding.

### What is Linera?

Linera is a layer-1 blockchain protocol designed for low-latency web applications that can scale linearly through a unique **microchain architecture**. Unlike traditional single-chain blockchains:

- **User-Centric Chains**: Each user can operate their own microchains
- **Parallel Execution**: Operations on different chains process concurrently
- **Asynchronous Messaging**: Secure cross-chain communication coordinated by validators
- **Horizontal Scalability**: Add more chains to scale, avoiding single-chain bottlenecks

---

## 🗂️ Documentation Structure

### Core Development Guides

#### 1. [Wallets.md](linera-integration-docs/Wallets.md)
**Comprehensive Wallet Management Guide**

Everything you need to manage Linera wallets, chains, and accounts.

**Topics Covered:**
- Environment setup and configuration
- CLI wallet initialization (single and multi-wallet)
- Chain creation and management
- Node service startup
- JavaScript/TypeScript client development
- MetaMask integration
- GraphQL wallet operations
- Token transfers and balance queries
- NFT operations

**Start Here If:** You're setting up your development environment or need to manage user wallets.

**Key Commands:**
```bash
linera wallet init --faucet $FAUCET_URL
linera wallet request-chain --faucet $FAUCET_URL
linera wallet show
linera service --port 8080
```

---

#### 2. [Applications.md](linera-integration-docs/Applications.md)
**Application Development and Deployment Guide**

Complete lifecycle management for Linera applications from development to production.

**Topics Covered:**
- Application architecture (Contract + Service)
- State management with Views
- Operations vs. Messages
- Building and compilation
- Module publishing
- Application instantiation
- Project scaffolding
- Upgrade patterns

**Start Here If:** You're building a new Linera application or deploying existing code.

**Key Patterns:**
```rust
#[derive(RootView)]
pub struct MyAppState {
    pub counter: RegisterView<u64>,
    pub balances: MapView<AccountOwner, Amount>,
}

impl Contract for MyContract {
    async fn execute_operation(&mut self, op: Operation) -> Response { ... }
    async fn execute_message(&mut self, msg: Message) { ... }
}
```

---

#### 3. [GraphQL.md](linera-integration-docs/GraphQL.md)
**Complete GraphQL API Reference**

Comprehensive guide to querying and mutating application state via GraphQL.

**Topics Covered:**
- Service initialization
- Query operations (balances, state, chain info)
- Mutation operations (transfers, updates)
- Subscriptions for real-time updates
- Fungible token operations
- NFT operations
- AMM and matching engine patterns
- Error handling

**Start Here If:** You're building frontends or integrating with existing applications.

**Example Queries:**
```graphql
query GetBalance($owner: AccountOwner!) {
    accounts { entry(key: $owner) { value } }
}

mutation Transfer($owner: AccountOwner!, $amount: String!, $target: Account!) {
    transfer(owner: $owner, amount: $amount, targetAccount: $target)
}
```

---

#### 4. [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)
**Cross-Chain Communication Patterns**

Deep dive into Linera's asynchronous messaging system.

**Topics Covered:**
- Message types and routing
- Event streams and subscriptions
- Cross-chain token transfers
- Message tracking and error handling
- Subscription patterns
- Multi-chain workflows
- Message authentication

**Start Here If:** Your application needs to communicate across multiple chains.

**Key Patterns:**
```rust
// Subscribe to events
self.runtime.subscribe_to_events(chain_id, app_id, stream_name);

// Emit events
self.runtime.emit(StreamName::from(b"events".to_vec()), &event);

// Send messages
self.runtime.prepare_message(message)
    .with_tracking()
    .with_authentication()
    .send_to(target_chain);
```

---

### Infrastructure & Operations

#### 5. [linera-service.md](linera-integration-docs/linera-service.md)
**Service and Network Management**

Configure and manage Linera services and network environments.

**Topics Covered:**
- Starting Linera services (single and multi-wallet)
- Local testnet setup
- Docker Compose deployment
- Service configuration
- Environment variables
- Storage backends

**Start Here If:** You're setting up development infrastructure or deploying services.

**Quick Start:**
```bash
# Local testnet
linera net up --validators 4 --shards 1

# Start services
linera service --port 8080 &
linera --with-wallet 2 service --port 8081 &
```

---

#### 6. [chain-management.md](linera-integration-docs/chain-management.md)
**Chain Lifecycle and Operations**

Manage chain creation, configuration, and lifecycle.

**Topics Covered:**
- Creating new chains
- Opening child chains
- Chain configuration
- Multi-chain orchestration
- Chain closing and archiving
- Resource management
- Performance optimization

**Start Here If:** Your application creates chains dynamically or manages complex chain hierarchies.

**Programmatic Chain Creation:**
```rust
let chain_id = self.runtime.open_chain(
    ChainOwnership::single(owner),
    ApplicationPermissions::default(),
    initial_balance,
);
```

---

#### 7. [Chain-ownership.md](linera-integration-docs/Chain-ownership.md)
**Chain Ownership and Permissions**

Security and access control for chains and applications.

**Topics Covered:**
- Ownership models (single, multi-sig)
- Permission management
- Ownership verification
- Ownership changes
- Application permissions
- Programmatic access control

**Start Here If:** You need fine-grained control over who can operate chains and applications.

**Key Operations:**
```bash
linera show-ownership --chain-id $CHAIN_ID
linera change-ownership --owners $OWNER_1 $OWNER_2
```

```rust
let signer = self.runtime.authenticated_signer()?;
self.runtime.check_account_permission(owner)?;
```

---

### Advanced Patterns

#### 8. [Design-Patterns.md](linera-integration-docs/Design-Patterns.md)
**Best Practices and Design Patterns**

Proven patterns for common Linera development scenarios.

**Topics Covered:**
- State management with Views (RegisterView, MapView, LogView)
- HTTP requests and Oracle patterns
- Cross-application communication
- Chain lifecycle management
- GraphQL service implementation
- Error handling patterns
- Testing strategies

**Start Here If:** You want to learn best practices or need solutions to common architectural challenges.

**Pattern Examples:**
- **Oracle Pattern**: Fetching external data via HTTP
- **Factory Pattern**: Creating application instances programmatically
- **Event Subscription Pattern**: Real-time cross-chain updates
- **Composability Pattern**: Calling other applications

---

## 🚀 Quick Start Guide

### 1. Environment Setup
```bash
# Install Rust and add wasm32 target
rustup target add wasm32-unknown-unknown

# Set up local testnet
export LINERA_TMP_DIR=$(mktemp -d)
export FAUCET_URL="http://localhost:8079"
linera net up --with-faucet --faucet-port 8079
```

### 2. Create Wallet and Chain
```bash
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

linera wallet init --faucet $FAUCET_URL
INFO=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN="${INFO[0]}"
OWNER="${INFO[1]}"
```

### 3. Build and Deploy Application
```bash
# Build application
cargo build --release --target wasm32-unknown-unknown

# Publish and create instance
APP_ID=$(linera project publish-and-create examples/my-app \
    --json-argument '{}' \
    --json-parameters '{}')
```

### 4. Start Service and Interact
```bash
# Start GraphQL service
linera service --port 8080 &

# GraphQL endpoint
echo "http://localhost:8080/chains/$CHAIN/applications/$APP_ID"

# Query via GraphQL
curl -X POST http://localhost:8080/chains/$CHAIN/applications/$APP_ID \
    -H "Content-Type: application/json" \
    -d '{"query": "query { /* your query */ }"}'
```

---

## 📖 Learning Paths

### For New Developers
1. **[Wallets.md](linera-integration-docs/Wallets.md)** - Set up your environment
2. **[Applications.md](linera-integration-docs/Applications.md)** - Build your first app
3. **[GraphQL.md](linera-integration-docs/GraphQL.md)** - Add a frontend
4. **[Design-Patterns.md](linera-integration-docs/Design-Patterns.md)** - Learn best practices

### For Backend Developers
1. **[Applications.md](linera-integration-docs/Applications.md)** - Application architecture
2. **[Design-Patterns.md](linera-integration-docs/Design-Patterns.md)** - State management patterns
3. **[Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)** - Inter-chain communication
4. **[chain-management.md](linera-integration-docs/chain-management.md)** - Dynamic chain creation

### For Frontend Developers
1. **[Wallets.md](linera-integration-docs/Wallets.md)** - Client-side wallet integration
2. **[GraphQL.md](linera-integration-docs/GraphQL.md)** - API queries and mutations
3. **[Applications.md](linera-integration-docs/Applications.md)** - Understanding application structure
4. **[Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)** - Real-time subscriptions

### For DevOps Engineers
1. **[linera-service.md](linera-integration-docs/linera-service.md)** - Service deployment
2. **[chain-management.md](linera-integration-docs/chain-management.md)** - Chain operations
3. **[Chain-ownership.md](linera-integration-docs/Chain-ownership.md)** - Access control
4. **[Wallets.md](linera-integration-docs/Wallets.md)** - Multi-wallet management

---

## 🔗 Key Concepts Quick Reference

### Microchains
- Personal blockchains for each user
- Parallel execution across chains
- Asynchronous cross-chain messaging
- Horizontal scalability

### Application Architecture
- **Contract**: State-changing logic, executes operations and messages
- **Service**: Read-only queries, exposes GraphQL API
- **Views**: Persistent state structures (RegisterView, MapView, LogView)
- **Operations**: Direct user-initiated actions
- **Messages**: Cross-chain asynchronous communication

### GraphQL API
- **Queries**: Read application state
- **Mutations**: Execute operations that change state
- **Subscriptions**: Real-time event streams
- Automatically generated from application schema

### Cross-Chain Communication
- **Event Streams**: Publish-subscribe pattern for cross-chain events
- **Messages**: Directed messages between chains
- **Subscriptions**: Subscribe to events from other chains
- **Tracking**: Ensure reliable message delivery

---

## 🛠️ Common Commands Reference

### Wallet Operations
```bash
linera wallet init --faucet $FAUCET_URL
linera wallet request-chain --faucet $FAUCET_URL
linera wallet show
linera --with-wallet 1 wallet show
```

### Application Deployment
```bash
cargo build --release --target wasm32-unknown-unknown
linera publish-module target/wasm32-unknown-unknown/release/*_{contract,service}.wasm
linera create-application $MODULE_ID --json-argument '{}' --json-parameters '{}'
linera project publish-and-create examples/my-app
```

### Service Management
```bash
linera service --port 8080
linera --with-wallet 1 service --port 8080 &
linera net up --validators 4 --shards 1
```

### Chain Management
```bash
linera show-ownership --chain-id $CHAIN_ID
linera change-ownership --owners $OWNER_1 $OWNER_2
linera close-chain $CHAIN_ID
linera assign --owner $OWNER --chain-id $CHAIN_ID
```

### Token Operations
```bash
linera transfer 10 --from $CHAIN1 --to $CHAIN2
linera query-balance $CHAIN1
linera query-balance $CHAIN1:$ACCOUNT1
```

---

## 🔍 Finding Information

### By Topic
- **Wallet Setup**: [Wallets.md](linera-integration-docs/Wallets.md)
- **Building Apps**: [Applications.md](linera-integration-docs/Applications.md)
- **GraphQL APIs**: [GraphQL.md](linera-integration-docs/GraphQL.md)
- **Cross-Chain**: [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)
- **Services**: [linera-service.md](linera-integration-docs/linera-service.md)
- **Chain Ops**: [chain-management.md](linera-integration-docs/chain-management.md)
- **Security**: [Chain-ownership.md](linera-integration-docs/Chain-ownership.md)
- **Best Practices**: [Design-Patterns.md](linera-integration-docs/Design-Patterns.md)

### By Use Case
- **Building a Token**: Applications.md → GraphQL.md → Design-Patterns.md
- **Multi-User DApp**: Wallets.md → Applications.md → Cross-chain-messaging.md
- **Oracle Integration**: Design-Patterns.md (HTTP Requests section)
- **NFT Marketplace**: Applications.md → GraphQL.md (NFT Operations)
- **DEX/AMM**: Applications.md → Cross-chain-messaging.md → Design-Patterns.md
- **Social Network**: Cross-chain-messaging.md → GraphQL.md (Subscriptions)
- **Game with Multiple Players**: Wallets.md (Multi-wallet) → Chain-ownership.md → chain-management.md

---

## 📝 Code Examples Repository

Each documentation file includes complete, runnable code examples:

- **State Management**: Design-Patterns.md
- **GraphQL Queries**: GraphQL.md
- **Cross-Chain Messaging**: Cross-chain-messaging.md
- **Application Deployment**: Applications.md
- **Wallet Integration**: Wallets.md
- **Service Configuration**: linera-service.md

All examples include:
- Complete code snippets with comments
- Practical use cases
- Error handling patterns
- Integration with other components

---

## 🤝 Contributing

This documentation is maintained as part of the Linera integration project. Each file is designed to be:
- **Self-contained**: Can be read independently
- **Cross-referenced**: Links to related topics
- **Practical**: Includes real-world examples
- **Up-to-date**: Reflects latest Linera SDK patterns

---

## 📚 Additional Resources

### Official Linera Resources
- **Linera Protocol GitHub**: https://github.com/linera-io/linera-protocol
- **Developer Documentation**: https://linera-dev.respeer.ai/
- **SDK Reference**: https://docs.rs/linera-sdk/

### Example Applications
All example references in this documentation are based on the official Linera example applications:
- Fungible Token
- Non-Fungible Token (NFT)
- Crowd Funding
- Automated Market Maker (AMM)
- Matching Engine
- Social Media
- Counter
- Hex Game

---

## 🎯 Next Steps

1. **New to Linera?** Start with [Wallets.md](linera-integration-docs/Wallets.md) to set up your environment
2. **Ready to Build?** Jump to [Applications.md](linera-integration-docs/Applications.md) for application development
3. **Building Frontends?** Check [GraphQL.md](linera-integration-docs/GraphQL.md) for API integration
4. **Advanced Use Cases?** Explore [Design-Patterns.md](linera-integration-docs/Design-Patterns.md) for proven patterns

---

**Version**: 1.0.0
**Last Updated**: 2025
**Linera SDK**: Compatible with linera-sdk@0.15.3+
