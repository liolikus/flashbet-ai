# Chain Ownership in Linera

This document details the various aspects of chain ownership within the Linera Protocol, covering how to initialize wallets, request new chains, manage chain owners, and verify ownership status. Proper management of chain ownership is critical for security and control over decentralized applications.

## Table of Contents

1.  [Wallet Initialization and Chain Creation](#wallet-initialization-and-chain-creation)
    *   [Single Wallet Setup](#single-wallet-setup)
    *   [Multi-Wallet Setup](#multi-wallet-setup)
2.  [Managing Chain Ownership](#managing-chain-ownership)
    *   [Showing Current Ownership](#showing-current-ownership)
    *   [Changing Chain Ownership](#changing-chain-ownership)
    *   [Assigning Chains to Wallets](#assigning-chains-to-wallets)
    *   [Modifying Application Permissions](#modifying-application-permissions)
3.  [Verifying Ownership](#verifying-ownership)
    *   [Listing Chains in Wallets](#listing-chains-in-wallets)
    *   [Querying Owned NFTs via GraphQL](#querying-owned-nfts-via-graphql)
4.  [Programmatic Ownership Access (Rust SDK)](#programmatic-ownership-access-rust-sdk)
    *   [Checking Authenticated Signer and Permissions](#checking-authenticated-signer-and-permissions)
    *   [Retrieving Chain Ownership Programmatically](#retrieving-chain-ownership-programmatically)
5.  [JavaScript Client for Ownership](#javascript-client-for-ownership)
    *   [Claiming a Chain and Getting Owner Address](#claiming-a-chain-and-getting-owner-address)

---

## 1. Wallet Initialization and Chain Creation

The first step in managing chain ownership is typically to set up your Linera wallet and request chains, which are then associated with specific owners.

### Single Wallet Setup

Initialize a single Linera wallet and request a new chain from a faucet. This process usually assigns the requesting wallet's primary key as the initial owner.

```bash
# Set environment variables for wallet, keystore, and storage paths
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

# Initialize a new user wallet from a faucet
linera wallet init --faucet $FAUCET_URL

# Request a new chain and store its ID and owner address
INFO=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN="${INFO[0]}"
OWNER="${INFO[1]}" # Or INFO[3] depending on faucet output
```

This setup is common for single-user development or testing environments. Multiple examples exist with slight variations in how `OWNER` is extracted (e.g., `INFO[1]` or `INFO[3]`), so always verify the output of `linera wallet request-chain`.

### Multi-Wallet Setup

For scenarios involving multiple users or distinct entities, you can initialize multiple wallets and request chains for each. This is often seen in examples demonstrating multi-party interactions.

```bash
# Set environment variables for two distinct wallets
export LINERA_WALLET_1="$LINERA_TMP_DIR/wallet_1.json"
export LINERA_KEYSTORE_1="$LINERA_TMP_DIR/keystore_1.json"
export LINERA_STORAGE_1="rocksdb:$LINERA_TMP_DIR/client_1.db"
export LINERA_WALLET_2="$LINERA_TMP_DIR/wallet_2.json"
export LINERA_KEYSTORE_2="$LINERA_TMP_DIR/keystore_2.json"
export LINERA_STORAGE_2="rocksdb:$LINERA_TMP_DIR/client_2.db"

# Initialize wallets for two users
linera --with-wallet 1 wallet init --faucet $FAUCET_URL
linera --with-wallet 2 wallet init --faucet $FAUCET_URL

# Request chains for each wallet and store their IDs and owner addresses
INFO_1=($(linera --with-wallet 1 wallet request-chain --faucet $FAUCET_URL))
INFO_2=($(linera --with-wallet 2 wallet request-chain --faucet $FAUCET_URL))
CHAIN_1="${INFO_1[0]}"
CHAIN_2="${INFO_2[0]}"
OWNER_1="${INFO_1[1]}" # Or INFO[3]
OWNER_2="${INFO_2[1]}" # Or INFO[3]
```

---

## 2. Managing Chain Ownership

Linera provides CLI commands to inspect and modify the ownership of a chain.

### Showing Current Ownership

You can query the current ownership configuration of any chain using its ID.

```bash
# Display the current ownership configuration for CHAIN1
linera show-ownership --chain-id "$CHAIN1"
```

### Changing Chain Ownership

The ownership of a chain can be changed to one or more new owners. This operation is typically used in scenarios like atomic swaps or transferring control of a chain.

```bash
# Change ownership of the current chain to OWNER_1 and OWNER_2
linera --wait-for-outgoing-messages change-ownership \
    --owners $OWNER_1 $OWNER_2
```
The `--wait-for-outgoing-messages` flag ensures that any pending messages are processed before the ownership change is finalized, preventing loss of data or state.

### Assigning Chains to Wallets

For multi-owner or multi-player scenarios, a chain (e.g., a game chain) might be created by one party but needs to be assigned to other players' wallets to allow them to interact with it.

```bash
# Assuming HEX_CHAIN is the ID of the game chain
# Assign the HEX_CHAIN to wallet 1 with OWNER_1
linera -w1 assign --owner $OWNER_1 --chain-id $HEX_CHAIN

# Assign the HEX_CHAIN to wallet 2 with OWNER_2
linera -w2 assign --owner $OWNER_2 --chain-id $HEX_CHAIN
```

### Modifying Application Permissions

In addition to chain ownership, specific permissions can be set for applications on a chain, controlling which operations they can execute or which other applications they can interact with. This is often used in conjunction with ownership changes for complex protocols like atomic swaps.

```bash
# Change application permissions to allow only specific operations
# and to permit closing the chain by the matching engine application.
linera --wait-for-outgoing-messages change-application-permissions \
    --execute-operations $MATCHING_ENGINE \
    --close-chain $MATCHING_ENGINE
```
This command, used in the context of an atomic swap, restricts chain operations to only those initiated by the `$MATCHING_ENGINE` application and allows that application to close the chain.

---

## 3. Verifying Ownership

After creating or modifying chains and their ownership, it's important to verify the changes.

### Listing Chains in Wallets

You can display a table of chains registered within each Linera wallet, including their Chain ID, latest block information, and owner.

```bash
# Display chains managed by wallet 1
linera --with-wallet 1 wallet show

# Display chains managed by wallet 2
linera --with-wallet 2 wallet show
```

### Querying Owned NFTs via GraphQL

For NFT applications, you can query a specific owner's wallet to see all NFTs they possess.

```graphql
query {
  ownedNfts(owner: "$OWNER_1")
}
```
This GraphQL query retrieves a list of all NFTs owned by a specific account, useful for verifying NFT ownership after minting or transfers.

---

## 4. Programmatic Ownership Access (Rust SDK)

Linera smart contracts can access ownership information and perform permission checks using the `ContractRuntime`.

### Checking Authenticated Signer and Permissions

Within a contract's execution context, you can determine the authenticated signer (owner) and verify if they have the necessary permissions.

```rust
use linera_sdk::{Contract, ContractRuntime, Response};
// Assuming Operation and other necessary types are defined

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        // Check authentication
        let signer = self.runtime.authenticated_signer();
        if let Some(owner) = signer {
            // Verify if the authenticated owner has permission for the current operation
            self.runtime.check_account_permission(owner)
                .expect("Permission denied");
        }
        // ... rest of the operation logic
        Response::Ok
    }
}
```

### Retrieving Chain Ownership Programmatically

Contracts can also directly query the current ownership configuration of the chain they are executing on.

```rust
use linera_sdk::{Contract, ContractRuntime, Response};
// Assuming Operation and other necessary types are defined

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        // Get chain ownership details
        let ownership = self.runtime.chain_ownership();
        // ... use ownership information
        Response::Ok
    }
}
```

---

## 5. JavaScript Client for Ownership

The Linera JavaScript client library also provides functionality for wallet initialization and claiming chains.

### Claiming a Chain and Getting Owner Address

A web frontend can initialize a wallet, generate a new owner key, and claim a chain from a faucet.

```javascript
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { ethers } from 'ethers'; // For mnemonic generation

async function run() {
  await linera.default(); // Initialize Linera WASM client
  const faucet = await new linera.Faucet(import.meta.env.LINERA_FAUCET_URL);

  // Generate a new private key and owner address
  const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
  const signer = PrivateKey.fromMnemonic(mnemonic);
  const owner = signer.address();

  // Create a wallet (local storage) and claim a chain from the faucet
  const wallet = await faucet.createWallet();
  const chainId = await faucet.claimChain(wallet, owner);

  // Display the new chain ID and owner
  document.querySelector('#chain-id').innerText = chainId;
  document.querySelector('#owner').innerText = owner;

  // ... further interactions with the client
}

run();
```
This snippet demonstrates how a client-side application can programmatically handle wallet and chain creation, obtaining the chain ID and owner address for further interactions.
