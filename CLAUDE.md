# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a planning and documentation repository for the **Linera Buildathon** (Oct 2025 - Jan 2026). The project is **FlashBet AI**, a real-time sports prediction market application leveraging Linera's microchain architecture.

**Current Status**: Planning phase - no implementation code yet. All implementation will use `linera-sdk@0.15.3` or higher.

**Consensus Validation**: Architecture validated by Gemini 2.5 Pro & Flash (8/10 confidence) - technically sound and optimally suited for Linera, but requires aggressive scope management for 18-day timeline.

### Repository Structure

```
flashbet-ai/
├── LINERA_MAIN_DOCS.md          # Main documentation index (START HERE)
├── CLAUDE.md                     # This file - project instructions
├── linera-integration-docs/      # Comprehensive Linera documentation
│   ├── Wallets.md               # Wallet & chain management (902 lines)
│   ├── Applications.md          # Application development (705 lines)
│   ├── GraphQL.md               # GraphQL API reference (522 lines)
│   ├── Cross-chain-messaging.md # Cross-chain communication (731 lines)
│   ├── linera-service.md        # Service & network management (176 lines)
│   ├── chain-management.md      # Chain operations (622 lines)
│   ├── Chain-ownership.md       # Ownership & permissions (243 lines)
│   └── Design-Patterns.md       # Best practices & patterns (309 lines)
├── ORACLE_INTEGRATION_SOLUTION.md # Oracle implementation guide
└── [Project-specific docs...]
```

## 📚 Linera Technical Documentation

**IMPORTANT**: Before implementing any Linera feature, consult the comprehensive documentation:

### Quick Reference Guide

| Task | Documentation | Quick Link |
|------|---------------|------------|
| **Setup environment** | Wallets.md | [Environment Setup](linera-integration-docs/Wallets.md#2-environment-setup) |
| **Create wallets/chains** | Wallets.md | [CLI Management](linera-integration-docs/Wallets.md#3-cli-wallet-and-chain-management) |
| **Build contracts** | Applications.md | [Application Structure](linera-integration-docs/Applications.md) |
| **Deploy applications** | Applications.md | [Deployment Guide](linera-integration-docs/Applications.md) |
| **GraphQL queries** | GraphQL.md | [API Reference](linera-integration-docs/GraphQL.md) |
| **Cross-chain messages** | Cross-chain-messaging.md | [Messaging Patterns](linera-integration-docs/Cross-chain-messaging.md) |
| **Event streams** | Cross-chain-messaging.md | [Subscriptions](linera-integration-docs/Cross-chain-messaging.md) |
| **State management** | Design-Patterns.md | [Views & State](linera-integration-docs/Design-Patterns.md#1-state-management-with-views) |
| **Oracle patterns** | Design-Patterns.md | [HTTP Requests](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns) |
| **Start services** | linera-service.md | [Service Startup](linera-integration-docs/linera-service.md#4-linera-node-service-startup) |
| **Chain ownership** | Chain-ownership.md | [Permissions](linera-integration-docs/Chain-ownership.md) |
| **Open/close chains** | chain-management.md | [Lifecycle](linera-integration-docs/chain-management.md) |

### Documentation Entry Points

**For New Linera Developers**: Start with [LINERA_MAIN_DOCS.md](LINERA_MAIN_DOCS.md) which provides:
- Quick Start Guide (4 steps to deployment)
- Learning paths by role (Backend, Frontend, DevOps)
- Complete command reference
- Use case navigation

**For Specific Features**:
- **Wallets & Setup**: [linera-integration-docs/Wallets.md](linera-integration-docs/Wallets.md)
- **Building Apps**: [linera-integration-docs/Applications.md](linera-integration-docs/Applications.md)
- **API Integration**: [linera-integration-docs/GraphQL.md](linera-integration-docs/GraphQL.md)
- **Cross-Chain**: [linera-integration-docs/Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)
- **Best Practices**: [linera-integration-docs/Design-Patterns.md](linera-integration-docs/Design-Patterns.md)

---

## Project Architecture: FlashBet AI

### Microchain Design

The application uses Linera's parallel microchain architecture with four distinct chain types:

1. **User Chains** - Personal chains for each user
   - Balance tracking and bet placement
   - Receives payout distributions
   - Stores betting history
   - **Implementation Reference**: [Applications.md - State Management](linera-integration-docs/Applications.md)

2. **Market Chains** - One chain per prediction market
   - Manages betting pools for each outcome
   - Handles bet validation and pool calculations
   - Executes market resolution and payout distribution
   - Each market operates independently for horizontal scalability
   - **Implementation Reference**: [Design-Patterns.md - State Views](linera-integration-docs/Design-Patterns.md#1-state-management-with-views)

3. **Oracle Chain** - External event data feed
   - Publishes verified sports event results
   - Uses signature validation for data authenticity
   - Supports event streams for real-time updates
   - **Implementation Reference**: [Design-Patterns.md - Oracle Pattern](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns)

4. **AI Agent Chain** *(Wave 2+)*
   - Dynamic odds calculation using AI models
   - Integration via MCP/GraphQL
   - Deferred from Wave 1 MVP

### Cross-Chain Message Flow

```
User Chain → Market Chain: PlaceBet message (includes bet amount, outcome)
Oracle Chain → Market Chain: EventResolution (triggers payout calculation)
Market Chain → User Chains: PayoutDistribution (winner settlements)
```

**Implementation Guide**: [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)

**Critical Design Constraint**: Linera contracts CANNOT make outbound network calls. Oracle and AI integrations must be off-chain services that submit transactions to their respective chains.

### Off-Chain Oracle Architecture (Detailed)

**The Constraint:** Linera contracts are deterministic and cannot make HTTP requests. Validators must reach consensus, so non-deterministic operations would cause failures.

**The Solution:** Off-chain worker architecture
```
External APIs → Off-Chain Worker → Signs Transaction → Oracle Chain Contract → Event Stream → Market Chains
```

**Components:**
1. **Oracle Chain Contract (On-Chain)**
   - Stores event results with `MapView<EventId, EventResult>`
   - Validates authorization using `runtime.authenticated_signer()`
   - Emits events via `runtime.emit(StreamName, &event)`
   - Prevents duplicate submissions with idempotency checks
   - **Reference**: [Design-Patterns.md - State Management](linera-integration-docs/Design-Patterns.md#1-state-management-with-views)

2. **Off-Chain Worker (Wave 1: Python, Wave 2+: Node.js)**
   - Fetches data from external APIs (MLB, NBA, etc.)
   - Signs transactions with EIP-191 signature
   - Submits via GraphQL mutations to Oracle Chain
   - Includes retry logic, rate limiting, circuit breakers
   - **Reference**: [GraphQL.md - Mutations](linera-integration-docs/GraphQL.md)

3. **Market Chain Integration**
   - Subscribes to Oracle events: `runtime.subscribe_to_events(chain_id, app_id, stream)`
   - Processes events in `process_streams()` callback
   - Auto-resolves markets and distributes payouts
   - **Reference**: [Cross-chain-messaging.md - Event Streams](linera-integration-docs/Cross-chain-messaging.md)

**Security Pattern:**
```rust
// Contract validates authorized oracles
let signer = self.runtime.authenticated_signer().expect("Must be signed");
let is_authorized = self.state.authorized_oracles.contains(&signer).await?;
assert!(is_authorized, "Unauthorized oracle");

// Prevent replays
let existing = self.state.event_results.get(&result.event_id).await?;
assert!(existing.is_none(), "Result already published");
```

**Complete Implementation**: See [ORACLE_INTEGRATION_SOLUTION.md](ORACLE_INTEGRATION_SOLUTION.md) and [Design-Patterns.md - Oracle Pattern](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns)

---

## Timeline & Feasibility Assessment

**Expert Consensus (Gemini 2.5 Pro + Flash):**
- ✅ **Architecture**: Exemplary, optimal for Linera (unanimous agreement)
- ✅ **Technical Feasibility**: All features achievable with SDK
- ⚠️ **Timeline Risk**: 18 days for full scope is extremely aggressive
- **Confidence**: 8/10 for architecture, 6/10 for timeline execution

**Critical Finding:** Phase 2 (Core Logic, 6 days) and Phase 3 (Frontend, 5 days) are underestimated. Realistic allocation:
- Phase 2 should be 8-10 days (cross-chain debugging is complex)
- Phase 3 should be 7-8 days (GraphQL subscriptions + wallet integration)
- Total realistic timeline: 21-24 days

**Recommendation:** Either extend timeline OR simplify frontend to CLI demo for Wave 1.

---

## Wave 1 MVP Scope (Revised Based on Consensus)

### Must Have (Non-Negotiable)
- User Chain: balance tracking, bet placement operations
- Market Chain: pool management, resolution, payouts
- Basic Oracle Chain: script-triggered event publishing (Python manual script)
- **Minimal frontend**: CLI-based demo OR simple read-only web page
- Complete betting cycle demonstration (target <15s, <10s as stretch goal)

### Should Have (High Priority)
- GraphQL subscriptions for real-time updates
- Simple pool-based odds calculation
- Basic bet validation and error handling
- Integration tests by Day 7 (not Day 16!)

### Explicitly Cut from Wave 1
- ❌ AI Agent Chain (move to Wave 2)
- ❌ AI-powered dynamic odds (use fixed/pool-based odds)
- ❌ Live MLB API integration (use mock oracle with manual triggers)
- ❌ Full React application with polish (CLI demo acceptable)
- ❌ Wallet integration UI (use linera CLI directly)

### Stretch Goals (If Time Permits)
- Connect to live MLB Stats API
- Multiple bet types (2-3 instead of just 1)
- User statistics display
- Mobile-responsive UI

### Risk Mitigation Strategy
**Priority #1**: Core betting loop must be bulletproof. All features are secondary to: place bet → resolve market → receive payout.

**Daily Checkpoints:**
- **Day 7**: IF integration test fails → simplify message flows
- **Day 10**: IF cycle time >30s → accept slower performance, focus on correctness
- **Day 12**: IF contracts incomplete → cut payout history feature
- **Day 14**: IF frontend delayed → skip web UI, CLI demo only

Start with mock oracle (script-triggered) to decouple on-chain logic from external API dependencies. Manual resolution is acceptable for Wave 1 demo.

---

## Implementation Phases (Revised with Realistic Timeline)

### Phase 0: Setup & Validation (Days 1-2)

**Day 1 - Environment Setup:**
- Install Linera CLI and Rust toolchain
- Add wasm32-unknown-unknown target: `rustup target add wasm32-unknown-unknown`
- Initialize local testnet: `linera net up --validators 4 --shards 1`
- Create Git repository and project structure
- **Reference**: [Wallets.md - Environment Setup](linera-integration-docs/Wallets.md#2-environment-setup)

**Day 2 - Technical Validation:**
- Complete Linera quickstart tutorial
- Study example apps (fungible token, AMM, social)
- Test cross-chain messaging between two chains
- Validate GraphQL API generation and subscriptions
- Test event streams with `emit()` and `process_streams()`
- Confirm deployment to testnet works
- **References**:
  - [Applications.md - Getting Started](linera-integration-docs/Applications.md)
  - [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)
  - [GraphQL.md - Subscriptions](linera-integration-docs/GraphQL.md)

**Deliverable:** Working multi-chain "Hello World" application

**Success Criteria:**
- [ ] Linera CLI operational
- [ ] Counter example deployed successfully
- [ ] GraphQL subscriptions working
- [ ] Cross-chain message test passed
- [ ] Event stream validated

---

### Phase 1: Foundation (Days 3-4)

**Critical Tasks:**

1. **Define ALL data structures in Rust:**
```rust
// Shared Types
pub struct MarketId(pub u64);
pub enum Outcome { TeamA, TeamB, Draw }
pub enum MarketStatus { Open, Locked, Resolved(Outcome), Cancelled }

// User Chain State
#[derive(RootView)]
pub struct UserState {
    balance: RegisterView<Amount>,
    active_bets: MapView<MarketId, Bet>,
    bet_history: MapView<u64, Bet>,
}

// Market Chain State
#[derive(RootView)]
pub struct MarketState {
    info: RegisterView<MarketInfo>,
    status: RegisterView<MarketStatus>,
    pools: MapView<Outcome, Amount>,
    bets: MapView<u64, Bet>,
    total_pool: RegisterView<Amount>,
}

// Oracle Chain State
#[derive(RootView)]
pub struct OracleState {
    results: MapView<MarketId, EventResult>,
    authorized_publishers: SetView<AccountOwner>,
}
```
**Implementation Reference**: [Design-Patterns.md - State Management with Views](linera-integration-docs/Design-Patterns.md#1-state-management-with-views)

2. **Scaffold applications:**
```bash
linera project new flashbet-user
linera project new flashbet-market
linera project new flashbet-oracle
```
**Reference**: [Applications.md - Project Scaffolding](linera-integration-docs/Applications.md)

3. **Document inter-chain message interfaces:**
   - User → Market: `PlaceBet { bet: Bet }`
   - Market → User: `Payout { market_id, amount }`
   - Oracle → Market: Event stream (no direct messages)
   - **Reference**: [Cross-chain-messaging.md - Message Types](linera-integration-docs/Cross-chain-messaging.md)

**Deliverable:** Complete type definitions and scaffolded projects

**Success Criteria:**
- [ ] All data structures compile without errors
- [ ] Three application projects created
- [ ] Message interfaces documented
- [ ] Contract/Service skeletons defined

---

### Phase 2: Core Logic (Days 5-12) - **EXTENDED FROM ORIGINAL**

**Sprint 1: Market Contract (Days 5-7)** - *Extended by 1 day*

```rust
// Key Implementation Points
async fn execute_operation(&mut self, operation: Operation) {
    match operation {
        Operation::CreateMarket { event_id, ... } => {
            // Subscribe to Oracle Chain
            self.runtime.subscribe_to_events(
                oracle_chain_id,
                oracle_app.forget_abi(),
                StreamName::from(b"event_results".to_vec())
            );
        }
    }
}

async fn execute_message(&mut self, message: Message) {
    match message {
        Message::PlaceBet { bet } => {
            // Validate bet
            // Update pool
            // Store bet record
            // Emit event
        }
    }
}

async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
    for update in updates {
        for index in update.new_indices() {
            let event = self.runtime.read_event(...);
            // Auto-resolve market on oracle event
        }
    }
}
```
**References**:
- [Applications.md - Operations & Messages](linera-integration-docs/Applications.md)
- [Cross-chain-messaging.md - Event Streams](linera-integration-docs/Cross-chain-messaging.md)

**Sprint 2: User Contract (Days 8-9)**

```rust
async fn execute_operation(&mut self, operation: Operation) {
    match operation {
        Operation::PlaceBet { market_chain, market_id, outcome, amount } => {
            // 1. Authenticate
            let signer = self.runtime.authenticated_signer().expect(...);

            // 2. Debit balance
            let balance = self.state.balance.get_mut();
            *balance = balance.checked_sub(amount).expect("Insufficient funds");

            // 3. Send cross-chain message
            self.runtime
                .prepare_message(MarketMessage::PlaceBet { bet })
                .with_tracking()        // CRITICAL: Bounce if rejected
                .with_authentication()  // CRITICAL: Forward identity
                .send_to(market_chain);

            // 4. Emit event
            self.runtime.emit(..., &UserEvent::BetPlaced);
        }
    }
}
```
**References**:
- [Cross-chain-messaging.md - Message Tracking](linera-integration-docs/Cross-chain-messaging.md)
- [Chain-ownership.md - Authentication](linera-integration-docs/Chain-ownership.md)

**Sprint 3: Oracle Integration (Days 10-12)** - *Extended by 2 days*

**Day 10: Oracle Chain Contract**
```rust
async fn execute_operation(&mut self, operation: Operation) {
    match operation {
        Operation::PublishResult { result } => {
            // 1. Validate authorization
            let signer = self.runtime.authenticated_signer().expect("Must be signed");
            assert!(self.state.authorized_oracles.contains(&signer).await?);

            // 2. Prevent duplicates
            assert!(self.state.event_results.get(&result.event_id).await?.is_none());

            // 3. Store result
            self.state.event_results.insert(&result.event_id, result.clone())?;

            // 4. Emit event to subscribers
            self.runtime.emit(
                StreamName::from(b"event_results".to_vec()),
                &OracleEvent::ResultPublished { result }
            );
        }
    }
}
```
**References**:
- [Design-Patterns.md - Oracle Pattern](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns)
- [ORACLE_INTEGRATION_SOLUTION.md](ORACLE_INTEGRATION_SOLUTION.md)

**Day 11: Off-Chain Mock Oracle Script (Python)**
```python
#!/usr/bin/env python3
# oracle-worker/flashbet_oracle_manual.py

class LineraOracleClient:
    def publish_result(self, event_id, outcome, score=None):
        # Build GraphQL mutation
        mutation = """
            mutation PublishResult($eventId: String!, $outcome: String!) {
                publishResult(result: {
                    eventId: $eventId,
                    outcome: $outcome,
                    score: $score,
                    timestamp: %d
                })
            }
        """ % int(time.time() * 1000)

        # Submit via linera service
        # See ORACLE_INTEGRATION_SOLUTION.md for full implementation
```
**Reference**: [GraphQL.md - Mutations](linera-integration-docs/GraphQL.md)

**Day 12: Integration Testing** ⚠️ **CRITICAL CHECKPOINT**
- Test full betting cycle: PlaceBet → Oracle publishes → Market resolves → Payout
- Validate <15 second total cycle time
- Test edge cases: empty pools, 100% on one outcome
- If integration fails, simplify message flows immediately

**Deliverable:** All three chains working together end-to-end

**Success Criteria:**
- [ ] User can place bet via operation
- [ ] Bet message sent and received by Market
- [ ] Market updates pools correctly
- [ ] Oracle publishes result (manual script)
- [ ] Market auto-resolves on event
- [ ] Payout distributed to User
- [ ] Complete cycle <15 seconds (stretch: <10s)
- [ ] All unit tests passing

---

### Phase 3: Frontend & Deployment (Days 13-18) - **SIMPLIFIED**

**Option A: CLI Demo (Recommended for 18-day timeline)**
```bash
# Bash scripts for demo
./scripts/place-bet.sh mlb_game_001 home_win 100
./scripts/resolve-market.sh mlb_game_001 home_win
./scripts/check-balance.sh user_chain_id
```
**Reference**: [Wallets.md - CLI Operations](linera-integration-docs/Wallets.md#3-cli-wallet-and-chain-management)

**Option B: Minimal Web UI (If time permits)**

**Days 13-15: Basic Frontend**
- React + TypeScript setup with Vite
- Core components: MarketList, BetForm, BalanceDisplay
- GraphQL client with Apollo Client
- NO wallet integration (use linera CLI directly)
- **Reference**: [Wallets.md - Client Development](linera-integration-docs/Wallets.md#5-client-side-development-javascripttypescript)

**Days 16-17: Testnet Deployment**
```bash
# Build contracts
cargo build --release --target wasm32-unknown-unknown

# Deploy User, Market, Oracle chains
./scripts/deploy.sh

# Deploy frontend (if applicable)
# Deploy oracle script to server
```
**References**:
- [Applications.md - Deployment](linera-integration-docs/Applications.md)
- [linera-service.md - Service Management](linera-integration-docs/linera-service.md)

**Day 18: End-to-End Testing**
- Run complete betting cycles
- Test with multiple users
- Performance testing
- Bug fixes

**Deliverable:** Functional demo on testnet OR polished CLI demo

---

### Phase 4: Demo Preparation (Days 19-21) - **EXTENDED**

**Demo Script (5 minutes):**

```
[0:00-0:30] Problem & Solution
"Traditional betting: Minutes to hours for settlement"
"FlashBet on Linera: 15 seconds bet-to-payout"

[0:30-1:30] Architecture
- Show microchain diagram
- Explain parallel execution
- Highlight off-chain oracle pattern

[1:30-4:00] Live Demo
T+0s: Place bet (show balance decrease)
T+2s: Show cross-chain message flow
T+5s: Trigger oracle resolution
T+10s: Show payout received
Display total cycle time prominently

[4:00-4:45] Why Linera
- Sub-second finality vs Ethereum (15s) / Solana (2-4s)
- Event streams for real-time updates
- Horizontal scalability

[4:45-5:00] Roadmap
- Wave 2: AI-powered odds
- Wave 3+: Social features, esports
```

**Pre-Submission Checklist:**
- [ ] Demo video uploaded (YouTube/Loom)
- [ ] All code compiles without warnings
- [ ] All tests passing
- [ ] README comprehensive with setup instructions
- [ ] Architecture diagrams included
- [ ] GitHub repository public
- [ ] Tag: v1.0.0-wave1-mvp
- [ ] Submit 24 hours early (Oct 28, not Oct 29)

---

## Development Guidelines

### Linera-Specific Patterns

**Operations vs Messages**:
- **Operations**: User-initiated interactions (e.g., `place_bet`)
- **Messages**: Cross-chain communication (e.g., `receive_payout`)
- **Reference**: [Applications.md - Operations & Messages](linera-integration-docs/Applications.md)

**Event Streams**: Use `emit_event()` extensively for real-time frontend updates via GraphQL subscriptions.
- **Reference**: [Cross-chain-messaging.md - Event Streams](linera-integration-docs/Cross-chain-messaging.md)

**Authentication**: Operations in user chains inherit the user's signature (`signer`/`origin`). Forward authentication when transferring assets.
- **Reference**: [Chain-ownership.md - Authentication](linera-integration-docs/Chain-ownership.md)

**Non-Deterministic Operations**: Use personal chains for operations that may be non-deterministic (e.g., querying external APIs, AI inference). Validators reject blocks with disagreement-causing non-determinism.
- **Reference**: [Design-Patterns.md - Oracle Pattern](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns)

**Off-Chain Services**: Structure oracle and AI components as Linera services for tight integration. They sign and submit transactions rather than being called by contracts.

### Testing Strategy

**Unit Tests (Each Contract):**
```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_place_bet_success() { /* ... */ }

    #[tokio::test]
    async fn test_place_bet_insufficient_funds() { /* ... */ }

    #[tokio::test]
    async fn test_resolve_market() { /* ... */ }
}
```

**Integration Tests (Cross-Chain):**
1. **Day 7 Integration Test**: Full bet cycle with mock resolution
   - Deploy all three chains
   - Place bet from User Chain
   - Verify Market Chain receives message
   - Trigger oracle manually
   - Verify Market resolves
   - Verify User receives payout

2. **Edge Cases**:
   - Empty betting pool (no bets placed)
   - 100% on one outcome (winner takes all)
   - Concurrent bets from multiple users
   - Market already resolved (reject duplicate)

3. **Performance**:
   - Target: <15 second total cycle time
   - Stretch goal: <10 seconds
   - Measure: Place bet → Oracle publish → Payout received

**Testing Tools:**
```bash
# Local testnet for testing
linera net up --validators 4 --shards 1 --testing

# Integration test script
./tests/integration/full_betting_cycle.sh
```
**Reference**: [linera-service.md - Network Setup](linera-integration-docs/linera-service.md#2-network-setup)

### Security Considerations

**Oracle Authorization:**
- Use `runtime.authenticated_signer()` for signature validation
- Maintain whitelist of authorized oracles in `SetView<AccountOwner>`
- Reject unauthorized submissions immediately
- **Reference**: [Chain-ownership.md - Programmatic Access](linera-integration-docs/Chain-ownership.md#4-programmatic-ownership-access-rust-sdk)

**Replay Attack Prevention:**
```rust
// Timestamp validation
let current_time = self.runtime.system_time();
let result_age = current_time.micros() - result.timestamp;
assert!(result_age < 3_600_000_000, "Result too old"); // 1 hour max

// Idempotency check
let existing = self.state.event_results.get(&result.event_id).await?;
assert!(existing.is_none(), "Result already published");
```

**Input Validation:**
```rust
// Validate event_id format
assert!(result.event_id.starts_with("mlb_") || result.event_id.starts_with("nba_"));

// Validate outcome values
let valid_outcomes = ["home_win", "away_win", "tie"];
assert!(valid_outcomes.contains(&result.outcome.as_str()));

// Validate amounts
assert!(bet.amount > Amount::ZERO, "Bet amount must be positive");
```

**Message Tracking:**
```rust
// Use tracked messages to prevent asset loss
self.runtime
    .prepare_message(message)
    .with_tracking()        // Message bounces back if rejected
    .with_authentication()  // Forward caller identity
    .send_to(target_chain);

// Handle bounces in receiving chain
if self.runtime.message_is_bouncing().unwrap_or(false) {
    // Refund user, don't process message
    return;
}
```
**Reference**: [Cross-chain-messaging.md - Message Tracking](linera-integration-docs/Cross-chain-messaging.md)

### Deployment Commands

```bash
# Scaffold new application
linera project new flashbet-<component>

# Deploy to testnet
linera publish-and-create <bytecode> <service>

# Query state via GraphQL
# Use generated GraphQL schema from contract
```
**References**:
- [Applications.md - Deployment](linera-integration-docs/Applications.md)
- [Wallets.md - Common Commands](linera-integration-docs/Wallets.md)

---

## Why Linera is Critical for FlashBet

**Unique Capabilities** (impossible on Ethereum/Solana):

1. **Sub-second finality** - Per-play betting resolves instantly
2. **Horizontal scalability** - Unlimited parallel markets without gas competition
3. **Real-time notifications** - Trustless client synchronization without centralized RPC
4. **Predictable gas costs** - No gas wars during high-traffic events
5. **Geographic sharding** (future) - Regional markets with minimal latency

**Demo Narrative**: "Watch a bet placed, market resolved, and winner paid out in 5 seconds - completely on-chain. This is only possible on Linera."

---

## Judging Criteria Alignment

| Criteria | Weight | Strategy |
|----------|--------|----------|
| Working Demo & Functionality | 30% | Flawless core betting loop execution |
| Integration with Linera Stack | 30% | Showcase microchains, cross-chain messages, event streams |
| Creativity & UX | 20% | Real-time updates, instant settlement, per-play markets |
| Scalability & Use Case | 10% | Emphasize horizontal scaling, parallel markets |
| Vision & Roadmap | 10% | Clear Wave 2+ plan (AI, social features, esports) |

---

## Resources

### Linera Integration Documentation (Local)
- **📚 [LINERA_MAIN_DOCS.md](LINERA_MAIN_DOCS.md)** - Main documentation index (START HERE)
- **👛 [Wallets.md](linera-integration-docs/Wallets.md)** - Wallet & chain management (902 lines)
- **🏗️ [Applications.md](linera-integration-docs/Applications.md)** - Application development (705 lines)
- **🔍 [GraphQL.md](linera-integration-docs/GraphQL.md)** - GraphQL API reference (522 lines)
- **🔗 [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)** - Cross-chain communication (731 lines)
- **⚙️ [linera-service.md](linera-integration-docs/linera-service.md)** - Service management (176 lines)
- **⛓️ [chain-management.md](linera-integration-docs/chain-management.md)** - Chain operations (622 lines)
- **🔐 [Chain-ownership.md](linera-integration-docs/Chain-ownership.md)** - Ownership & permissions (243 lines)
- **🎨 [Design-Patterns.md](linera-integration-docs/Design-Patterns.md)** - Best practices (309 lines)

### Project-Specific Documentation
- **[ORACLE_INTEGRATION_SOLUTION.md](ORACLE_INTEGRATION_SOLUTION.md)** - Complete oracle implementation
- **[exec_summary.md](exec_summary.md)** - Consensus-validated implementation plan
- **[why-build-on-linera.md](why-build-on-linera.md)** - Microchain architecture details
- **[hackathon.md](hackathon.md)** - Buildathon rules, timeline, rewards

### Official Linera Resources
- **Linera Protocol GitHub**: https://github.com/linera-io/linera-protocol
- **Developer Documentation**: https://linera-dev.respeer.ai/
- **SDK Reference**: https://docs.rs/linera-sdk/
- **Linera SDK**: Minimum version `linera-sdk@0.15.3`

---

## Post-Wave 1 Roadmap

**Wave 2** (Nov 3-12): AI Agent Chain, dynamic odds, basketball support
**Wave 3-4** (Nov-Dec): Social features, leaderboards, parlay betting
**Wave 5-6** (Jan): Esports, security audit, production oracle

---

## Key Technical Insights

- Linera is **elastic infrastructure**: validators add/remove compute on demand
- **Sparse clients**: Users only track relevant chains, not entire network
- **Microchains share security**: All chains validated by same validator set
- **Message tracking**: Use `tracked` messages to prevent asset loss on rejection (message bounces back)
- **GraphQL by default**: All applications expose GraphQL APIs automatically

**Deep Dive**: [Design-Patterns.md](linera-integration-docs/Design-Patterns.md) for implementation patterns

---

## Success Criteria

**Wave 1 MVP Success (Revised):**
- ✅ User can place bet and receive payout in <15 seconds (<10s stretch goal)
- ✅ Demo shows complete flow without errors
- ✅ Deployed to testnet and publicly accessible
- ✅ All three contracts working with cross-chain messages
- ✅ Oracle publishes results (manual script acceptable)
- ✅ Markets auto-resolve on oracle events
- ✅ GraphQL queries demonstrate state updates
- ✅ Judges understand "this is only possible on Linera"

**Technical Validation:**
- All unit tests pass
- Integration test (Day 7) shows full betting cycle
- Cross-chain messages work reliably with `tracked` and `with_authentication()`
- Event streams propagate in <2 seconds
- No race conditions or deadlocks in concurrent bets

**Presentation Success:**
- Demo video (5 min) clearly shows value proposition
- Architecture diagram highlights microchains pattern
- Comparison slide: Linera vs Ethereum/Solana
- Roadmap shows clear Wave 2+ enhancements

**Scoring Target:**
| Criteria | Target Score | Strategy |
|----------|--------------|----------|
| Working Demo | 28-30/30 | Flawless core betting loop, zero errors |
| Linera Integration | 27-30/30 | Showcase all: microchains, messages, events, sub-second finality |
| Creativity & UX | 15-17/20 | Real-time updates, instant settlement (even with CLI) |
| Scalability | 9-10/10 | Emphasize 1 market = 1 chain, unlimited parallelism |
| Vision | 9-10/10 | Clear roadmap, market opportunity |
| **Total** | **88-97/100** | Realistic with simplified scope |

**Critical Path**: Setup → Foundation → Core Logic → **Integration Test (Day 7)** → Minimal UI → Demo

**Fallback Positions:**
- **Day 10**: If integration fails, simplify to 2 chains (User + Market, manual oracle)
- **Day 14**: If frontend delayed, submit CLI-only demo
- **Day 18**: If bugs remain, submit with known issues documented + fix plan

**Key Success Factor:**
> "A simple, fast, reliable betting experience will win judges over more than a complex but buggy multi-feature demo."
> - Consensus recommendation from expert review

---

## 🚀 Implementation Quick Start

When beginning implementation, follow this sequence:

1. **Environment Setup** → [Wallets.md - Environment Setup](linera-integration-docs/Wallets.md#2-environment-setup)
2. **Technical Validation** → [Applications.md - Getting Started](linera-integration-docs/Applications.md)
3. **State Definition** → [Design-Patterns.md - State Management](linera-integration-docs/Design-Patterns.md#1-state-management-with-views)
4. **Contract Implementation** → [Applications.md - Contract Development](linera-integration-docs/Applications.md)
5. **Cross-Chain Setup** → [Cross-chain-messaging.md](linera-integration-docs/Cross-chain-messaging.md)
6. **Oracle Integration** → [Design-Patterns.md - Oracle Pattern](linera-integration-docs/Design-Patterns.md#2-http-requests-and-oracle-patterns)
7. **GraphQL Testing** → [GraphQL.md - API Reference](linera-integration-docs/GraphQL.md)
8. **Service Deployment** → [linera-service.md](linera-integration-docs/linera-service.md)

**Complete Guide**: [LINERA_MAIN_DOCS.md - Quick Start Guide](LINERA_MAIN_DOCS.md#-quick-start-guide)
