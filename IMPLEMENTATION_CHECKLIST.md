# FlashBet AI - Implementation Checklist

## Tech Stack

- **Blockchain Platform**: Linera Protocol (microchain architecture)
- **Smart Contracts**: Rust with `linera-sdk@0.15.3+`
- **Compilation Target**: `wasm32-unknown-unknown`
- **State Management**: Linera Views (`RegisterView`, `MapView`, `SetView`)
- **Cross-Chain Communication**: Linera message passing with tracking and authentication
- **Event Streaming**: Linera event streams with `emit()` and `process_streams()`
- **API Layer**: Auto-generated GraphQL APIs
- **Off-Chain Services**: Python (Wave 1 oracle script)
- **Frontend (Optional)**: React + TypeScript + Vite + Apollo Client OR Bash CLI scripts
- **Testing**: Linera local testnet with 4 validators, 1 shard

---

## Phase 0: Environment Setup & Validation

### Environment Setup

- [ ] Install Rust toolchain with `rustup`
- [ ] Add wasm32 compilation target: `rustup target add wasm32-unknown-unknown`
- [ ] Install Linera CLI from official repository
- [ ] Verify installation: `linera --version`
- [ ] Initialize local testnet: `linera net up --validators 4 --shards 1`
- [ ] Create Git repository for project
- [ ] Set up project directory structure

### Technical Validation

- [ ] Complete Linera quickstart tutorial from official docs
- [ ] Study fungible token example application
- [ ] Study AMM (automated market maker) example application
- [ ] Study social application example
- [ ] Create test application with two chains
- [ ] Send cross-chain message between test chains
- [ ] Verify message receipt and processing
- [ ] Generate GraphQL schema from test contract
- [ ] Test GraphQL queries against test application
- [ ] Test GraphQL subscriptions for real-time updates
- [ ] Implement test event emission with `runtime.emit()`
- [ ] Implement test event consumption with `process_streams()`
- [ ] Verify event propagation across chains
- [ ] Test deployment to local testnet
- [ ] Confirm GraphQL service exposes contract state

**Checkpoint**: Working multi-chain "Hello World" with cross-chain messaging and event streams

---

## Phase 1: Foundation & Architecture

### Shared Type Definitions

- [ ] Create shared types crate/module
- [ ] Define `MarketId(u64)` wrapper type
- [ ] Define `Outcome` enum: `{ TeamA, TeamB, Draw }`
- [ ] Define `MarketStatus` enum: `{ Open, Locked, Resolved(Outcome), Cancelled }`
- [ ] Define `Bet` struct with fields: `user, outcome, amount, timestamp`
- [ ] Define `MarketInfo` struct: `event_id, description, event_time, market_type`
- [ ] Define `EventResult` struct: `event_id, outcome, score, timestamp`
- [ ] Define cross-chain message types: `PlaceBet`, `Payout`, `EventResolution`
- [ ] Implement serialization/deserialization for all types
- [ ] Add proper documentation comments to all types

### User Chain State

- [ ] Define `UserState` struct with `#[derive(RootView)]`
- [ ] Add `balance: RegisterView<Amount>` field
- [ ] Add `active_bets: MapView<MarketId, Bet>` field
- [ ] Add `bet_history: MapView<u64, Bet>` field
- [ ] Add `bet_counter: RegisterView<u64>` for unique bet IDs
- [ ] Define `UserOperation` enum: `PlaceBet`, `Deposit`, `Withdraw`
- [ ] Define `UserMessage` enum for receiving payouts
- [ ] Create contract skeleton with operation/message handlers

### Market Chain State

- [ ] Define `MarketState` struct with `#[derive(RootView)]`
- [ ] Add `info: RegisterView<MarketInfo>` field
- [ ] Add `status: RegisterView<MarketStatus>` field
- [ ] Add `pools: MapView<Outcome, Amount>` field (pool per outcome)
- [ ] Add `bets: MapView<u64, Bet>` field (all bets placed)
- [ ] Add `total_pool: RegisterView<Amount>` field
- [ ] Add `bet_counter: RegisterView<u64>` field
- [ ] Define `MarketOperation` enum: `CreateMarket`, `LockMarket`
- [ ] Define `MarketMessage` enum: `PlaceBet`, request messages from User chains
- [ ] Create contract skeleton with operation/message/stream handlers

### Oracle Chain State

- [ ] Define `OracleState` struct with `#[derive(RootView)]`
- [ ] Add `event_results: MapView<EventId, EventResult>` field
- [ ] Add `authorized_oracles: SetView<AccountOwner>` field
- [ ] Add `pending_events: MapView<EventId, EventInfo>` field (optional)
- [ ] Define `OracleOperation` enum: `PublishResult`, `AddAuthorizedOracle`
- [ ] Define `OracleEvent` for event stream: `ResultPublished { result }`
- [ ] Create contract skeleton with operation handler and event emission

### Project Scaffolding

- [ ] Run `linera project new flashbet-user`
- [ ] Run `linera project new flashbet-market`
- [ ] Run `linera project new flashbet-oracle`
- [ ] Set up Cargo workspace with all three applications
- [ ] Configure dependencies: `linera-sdk`, `thiserror`, `serde`, `async-trait`
- [ ] Create shared types module accessible to all contracts
- [ ] Document message flow: User → Market (PlaceBet)
- [ ] Document message flow: Market → User (Payout)
- [ ] Document event flow: Oracle → Market (stream subscription)
- [ ] Verify all contracts compile without errors

**Checkpoint**: Complete type system defined, all projects scaffold, compiles cleanly

---

## Phase 2: Core Contract Logic

### Sprint 1: Market Chain Implementation

#### CreateMarket Operation

- [ ] Implement `execute_operation()` match arm for `CreateMarket`
- [ ] Validate market info (event_id format, timestamps)
- [ ] Initialize market state with `info`, `status = Open`
- [ ] Initialize empty pools for each outcome: `MapView<Outcome, Amount>`
- [ ] Set `total_pool = 0`
- [ ] Subscribe to Oracle Chain events:
  ```rust
  self.runtime.subscribe_to_events(
      oracle_chain_id,
      oracle_app_id.forget_abi(),
      StreamName::from(b"event_results".to_vec())
  )
  ```
- [ ] Emit `MarketCreated` event for GraphQL subscribers
- [ ] Add error handling for duplicate market creation

#### PlaceBet Message Handler

- [ ] Implement `execute_message()` match arm for `PlaceBet`
- [ ] Validate market status is `Open` (reject if `Locked` or `Resolved`)
- [ ] Validate bet amount > 0
- [ ] Validate outcome is valid for this market type
- [ ] Extract authenticated signer from message context
- [ ] Update pool for selected outcome: `pools[outcome] += bet.amount`
- [ ] Update `total_pool += bet.amount`
- [ ] Store bet record: `bets.insert(bet_id, bet)`
- [ ] Emit `BetPlaced` event with market_id, outcome, amount
- [ ] Handle message bounces (refund logic if applicable)

#### Market Resolution via Event Streams

- [ ] Implement `process_streams()` to handle Oracle events
- [ ] Iterate through `StreamUpdate` new indices
- [ ] Read event data: `self.runtime.read_event(stream_id, index)`
- [ ] Deserialize `EventResult` from stream
- [ ] Match `event_id` to this market's event
- [ ] Validate market not already resolved (idempotency)
- [ ] Update market status to `Resolved(outcome)`
- [ ] Calculate payout distribution:
  ```rust
  let winning_pool = pools[winning_outcome];
  let payout_ratio = total_pool / winning_pool;
  ```
- [ ] Iterate through bets, send `Payout` messages to winners:
  ```rust
  self.runtime
      .prepare_message(UserMessage::Payout { amount })
      .with_tracking()
      .send_to(user_chain_id);
  ```
- [ ] Handle edge case: no bets on winning outcome (refund all bets)
- [ ] Handle edge case: 100% on winning outcome (proportional distribution)
- [ ] Emit `MarketResolved` event

#### Market Chain Unit Tests

- [ ] Test: Create market successfully
- [ ] Test: Place bet increases pool correctly
- [ ] Test: Reject bet when market locked
- [ ] Test: Reject bet when market already resolved
- [ ] Test: Reject bet with zero amount
- [ ] Test: Multiple bets update pools correctly
- [ ] Test: Market resolution calculates payouts correctly
- [ ] Test: Edge case - empty betting pool (no bets)
- [ ] Test: Edge case - 100% on winning outcome
- [ ] Test: Edge case - 100% on losing outcome (refund scenario)
- [ ] Test: Duplicate resolution attempt rejected

### Sprint 2: User Chain Implementation

#### Balance Tracking

- [ ] Initialize `balance: RegisterView<Amount>` in state
- [ ] Implement `Deposit` operation (for testing/funding)
- [ ] Implement balance check before placing bet
- [ ] Implement balance deduction on bet placement
- [ ] Implement balance increase on payout receipt

#### PlaceBet Operation

- [ ] Implement `execute_operation()` match arm for `PlaceBet`
- [ ] Extract authenticated signer:
  ```rust
  let signer = self.runtime.authenticated_signer()
      .expect("PlaceBet must be signed");
  ```
- [ ] Validate bet parameters (amount > 0, valid outcome)
- [ ] Check sufficient balance:
  ```rust
  let balance = self.state.balance.get();
  assert!(*balance >= bet.amount, "Insufficient funds");
  ```
- [ ] Deduct balance atomically:
  ```rust
  let balance_mut = self.state.balance.get_mut();
  *balance_mut = balance_mut.checked_sub(bet.amount)
      .expect("Insufficient funds");
  ```
- [ ] Store bet in `active_bets`: `active_bets.insert(market_id, bet.clone())`
- [ ] Send cross-chain message to Market Chain:
  ```rust
  self.runtime
      .prepare_message(MarketMessage::PlaceBet { bet })
      .with_tracking()        // Message bounces if rejected
      .with_authentication()  // Forward user identity
      .send_to(market_chain_id);
  ```
- [ ] Emit `BetPlaced` event for user's GraphQL subscribers
- [ ] Handle errors and refund if message preparation fails

#### Payout Message Handler

- [ ] Implement `execute_message()` match arm for `Payout`
- [ ] Extract market_id and amount from message
- [ ] Validate payout amount > 0
- [ ] Increase user balance:
  ```rust
  let balance_mut = self.state.balance.get_mut();
  *balance_mut = balance_mut.checked_add(payout_amount)
      .expect("Balance overflow");
  ```
- [ ] Move bet from `active_bets` to `bet_history`
- [ ] Update bet record with payout amount and resolved timestamp
- [ ] Emit `PayoutReceived` event with market_id, amount
- [ ] Handle edge case: duplicate payout prevention

#### User Chain Unit Tests

- [ ] Test: Deposit increases balance
- [ ] Test: PlaceBet deducts balance correctly
- [ ] Test: PlaceBet rejects with insufficient funds
- [ ] Test: PlaceBet stores bet in active_bets
- [ ] Test: Payout increases balance correctly
- [ ] Test: Payout moves bet to history
- [ ] Test: Multiple bets tracked correctly
- [ ] Test: Balance never goes negative
- [ ] Test: Concurrent bet operations (if applicable)

### Sprint 3: Oracle Chain Implementation

#### PublishResult Operation

- [ ] Implement `execute_operation()` match arm for `PublishResult`
- [ ] Extract authenticated signer:
  ```rust
  let signer = self.runtime.authenticated_signer()
      .expect("PublishResult must be signed");
  ```
- [ ] Validate signer is authorized oracle:
  ```rust
  let is_authorized = self.state.authorized_oracles
      .contains(&signer).await?;
  assert!(is_authorized, "Unauthorized oracle");
  ```
- [ ] Validate event_id format (e.g., `mlb_*`, `nba_*`)
- [ ] Validate outcome is valid enum value
- [ ] Validate timestamp is recent (prevent stale results):
  ```rust
  let current_time = self.runtime.system_time();
  let age = current_time.micros() - result.timestamp;
  assert!(age < 3_600_000_000, "Result too old"); // 1 hour
  ```
- [ ] Check for duplicate submission (idempotency):
  ```rust
  let existing = self.state.event_results
      .get(&result.event_id).await?;
  assert!(existing.is_none(), "Result already published");
  ```
- [ ] Store result in state:
  ```rust
  self.state.event_results.insert(&result.event_id, result.clone())?;
  ```
- [ ] Emit event to all subscribers:
  ```rust
  self.runtime.emit(
      StreamName::from(b"event_results".to_vec()),
      &OracleEvent::ResultPublished { result }
  );
  ```
- [ ] Return success response

#### Authorization Management

- [ ] Implement `AddAuthorizedOracle` operation
- [ ] Restrict to contract owner/admin only
- [ ] Add oracle to `authorized_oracles` set
- [ ] Emit `OracleAuthorized` event
- [ ] Implement `RemoveAuthorizedOracle` operation (optional)

#### Oracle Chain Unit Tests

- [ ] Test: Authorized oracle publishes result successfully
- [ ] Test: Unauthorized signer rejected
- [ ] Test: Duplicate result submission rejected
- [ ] Test: Stale timestamp rejected
- [ ] Test: Invalid event_id format rejected
- [ ] Test: Event emitted correctly after publication
- [ ] Test: Add authorized oracle successfully
- [ ] Test: Multiple results stored correctly

### Off-Chain Oracle Service

#### Python Oracle Script (Manual Trigger)

- [ ] Create `oracle-worker/` directory
- [ ] Create `flashbet_oracle_manual.py` script
- [ ] Implement `LineraOracleClient` class
- [ ] Add GraphQL endpoint configuration (from local testnet)
- [ ] Implement `publish_result(event_id, outcome, score)` method:
  ```python
  def publish_result(self, event_id, outcome, score=None):
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
      # Submit via requests to GraphQL endpoint
  ```
- [ ] Add signature generation (if required by Oracle contract)
- [ ] Add error handling and retry logic
- [ ] Add logging for debugging
- [ ] Test with mock data: `python flashbet_oracle_manual.py mlb_game_001 home_win`
- [ ] Verify result appears in Oracle Chain state via GraphQL query
- [ ] Verify event propagates to subscribed Market Chains

#### Integration Testing Script

- [ ] Create `tests/integration/` directory
- [ ] Create `full_betting_cycle.sh` bash script
- [ ] Deploy all three chains to local testnet
- [ ] Create test market on Market Chain
- [ ] Fund test User Chain with initial balance
- [ ] Place bet from User Chain via GraphQL mutation
- [ ] Verify bet message received by Market Chain
- [ ] Verify Market Chain pool updated correctly
- [ ] Trigger oracle script to publish result
- [ ] Verify Oracle Chain stores result
- [ ] Verify Market Chain receives stream event
- [ ] Verify Market Chain resolves and sends payout
- [ ] Verify User Chain receives payout
- [ ] Measure total cycle time (target: <15 seconds)
- [ ] Output detailed timing for each step
- [ ] Test edge case: Empty betting pool
- [ ] Test edge case: 100% on winning outcome
- [ ] Test edge case: Concurrent bets from multiple users
- [ ] Document any failures or performance bottlenecks

**🚨 CRITICAL CHECKPOINT**: Full betting cycle must work end-to-end with <15 second total time

---

## Phase 3: Frontend & Deployment

### Frontend Decision Point

- [ ] Evaluate remaining time and complexity
- [ ] Choose approach: CLI demo (fast) OR minimal web UI (better UX)

### Option A: CLI Demo Scripts (Recommended)

- [ ] Create `scripts/` directory
- [ ] Create `place-bet.sh`:
  ```bash
  #!/bin/bash
  # Usage: ./place-bet.sh <market_id> <outcome> <amount>
  linera query-application $USER_CHAIN_ID $USER_APP_ID \
      --operation 'PlaceBet { market_chain: "$MARKET_CHAIN", ... }'
  ```
- [ ] Create `resolve-market.sh`:
  ```bash
  #!/bin/bash
  # Usage: ./resolve-market.sh <event_id> <outcome>
  python oracle-worker/flashbet_oracle_manual.py $1 $2
  ```
- [ ] Create `check-balance.sh`:
  ```bash
  #!/bin/bash
  # Usage: ./check-balance.sh <user_chain_id>
  linera query-application $1 $USER_APP_ID \
      --query '{ balance }'
  ```
- [ ] Create `list-markets.sh` for querying available markets
- [ ] Create `view-market.sh` for showing market details and pools
- [ ] Create `demo.sh` master script running complete flow
- [ ] Add color output for better readability
- [ ] Add timing measurements to display cycle time
- [ ] Test all scripts with local testnet

### Option B: Minimal Web UI

#### Frontend Setup

- [ ] Create `frontend/` directory
- [ ] Initialize project: `npm create vite@latest flashbet-ui -- --template react-ts`
- [ ] Install dependencies: `npm install @apollo/client graphql`
- [ ] Configure Apollo Client with Linera GraphQL endpoint
- [ ] Set up GraphQL code generation (optional)

#### Core Components

- [ ] Create `MarketList.tsx` component:
  - Query markets from Market Chain GraphQL
  - Display market info, status, current pools
  - Show odds calculation for each outcome
- [ ] Create `BetForm.tsx` component:
  - Input fields: outcome selection, bet amount
  - Submit button triggers PlaceBet mutation
  - Display transaction status and confirmation
- [ ] Create `BalanceDisplay.tsx` component:
  - Query user balance from User Chain
  - Display active bets
  - Display bet history with outcomes
- [ ] Create `MarketDetail.tsx` component:
  - Show detailed market information
  - Display all bets placed (if public)
  - Show resolution status and winning outcome
- [ ] Create `App.tsx` main layout with routing (React Router)

#### Real-Time Updates

- [ ] Implement GraphQL subscription for `BetPlaced` events
- [ ] Implement GraphQL subscription for `MarketResolved` events
- [ ] Implement GraphQL subscription for `PayoutReceived` events
- [ ] Update UI components automatically on events
- [ ] Add loading states and error handling
- [ ] Add optimistic UI updates for better UX

#### Styling (Minimal)

- [ ] Add basic CSS for layout and readability
- [ ] Ensure mobile-responsive design (if time permits)
- [ ] Add visual indicators for market status (Open/Locked/Resolved)
- [ ] Add visual feedback for bet placement and payouts

### Contract Build & Deployment

- [ ] Build User Chain contract:
  ```bash
  cd flashbet-user
  cargo build --release --target wasm32-unknown-unknown
  ```
- [ ] Build Market Chain contract:
  ```bash
  cd flashbet-market
  cargo build --release --target wasm32-unknown-unknown
  ```
- [ ] Build Oracle Chain contract:
  ```bash
  cd flashbet-oracle
  cargo build --release --target wasm32-unknown-unknown
  ```
- [ ] Verify all contracts compile without warnings
- [ ] Create deployment script `scripts/deploy.sh`
- [ ] Deploy Oracle Chain to testnet:
  ```bash
  linera publish-and-create \
      target/wasm32-unknown-unknown/release/flashbet_oracle_{contract,service}.wasm
  ```
- [ ] Record Oracle Chain ID and Application ID
- [ ] Deploy Market Chain to testnet
- [ ] Record Market Chain ID and Application ID
- [ ] Deploy User Chain for each test user
- [ ] Record User Chain IDs
- [ ] Authorize oracle signer in Oracle Chain
- [ ] Create initial test markets
- [ ] Fund user chains with test tokens
- [ ] Verify GraphQL services are accessible
- [ ] Test GraphQL queries against deployed contracts

### End-to-End Testing

- [ ] Run integration test script against testnet deployment
- [ ] Test with single user betting scenario
- [ ] Test with multiple users on different outcomes
- [ ] Test with multiple concurrent markets
- [ ] Verify all GraphQL subscriptions receive events
- [ ] Measure end-to-end performance (place bet to payout)
- [ ] Test error scenarios: insufficient funds, invalid outcome
- [ ] Test edge cases: market already resolved, duplicate bets
- [ ] Load test: 10+ concurrent bets on same market
- [ ] Verify all payouts distributed correctly
- [ ] Check for any gas/resource issues
- [ ] Document any bugs or limitations discovered

### Bug Fixes & Polish

- [ ] Fix any critical bugs blocking core betting flow
- [ ] Fix any medium-priority bugs (if time permits)
- [ ] Add better error messages for common failures
- [ ] Add input validation to prevent invalid operations
- [ ] Optimize gas costs if possible
- [ ] Add transaction confirmation feedback
- [ ] Test fixes with full integration cycle

**Checkpoint**: Functional demo deployed to testnet with reliable betting cycle

---

## Phase 4: Documentation & Demo Preparation

### Documentation

- [ ] Write comprehensive README.md:
  - Project overview and value proposition
  - "Why Linera?" section with key benefits
  - Architecture overview with microchains explanation
  - Setup instructions (prerequisites, installation)
  - Local development guide
  - Testnet deployment instructions
  - Usage examples (CLI or web UI)
  - Troubleshooting section
- [ ] Create `ARCHITECTURE.md` with detailed technical design:
  - Microchain architecture diagram
  - Cross-chain message flow diagram
  - State structure for each chain type
  - Oracle integration architecture
  - Event stream propagation
- [ ] Create `API.md` documenting GraphQL schema:
  - Query examples for each chain
  - Mutation examples for operations
  - Subscription examples for real-time updates
- [ ] Add inline code documentation (Rust doc comments)
- [ ] Create `TESTING.md` with test execution instructions
- [ ] Create `DEPLOYMENT.md` with deployment guide

### Visual Assets

- [ ] Create microchains architecture diagram:
  - Show User, Market, and Oracle chains
  - Show message arrows between chains
  - Label message types (PlaceBet, Payout, Events)
  - Highlight parallel execution of multiple markets
- [ ] Create message flow sequence diagram:
  - Timeline showing complete betting cycle
  - Mark timing for each step
  - Highlight sub-second finality
- [ ] Create comparison chart: Linera vs Ethereum vs Solana:
  - Settlement time (15s vs 2-4s vs <1s)
  - Gas costs (variable vs high vs predictable)
  - Scalability (sharding vs TPS limits vs horizontal)
  - Real-time updates (RPC polling vs websockets vs event streams)
- [ ] Create UI mockup/screenshots (if web UI built)
- [ ] Export all diagrams as PNG/SVG for README

### Demo Script Preparation

- [ ] Write 5-minute demo script following structure:
  - [0:00-0:30] Problem statement & solution overview
  - [0:30-1:30] Architecture explanation with diagram
  - [1:30-4:00] Live demo of complete betting cycle
  - [4:00-4:45] "Why Linera" key differentiators
  - [4:45-5:00] Roadmap for future waves
- [ ] Prepare demo data (pre-created markets, funded accounts)
- [ ] Practice demo execution to ensure timing
- [ ] Prepare fallback plan if live demo fails (pre-recorded backup)
- [ ] Write speaker notes for each section
- [ ] Create slide deck (optional, 5-7 slides max):
  - Title slide with project name
  - Problem/solution slide
  - Architecture diagram slide
  - Live demo placeholder slide
  - Comparison chart slide
  - Roadmap slide
  - Thank you / contact slide

### Demo Video Recording

- [ ] Set up screen recording software (OBS Studio, Loom, etc.)
- [ ] Prepare demo environment (testnet deployment, funded accounts)
- [ ] Clear terminal history and browser cache
- [ ] Record demo following script
- [ ] Show complete betting cycle with timing overlay:
  - T+0s: Place bet, show balance decrease
  - T+2s: Show cross-chain message propagated
  - T+5s: Trigger oracle resolution
  - T+10s: Show payout received, balance increased
  - Display total cycle time prominently
- [ ] Add text overlays explaining each step
- [ ] Add timing annotations throughout
- [ ] Record intro/outro segments
- [ ] Edit video for clarity (cut dead time, add transitions)
- [ ] Add background music (optional, low volume)
- [ ] Export in high quality (1080p minimum)
- [ ] Upload to YouTube (unlisted or public)
- [ ] Upload to Loom as backup
- [ ] Add video description with GitHub link
- [ ] Test video playback on different devices

### Final Quality Checks

- [ ] Run full test suite one final time
- [ ] Verify all contracts compile without warnings:
  ```bash
  cargo clippy --all-targets --all-features -- -D warnings
  ```
- [ ] Run Rust formatter on all code:
  ```bash
  cargo fmt --all
  ```
- [ ] Verify all integration tests pass
- [ ] Check code for TODO comments and resolve
- [ ] Review all documentation for typos and clarity
- [ ] Test README instructions on fresh environment
- [ ] Verify all links in documentation work
- [ ] Test video plays correctly and audio is clear
- [ ] Check file sizes (contracts should be reasonable size)
- [ ] Scan for any sensitive data (keys, passwords)

### Repository Preparation

- [ ] Review all committed code for quality
- [ ] Remove any debug code or commented-out sections
- [ ] Ensure `.gitignore` excludes build artifacts and secrets
- [ ] Verify LICENSE file is present (MIT or Apache 2.0)
- [ ] Add CONTRIBUTING.md (optional)
- [ ] Create GitHub repository (if not already created)
- [ ] Push all code to main branch
- [ ] Verify repository displays correctly on GitHub
- [ ] Add topics/tags: `linera`, `blockchain`, `defi`, `rust`, `sports-betting`
- [ ] Create detailed GitHub repository description
- [ ] Add GitHub repository link to video description

### Submission Preparation

- [ ] Create git tag for Wave 1 release:
  ```bash
  git tag -a v1.0.0-wave1-mvp -m "Wave 1 MVP submission"
  git push origin v1.0.0-wave1-mvp
  ```
- [ ] Create GitHub Release from tag
- [ ] Add release notes summarizing features
- [ ] Attach demo video link to release
- [ ] Make repository public (if private)
- [ ] Final README review on GitHub (ensure formatting correct)
- [ ] Test clone and setup from fresh environment
- [ ] Prepare submission form information:
  - Project name: FlashBet AI
  - Repository URL
  - Demo video URL
  - Team member names
  - Project description (short and long)
  - Technical highlights
  - Linera-specific features used
- [ ] Screenshot submission confirmation
- [ ] Submit 24 hours early (buffer for issues)
- [ ] Verify submission received
- [ ] Celebrate completion! 🎉

**Final Checkpoint**: Project submitted, all materials accessible, demo video compelling

---

## Security Checklist (Throughout Development)

- [ ] Validate all user inputs (amounts, outcomes, event_ids)
- [ ] Use `checked_add()` and `checked_sub()` for balance arithmetic
- [ ] Prevent replay attacks with idempotency checks
- [ ] Validate timestamps to prevent stale data
- [ ] Use `with_authentication()` for asset transfers
- [ ] Use `with_tracking()` to prevent lost assets on rejection
- [ ] Handle message bounces correctly (refund users)
- [ ] Authorize oracle signers before accepting results
- [ ] Prevent race conditions in concurrent operations
- [ ] Test edge cases: zero amounts, empty pools, 100% distributions
- [ ] Validate chain IDs before sending cross-chain messages
- [ ] Log security-relevant events for auditing
- [ ] Review all `unwrap()` and `expect()` calls (use proper error handling)

---

## Performance Optimization Checklist (If Needed)

- [ ] Profile contract execution time
- [ ] Optimize storage access patterns (batch reads/writes)
- [ ] Minimize cross-chain message size
- [ ] Use efficient data structures (avoid nested loops)
- [ ] Cache frequently accessed data
- [ ] Optimize GraphQL query complexity
- [ ] Test with high message throughput
- [ ] Monitor block time and finality
- [ ] Optimize frontend rendering (React.memo, useMemo)
- [ ] Lazy load components and data

---

## Troubleshooting Checklist (Common Issues)

- [ ] If contracts fail to compile: Check linera-sdk version compatibility
- [ ] If cross-chain messages not received: Verify chain IDs and application IDs
- [ ] If GraphQL queries fail: Check service is running, inspect schema
- [ ] If event streams not working: Verify subscription setup, check stream names
- [ ] If payouts not distributed: Check Market resolution logic, verify message sending
- [ ] If balance becomes negative: Add checked arithmetic, validate inputs
- [ ] If testnet deployment fails: Check validator status, verify bytecode paths
- [ ] If performance slow: Profile execution, check for blocking operations
- [ ] If demo fails: Prepare pre-recorded backup, test in staging environment

---

## Wave 2+ Future Enhancements (Out of Scope for Wave 1)

- [ ] AI Agent Chain with dynamic odds calculation
- [ ] Integration with live MLB/NBA APIs (automated oracle)
- [ ] Multiple bet types (spread, over/under, parlays)
- [ ] User statistics and leaderboards
- [ ] Social features (follow bettors, share predictions)
- [ ] Advanced UI with charts and analytics
- [ ] Mobile application (React Native)
- [ ] Wallet integration (browser extension)
- [ ] Esports markets (CS:GO, Dota 2, League of Legends)
- [ ] Security audit by external firm
- [ ] Mainnet deployment preparation
- [ ] Liquidity incentives and tokenomics
- [ ] Governance mechanism for protocol upgrades
