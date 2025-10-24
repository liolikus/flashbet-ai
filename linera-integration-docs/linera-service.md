# Linera Service and Network Management

This document provides comprehensive guidance on managing Linera services and setting up network environments, including local testnets and Docker-based deployments.

## Table of Contents
1. [Starting Linera Services](#starting-linera-services)
2. [Network Setup](#network-setup)
3. [Programmatic Interaction](#programmatic-interaction)
4. [Service Configuration](#service-configuration)

---

## 1. Starting Linera Services

Linera services are essential for interacting with the Linera network, handling GraphQL requests, and allowing applications to communicate.

### Single Wallet Service

**Command:**

```bash
PORT=8080
linera service --port $PORT &
```

**Usage Notes:**
- GraphQL endpoint: `http://localhost:<PORT>/chains/<CHAIN_ID>/applications/<APPLICATION_ID>`
- See [Applications.md](Applications.md) for deployment details

### Multi-Wallet Services

**Command:**

```bash
linera --with-wallet 1 service --port 8080 &
sleep 2
linera --with-wallet 2 service --port 8081 &
sleep 2
```

**Shorthand:**

```bash
linera -w 1 service --port 8080 &
linera -w 2 service --port 8081 &
sleep 5
```

### Long-Lived Services

For applications with significant initialization overhead:

```bash
PORT=8080
linera --long-lived-services service --port $PORT &
```

---

## 2. Network Setup

### Local Testnet

**Basic Setup:**

```bash
export PATH="$PWD/target/debug:$PATH"
source /dev/stdin <<<"$(linera net helper 2>/dev/null)"

FAUCET_PORT=8079
FAUCET_URL=http://localhost:$FAUCET_PORT

linera_spawn linera net up --with-faucet --faucet-port $FAUCET_PORT
```

**Custom Parameters:**

```bash
linera net up --validators 4 --shards 2 --initial-amount 1000000
```

### Docker Compose

**Start Services:**

```bash
./make-all-up.sh  # In /docker directory
```

**Check Status:**

```bash
docker-compose -f docker-compose.indexer-test.yml ps
```

**View Logs:**

```bash
docker-compose -f docker-compose.indexer-test.yml logs
docker-compose -f docker-compose.indexer-test.yml logs linera-indexer
```

**Reset Environment:**

```bash
docker-compose -f docker-compose.indexer-test.yml down -v
```

---

## 3. Programmatic Interaction

### Rust SDK

```rust
use linera_sdk::{Contract, ContractRuntime};

impl Contract for OracleContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::FetchPrice { symbol } => {
                let request = http::Request::builder()
                    .method("GET")
                    .uri(format!("https://api.example.com/price/{}", symbol))
                    .header("Accept", "application/json")
                    .body(Vec::new())
                    .expect("Failed to build request");

                let response = self.runtime.http_request(request).await;
                // Handle response...
            }
        }
    }
}
```

### TypeScript Client

```typescript
import { Client, Wallet, Signer } from '@linera/web-sdk';

const client = new Client(wallet, signer);

client.onNotification((notification: any) => {
    console.log("Received notification:", notification);
});
```

---

## 4. Service Configuration

### Environment Variables

```bash
export LINERA_WALLET_1="$LINERA_TMP_DIR/wallet_1.json"
export LINERA_KEYSTORE_1="$LINERA_TMP_DIR/keystore_1.json"
export LINERA_STORAGE_1="rocksdb:$LINERA_TMP_DIR/client_1.db"
```

### Storage Backend

```bash
export LINERA_STORAGE_1="rocksdb:$LINERA_TMP_DIR/client_1.db"
```

---

## See Also

*   [Applications.md](Applications.md): Application deployment
*   [chain-management.md](chain-management.md): Chain operations
*   [Wallets.md](Wallets.md): Wallet management
*   [GraphQL.md](GraphQL.md): GraphQL API
*   [Design-Patterns.md](Design-Patterns.md): Oracle patterns
