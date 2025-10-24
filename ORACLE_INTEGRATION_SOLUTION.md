# FlashBet AI: Off-Chain Oracle Integration Architecture

## Executive Summary

This document provides a complete architectural solution for integrating external data sources (sports APIs, AI models) with Linera smart contracts, addressing the critical constraint that **Linera contracts cannot make outbound HTTP calls**.

**Solution Overview:**
- Oracle Chain contract stores and broadcasts event results
- Off-chain worker services fetch external data and submit signed transactions
- Event streams enable real-time push notifications between chains
- Security via whitelisting, signature validation, and input validation

---

## The Core Constraint

**Problem:** Linera smart contracts are deterministic and CANNOT make HTTP requests or access external data directly.

**Why:** Validator consensus requires all nodes to produce identical state transitions. Non-deterministic operations (HTTP calls, timestamps, random numbers) would cause consensus failures.

**Linera's Two-Component Architecture:**

```
┌─────────────────────────────────────────────────┐
│           CONTRACTS (On-Chain)                  │
│  - Deterministic execution                      │
│  - State modifications                          │
│  - Cross-chain messages                         │
│  - NO HTTP requests                             │
│  - NO external data access                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│           SERVICES (Off-Chain)                  │
│  - Non-deterministic operations                 │
│  - GraphQL query interface                      │
│  - CAN make HTTP requests                       │
│  - CAN access external APIs                     │
│  - READ-ONLY (cannot modify state)              │
└─────────────────────────────────────────────────┘
```

**Key Insight:** Services can fetch data but cannot write to chain. We need an **off-chain worker** that fetches data and submits it as signed **operations** to the contract.

---

## Architecture Overview

```
External APIs              Off-Chain Worker           On-Chain Contracts
(MLB, NBA, etc.)          (Node.js/Python)           (Linera Blockchain)

┌──────────────┐         ┌──────────────────┐       ┌──────────────────┐
│  MLB API     │◄────────│  Event Poller    │       │  Oracle Chain    │
│  NBA API     │  HTTPS  │  - Poll every 30s│       │  - Store results │
│  ESPN API    │         │  - Detect games  │       │  - Validate auth │
└──────────────┘         │  - Validate data │       │  - Emit events   │
                         └────────┬─────────┘       └────────▲─────────┘
                                  │ Sign & Submit           │ Subscribe
                         ┌────────▼─────────┐               │
                         │ Linera Client    │               │
                         │ - Wallet/Signer  │               │
                         │ - GraphQL calls  │               │
                         └──────────────────┘               │
                                                             │
                         ┌────────────────────────────────┬─┘
                         │                                │
                         ▼                                ▼
                ┌─────────────────┐           ┌─────────────────┐
                │ Market Chain 1  │           │ Market Chain 2  │
                │ - Auto resolve  │           │ - Auto resolve  │
                │ - Calc payouts  │           │ - Calc payouts  │
                └─────────────────┘           └─────────────────┘
```

---

## Oracle Chain Contract Design

### State Structure

```rust
// flashbet-oracle/src/contract.rs

use linera_sdk::{Contract, ContractRuntime};
use linera_sdk::views::{RootView, SetView, MapView};

#[derive(RootView)]
pub struct OracleState {
    /// Authorized oracle operators (whitelist)
    pub authorized_oracles: SetView<AccountOwner>,

    /// Event results: event_id -> EventResult
    pub event_results: MapView<EventId, EventResult>,

    /// Event metadata: event_id -> EventMetadata
    pub events: MapView<EventId, EventMetadata>,

    /// Subscribers (for auditing)
    pub subscribers: SetView<ChainId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventResult {
    pub event_id: EventId,
    pub outcome: String,        // "home_win", "away_win", "tie"
    pub score: Option<String>,  // "5-3"
    pub timestamp: Timestamp,
    pub oracle: AccountOwner,   // Who published this
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub event_id: EventId,
    pub sport: String,
    pub home_team: String,
    pub away_team: String,
    pub scheduled_time: Timestamp,
}
```

### Operations (User-Initiated)

```rust
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// Register a new event (admin only)
    RegisterEvent { event: EventMetadata },

    /// Publish event result (authorized oracles only)
    PublishResult { result: EventResult },

    /// Add authorized oracle (admin only)
    AddOracle { oracle: AccountOwner },

    /// Remove authorized oracle (admin only)
    RemoveOracle { oracle: AccountOwner },
}

impl Contract for OracleContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::PublishResult { result } => {
                // 1. Authenticate caller
                let signer = self.runtime.authenticated_signer()
                    .expect("Operation must be signed");

                // 2. Verify authorized oracle
                let is_authorized = self.state.authorized_oracles
                    .contains(&signer).await
                    .expect("Failed to check authorization");
                assert!(is_authorized, "Unauthorized oracle");

                // 3. Validate input
                self.validate_result(&result);

                // 4. Check for duplicates
                let existing = self.state.event_results.get(&result.event_id).await
                    .expect("Failed to check existing");
                assert!(existing.is_none(), "Result already published");

                // 5. Store result
                self.state.event_results.insert(&result.event_id, result.clone())
                    .expect("Failed to store result");

                // 6. Emit event to subscribers
                self.runtime.emit(
                    StreamName::from(b"event_results".to_vec()),
                    &Event::ResultPublished { result: result.clone() }
                );

                Response::ResultPublished { event_id: result.event_id }
            }

            Operation::AddOracle { oracle } => {
                // Admin-only operation
                let signer = self.runtime.authenticated_signer()
                    .expect("Operation must be signed");
                assert_eq!(signer, self.state.admin, "Only admin can add oracles");

                self.state.authorized_oracles.insert(&oracle)
                    .expect("Failed to add oracle");

                Response::OracleAdded { oracle }
            }

            // ... other operations
        }
    }
}
```

### Event Broadcasting

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum Event {
    ResultPublished { result: EventResult },
}
```

---

## Wave 1 MVP: Manual Oracle Script

For the initial MVP, we use a simple Python script that uses Linera CLI to submit transactions manually.

### Python Implementation

```python
#!/usr/bin/env python3
# oracle-worker/flashbet_oracle_manual.py

import subprocess
import json
import sys
import time
import requests

class LineraOracleClient:
    def __init__(self, oracle_chain_id, oracle_app_id, wallet_path, keystore_path):
        self.oracle_chain_id = oracle_chain_id
        self.oracle_app_id = oracle_app_id
        self.wallet_path = wallet_path
        self.keystore_path = keystore_path

    def publish_result(self, event_id, outcome, score=None):
        """Publish event result to Oracle Chain"""

        print(f"Publishing result for {event_id}: {outcome}")

        # Start linera service
        env = {
            'LINERA_WALLET': self.wallet_path,
            'LINERA_KEYSTORE': self.keystore_path,
        }

        service_proc = subprocess.Popen(
            ['linera', 'service', '--port', '8080'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        time.sleep(2)  # Wait for service to start

        try:
            # Build GraphQL mutation
            mutation = """
                mutation PublishResult($eventId: String!, $outcome: String!, $score: String) {
                    publishResult(result: {
                        eventId: $eventId,
                        outcome: $outcome,
                        score: $score,
                        timestamp: %d
                    })
                }
            """ % int(time.time() * 1000)

            query_data = {
                "query": mutation,
                "variables": {
                    "eventId": event_id,
                    "outcome": outcome,
                    "score": score
                }
            }

            # Submit via HTTP
            url = f"http://localhost:8080/chains/{self.oracle_chain_id}/applications/{self.oracle_app_id}"
            response = requests.post(url, json=query_data)
            response.raise_for_status()

            print(f"[SUCCESS] Published result for {event_id}: {outcome}")
            return response.json()

        except Exception as e:
            print(f"[ERROR] Failed to publish result: {e}")
            raise
        finally:
            service_proc.terminate()
            service_proc.wait()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: flashbet_oracle_manual.py <event_id> <outcome> [score]")
        sys.exit(1)

    client = LineraOracleClient(
        oracle_chain_id="YOUR_ORACLE_CHAIN_ID",
        oracle_app_id="YOUR_ORACLE_APP_ID",
        wallet_path="/path/to/oracle_wallet.json",
        keystore_path="/path/to/oracle_keystore.json"
    )

    event_id = sys.argv[1]
    outcome = sys.argv[2]
    score = sys.argv[3] if len(sys.argv) > 3 else None

    client.publish_result(event_id, outcome, score)
```

### Usage

```bash
# Publish result for an MLB game
./flashbet_oracle_manual.py mlb_game_001 home_win "5-3"

# Publish result for an NBA game
./flashbet_oracle_manual.py nba_game_042 away_win "102-98"
```

---

## Wave 2+: Automated Oracle Worker

For production, we need an automated service that polls external APIs and submits results automatically.

### TypeScript Implementation

```typescript
// oracle-worker-automated/src/OracleWorker.ts

import { Client, Faucet } from '@linera/client';
import { PrivateKey } from '@linera/signer';
import axios from 'axios';

interface EventResult {
  eventId: string;
  outcome: string;
  score?: string;
  timestamp: number;
}

export class FlashbetOracleWorker {
  private client: Client;
  private oracleChainId: string;
  private oracleAppId: string;
  private mlbApiKey: string;
  private pollingInterval: number = 30000; // 30 seconds
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(
    client: Client,
    oracleChainId: string,
    oracleAppId: string,
    mlbApiKey: string
  ) {
    this.client = client;
    this.oracleChainId = oracleChainId;
    this.oracleAppId = oracleAppId;
    this.mlbApiKey = mlbApiKey;
    this.rateLimiter = new RateLimiter(100, 3600000); // 100 req/hour
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1min timeout
  }

  async start() {
    console.log('[ORACLE] FlashBet Oracle Worker started');
    this.pollForCompletedGames();
  }

  private async pollForCompletedGames() {
    setInterval(async () => {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.checkMLBGames();
        });
      } catch (error) {
        console.error('[ERROR] Polling failed:', error);
      }
    }, this.pollingInterval);
  }

  private async checkMLBGames() {
    // Rate limiting
    if (!await this.rateLimiter.checkLimit()) {
      console.warn('[WARN] Rate limit reached, skipping poll');
      return;
    }

    // Fetch completed games from MLB API
    const response = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${this.getTodayDate()}`,
      { headers: { 'Authorization': `Bearer ${this.mlbApiKey}` } }
    );

    const games = response.data.dates[0]?.games || [];

    for (const game of games) {
      if (game.status.statusCode === 'F') {  // Final
        const eventId = `mlb_${game.gamePk}`;

        // Check if already published
        const alreadyPublished = await this.checkIfPublished(eventId);
        if (alreadyPublished) continue;

        // Determine outcome
        const homeScore = game.teams.home.score;
        const awayScore = game.teams.away.score;
        const outcome = homeScore > awayScore ? 'home_win' : 'away_win';

        const result: EventResult = {
          eventId,
          outcome,
          score: `${homeScore}-${awayScore}`,
          timestamp: Date.now()
        };

        await this.publishResult(result);
      }
    }
  }

  private async publishResult(result: EventResult) {
    console.log(`[PUBLISH] ${result.eventId}: ${result.outcome}`);

    const mutation = `
      mutation PublishResult(
        $eventId: String!,
        $outcome: String!,
        $score: String,
        $timestamp: Int!
      ) {
        publishResult(result: {
          eventId: $eventId,
          outcome: $outcome,
          score: $score,
          timestamp: $timestamp
        })
      }
    `;

    const variables = {
      eventId: result.eventId,
      outcome: result.outcome,
      score: result.score,
      timestamp: result.timestamp
    };

    try {
      const application = await this.client
        .frontend()
        .application(this.oracleAppId);

      const response = await application.query(
        JSON.stringify({ query: mutation, variables })
      );

      console.log(`[SUCCESS] Result published:`, JSON.parse(response));
    } catch (error) {
      console.error(`[ERROR] Failed to publish:`, error);
      await this.retryPublish(result, 3);
    }
  }

  private async retryPublish(result: EventResult, attempts: number) {
    for (let i = 0; i < attempts; i++) {
      console.log(`[RETRY] ${i + 1}/${attempts} for ${result.eventId}`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        await this.publishResult(result);
        return;
      } catch (error) {
        if (i === attempts - 1) {
          console.error(`[FAILED] All retries exhausted for ${result.eventId}`);
          // TODO: Alert monitoring system
        }
      }
    }
  }

  private async checkIfPublished(eventId: string): Promise<boolean> {
    const query = `
      query CheckResult($eventId: String!) {
        eventResults {
          entry(key: $eventId) {
            value { outcome }
          }
        }
      }
    `;

    const application = await this.client
      .frontend()
      .application(this.oracleAppId);

    const response = await application.query(
      JSON.stringify({ query, variables: { eventId } })
    );

    const data = JSON.parse(response);
    return data.data.eventResults.entry !== null;
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

// Rate Limiter
class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }
}

// Circuit Breaker
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error('[CIRCUIT BREAKER] OPENED - too many failures');
    }
  }
}

// Main entry point
async function main() {
  const mnemonic = process.env.ORACLE_MNEMONIC!;
  const signer = PrivateKey.fromMnemonic(mnemonic);

  const faucet = new Faucet(process.env.LINERA_FAUCET_URL!);
  const wallet = await faucet.createWallet();
  const client = new Client(wallet, signer);

  const worker = new FlashbetOracleWorker(
    client,
    process.env.ORACLE_CHAIN_ID!,
    process.env.ORACLE_APP_ID!,
    process.env.MLB_API_KEY!
  );

  await worker.start();
}

main().catch(console.error);
```

### Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  oracle-worker:
    build: .
    environment:
      - LINERA_FAUCET_URL=${LINERA_FAUCET_URL}
      - ORACLE_CHAIN_ID=${ORACLE_CHAIN_ID}
      - ORACLE_APP_ID=${ORACLE_APP_ID}
      - ORACLE_MNEMONIC=${ORACLE_MNEMONIC}
      - MLB_API_KEY=${MLB_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Market Chain Integration

Market Chains subscribe to Oracle Chain events to receive results automatically.

### Subscription Pattern

```rust
// flashbet-market/src/contract.rs

impl Contract for MarketContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::CreateMarket { event_id, oracle_chain_id, oracle_app_id } => {
                // Create market
                let market = Market {
                    event_id: event_id.clone(),
                    status: MarketStatus::Open,
                    oracle_chain: oracle_chain_id,
                    // ... other fields
                };

                self.state.markets.insert(&event_id, market)
                    .expect("Failed to create market");

                // Subscribe to Oracle Chain events
                let oracle_app = ApplicationId {
                    bytecode_id: oracle_app_id.bytecode_id,
                    creation: oracle_app_id.creation,
                };

                self.runtime.subscribe_to_events(
                    oracle_chain_id,
                    oracle_app.forget_abi(),
                    StreamName::from(b"event_results".to_vec())
                );

                Response::MarketCreated { event_id }
            }
            // ... other operations
        }
    }

    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            for index in update.new_indices() {
                let event: OracleEvent = self.runtime.read_event(
                    update.chain_id,
                    StreamName::from(b"event_results".to_vec()),
                    index
                );

                match event {
                    OracleEvent::ResultPublished { result } => {
                        self.resolve_market(result).await;
                    }
                }
            }
        }
    }
}

async fn resolve_market(&mut self, result: EventResult) {
    let mut market = self.state.markets.get(&result.event_id).await
        .expect("Failed to read market")
        .expect("Market not found");

    // Prevent double resolution
    if market.status != MarketStatus::Open {
        return;
    }

    market.status = MarketStatus::Resolved;
    market.outcome = Some(result.outcome.clone());

    self.state.markets.insert(&result.event_id, market.clone())
        .expect("Failed to update market");

    // Calculate and distribute payouts
    self.distribute_payouts(&result.event_id, &result.outcome).await;

    // Emit resolution event
    self.runtime.emit(
        StreamName::from(b"market_resolved".to_vec()),
        &MarketEvent::Resolved {
            event_id: result.event_id,
            outcome: result.outcome
        }
    );
}
```

---

## Security Considerations

### 1. Oracle Authorization

**Contract-Level Whitelisting:**

```rust
// Only authorized oracles can publish
let signer = self.runtime.authenticated_signer()
    .expect("Operation must be signed");

let is_authorized = self.state.authorized_oracles
    .contains(&signer).await
    .expect("Failed to check");

assert!(is_authorized, "Unauthorized oracle");
```

**Key Points:**
- Linera's `authenticated_signer()` uses EIP-191 signature verification
- Operations inherit the signer's identity automatically
- No custom signature validation needed in contract
- Wallet private keys must be secured (HSM for production)

### 2. Preventing Replay Attacks

**Timestamp Validation:**

```rust
let current_time = self.runtime.system_time();
let result_age = current_time.micros() - result.timestamp;
let one_hour_micros = 3_600_000_000;

assert!(
    result_age < one_hour_micros,
    "Result timestamp too old - possible replay attack"
);
```

**Idempotency:**

```rust
let existing = self.state.event_results.get(&result.event_id).await
    .expect("Failed to check");

assert!(existing.is_none(), "Result already published");
```

### 3. Input Validation

```rust
// Validate event_id format
assert!(
    result.event_id.starts_with("mlb_") || result.event_id.starts_with("nba_"),
    "Invalid event ID format"
);

// Validate outcome values
let valid_outcomes = ["home_win", "away_win", "tie"];
assert!(
    valid_outcomes.contains(&result.outcome.as_str()),
    "Invalid outcome value"
);

// Validate score format
if let Some(score) = &result.score {
    let score_regex = Regex::new(r"^\d+-\d+$").unwrap();
    assert!(score_regex.is_match(score), "Invalid score format");
}
```

### 4. Multi-Signature Oracle (Wave 3+)

For production, consider requiring multiple oracles to agree:

```rust
pub struct OracleConsensus {
    pub event_id: EventId,
    pub votes: BTreeMap<AccountOwner, EventResult>,
    pub required_votes: u32,
}

// Only resolve when threshold reached
if consensus.votes.len() >= consensus.required_votes as usize {
    let outcomes: Vec<_> = consensus.votes.values()
        .map(|r| r.outcome.clone())
        .collect();

    let majority = find_majority(&outcomes);
    if let Some(outcome) = majority {
        self.finalize_result(event_id, outcome);
    }
}
```

---

## Key SDK APIs & Patterns

| Use Case | SDK API/Pattern | Location |
|----------|-----------------|----------|
| Authentication | `runtime.authenticated_signer()` | Contract operations |
| Authorization | `runtime.check_account_permission(owner)` | Contract operations |
| Event Emission | `runtime.emit(stream_name, &event)` | Contract (broadcasting) |
| Event Subscription | `runtime.subscribe_to_events(chain_id, app_id, stream)` | Contract (CreateMarket) |
| Event Reading | `runtime.read_event(chain_id, stream, index)` | process_streams() |
| HTTP Requests | `runtime.http_request(request)` | Service ONLY (not MVP) |
| Transaction Signing | `signer.sign(owner, value)` | Off-chain worker (EIP-191) |
| Wallet Management | `Client(wallet, signer)` | Off-chain worker |
| GraphQL Mutations | `application.query(json_query)` | Off-chain worker |

---

## Common Pitfalls to Avoid

### DON'T: Try to make HTTP calls in contracts

```rust
// This will NOT work in contracts (non-deterministic)
let response = reqwest::get("https://api.mlb.com/...").await?;
```

### DO: Make HTTP calls in off-chain workers

```typescript
// Off-chain worker makes API call
const response = await axios.get('https://api.mlb.com/...');
// Then signs and submits as operation to contract
await client.submitOperation({ publishResult: { ... } });
```

### DON'T: Store API keys in contracts

```rust
// Never hardcode secrets in contract code
const API_KEY: &str = "sk-xxxxx"; // WRONG
```

### DO: Store keys in off-chain worker environment

```bash
# .env file for off-chain worker
MLB_API_KEY=your_key_here
```

### DON'T: Assume services can modify state

```rust
// Services are READ-ONLY
impl Service {
    async fn handle_query() {
        self.state.counter += 1; // WRONG - services can't write
    }
}
```

### DO: Use operations for state changes

```rust
// Operations modify state, triggered from outside
impl Contract {
    async fn execute_operation(Operation::Increment) {
        self.state.counter += 1; // CORRECT
    }
}
```

---

## Implementation Roadmap

### Phase 1: Oracle Chain Foundation

**Step 1.1: Scaffold Application**
```bash
cd /home/liolik/p/flashbet-ai
linera project new flashbet-oracle
```

**Step 1.2: Implement Contract**
- Define `OracleState` with authorized_oracles, event_results, events
- Implement `Operation::PublishResult` with authorization checks
- Implement `Operation::AddOracle` / `RemoveOracle` (admin only)
- Add event emission via `runtime.emit()` for "event_results" stream

**Step 1.3: Implement Service**
- Read-only GraphQL queries for event_results, events, authorized_oracles
- No HTTP requests needed for Wave 1

**Step 1.4: Deploy & Test**
```bash
# Build
(cd flashbet-oracle && cargo build --release --target wasm32-unknown-unknown)

# Publish & create
ORACLE_APP_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/flashbet_oracle_{contract,service}.wasm \
  --json-parameters '{"admin": "$ADMIN_OWNER"}' \
  --json-argument '{"initial_oracles": ["$ORACLE_OWNER_1"]}')
```

### Phase 2: Manual Oracle Script (Wave 1)

**Step 2.1: Create Python Script**
```bash
mkdir oracle-worker
cd oracle-worker
```

Create `flashbet_oracle_manual.py` with:
- `LineraOracleClient` class
- `publish_result()` method using subprocess for `linera service`
- GraphQL mutation submission via requests library

**Step 2.2: Test End-to-End**
```bash
# Publish result
./flashbet_oracle_manual.py mlb_game_001 home_win "5-3"

# Verify on Oracle Chain
query { eventResults { entry(key: "mlb_game_001") { value { outcome } } } }
```

### Phase 3: Market Chain Integration

**Step 3.1: Add Subscription Logic**
```rust
self.runtime.subscribe_to_events(
    oracle_chain_id,
    oracle_app.forget_abi(),
    StreamName::from(b"event_results".to_vec())
);
```

**Step 3.2: Implement process_streams()**
- Read events from Oracle Chain
- Call resolve_market() for each new result
- Emit MarketEvent::Resolved

**Step 3.3: Test Market Resolution**
1. Deploy Market Chain with oracle subscription
2. Create market for mlb_game_001
3. Run manual oracle script
4. Verify market resolves automatically
5. Check payouts distributed

### Phase 4: Automated Worker (Wave 2+)

**Step 4.1: Setup Node.js Project**
```bash
mkdir oracle-worker-automated
cd oracle-worker-automated
npm init -y
npm install @linera/client @linera/signer axios dotenv
```

**Step 4.2: Implement OracleWorker**
- MLB API polling (30-second intervals)
- Deduplication logic
- Retry mechanism
- Circuit breaker
- Rate limiting

**Step 4.3: Deploy**
```bash
docker build -t flashbet-oracle-worker .
docker run -d --restart=unless-stopped flashbet-oracle-worker
```

---

## Success Metrics

**Wave 1 MVP (Manual):**
- Manual script publishes result in <2 seconds
- Market resolves automatically upon oracle event
- Total bet-to-payout cycle <10 seconds
- Demo video shows complete flow

**Wave 2+ (Automated):**
- Oracle worker uptime >99%
- Event publication latency <30 seconds after API availability
- Zero unauthorized result publications
- Zero duplicate result publications
- Successful handling of API failures

---

## Additional Resources

- **Linera SDK Documentation**: https://github.com/linera-io/linera-documentation
- **Example Applications**: https://github.com/linera-io/linera-protocol/tree/testnet_conway/examples
- **FlashBet AI Project**: /home/liolik/p/flashbet-ai/

---

## Next Steps

1. **Immediate (Wave 1):**
   - Create Oracle Chain contract with authorization
   - Build Python manual oracle script
   - Integrate Market Chain subscription
   - Test complete flow with mock event

2. **Post-MVP (Wave 2):**
   - Obtain MLB/NBA API credentials
   - Build Node.js automated worker
   - Deploy with Docker
   - Setup monitoring (Grafana/Prometheus)

3. **Future (Wave 3+):**
   - Multi-signature oracle consensus
   - Hardware Security Module (HSM) for keys
   - Geographic redundancy (multiple oracle nodes)
   - Support for additional sports
