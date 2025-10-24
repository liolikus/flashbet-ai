# Linera Wallet Management Guide

This guide provides a comprehensive overview of managing Linera wallets, chains, and performing various operations using the Linera Command-Line Interface (CLI), JavaScript/TypeScript client, and GraphQL API.

## Table of Contents

1. [Introduction to Linera Wallets](#1-introduction-to-linera-wallets)
2. [Environment Setup](#2-environment-setup)
   * [2.1 Required Environment Variables](#21-required-environment-variables)
3. [CLI Wallet and Chain Management](#3-cli-wallet-and-chain-management)
   * [3.1 Initializing a Single Wallet](#31-initializing-a-single-wallet)
   * [3.2 Initializing Multiple Wallets](#32-initializing-multiple-wallets)
   * [3.3 Requesting New Chains](#33-requesting-new-chains)
   * [3.4 Listing Chains in Wallets](#34-listing-chains-in-wallets)
   * [3.5 Assigning Existing Chains to Wallets](#35-assigning-existing-chains-to-wallets)
4. [Linera Node Service Startup](#4-linera-node-service-startup)
   * [4.1 Starting a Single Node Service](#41-starting-a-single-node-service)
   * [4.2 Starting Multiple Node Services](#42-starting-multiple-node-services)
   * [4.3 Constructing GraphQL Endpoints](#43-constructing-graphql-endpoints)
5. [Client-Side Development (JavaScript/TypeScript)](#5-client-side-development-javascripttypescript)
   * [5.1 Initializing the Linera Client](#51-initializing-the-linera-client)
   * [5.2 Wallet Creation and Chain Claiming](#52-wallet-creation-and-chain-claiming)
   * [5.3 Performing Native Token Transfers](#53-performing-native-token-transfers)
   * [5.4 Handling Blockchain Notifications](#54-handling-blockchain-notifications)
   * [5.5 MetaMask Integration](#55-metamask-integration)
6. [GraphQL API for Wallet Operations](#6-graphql-api-for-wallet-operations)
   * [6.1 Connecting to the GraphQL Endpoint](#61-connecting-to-the-graphql-endpoint)
   * [6.2 Fungible Token Operations](#62-fungible-token-operations)
   * [6.3 NFT Operations](#63-nft-operations)
   * [6.4 Automated Market Maker (AMM) Operations](#64-automated-market-maker-amm-operations)
   * [6.5 Matching Engine Operations](#65-matching-engine-operations)
   * [6.6 General Chain Information Queries](#66-general-chain-information-queries)
   * [6.7 Social Media Application Queries/Mutations](#67-social-media-application-queriesmutations)
7. [See Also](#7-see-also)

---

## 1. Introduction to Linera Wallets

Linera wallets are essential for interacting with the Linera blockchain. They store cryptographic keys, manage chain ownership, and facilitate transactions, token transfers, and application interactions. Each wallet can manage multiple chains, and each chain can have one or more owners. This guide details how to set up, manage, and use Linera wallets across various interfaces.

## 2. Environment Setup

Before interacting with Linera wallets, it's crucial to set up the necessary environment variables. These variables define where your wallet data is stored and how your client connects to the Linera network.

### 2.1 Required Environment Variables

The following environment variables are commonly used to configure Linera CLI clients:

* `LINERA_TMP_DIR`: A temporary directory for storing client-related files.
* `LINERA_WALLET`: Path to the wallet file (JSON format).
* `LINERA_KEYSTORE`: Path to the keystore file (JSON format).
* `LINERA_STORAGE`: Database configuration for client storage (e.g., `rocksdb:/path/to/client.db`).
* `FAUCET_URL` or `LINERA_FAUCET_URL`: The URL of the Linera faucet service, used to request new chains and initial tokens.

**Example Setup:**

```bash
# Define a temporary directory for Linera files
export LINERA_TMP_DIR=$(mktemp -d)

# Set the faucet URL (e.g., for a testnet)
export FAUCET_URL="https://faucet.testnet.linera.net" # Or your local faucet URL

# Configure paths for a single wallet
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

# For multiple wallets, you would use indexed variables (e.g., LINERA_WALLET_1, LINERA_KEYSTORE_1)
```

**Use Case:** This setup is the foundational step for any Linera CLI operation, ensuring your client knows where to store its state and how to connect to the network.

## 3. CLI Wallet and Chain Management

The Linera CLI provides commands for initializing wallets, requesting new chains, and managing existing chains.

### 3.1 Initializing a Single Wallet

To initialize a new Linera wallet and associate it with a faucet, use the `linera wallet init` command. This creates the `wallet.json` and `keystore.json` files at the paths specified by `LINERA_WALLET` and `LINERA_KEYSTORE`.

```bash
# Ensure environment variables are set as described in Section 2.1
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"
export FAUCET_URL="https://faucet.testnet.linera.net"

# Initialize a new user wallet using the faucet
linera wallet init --faucet $FAUCET_URL
```

**Use Case:** This is the first step for any new user or application needing a Linera wallet to interact with the network.

### 3.2 Initializing Multiple Wallets

For scenarios requiring multiple distinct wallets (e.g., simulating multiple users), you can configure separate environment variables for each wallet and use the `--with-wallet` flag.

```bash
# Define environment variables for two wallets
export LINERA_WALLET_1="$LINERA_TMP_DIR/wallet_1.json"
export LINERA_KEYSTORE_1="$LINERA_TMP_DIR/keystore_1.json"
export LINERA_STORAGE_1="rocksdb:$LINERA_TMP_DIR/client_1.db"
export LINERA_WALLET_2="$LINERA_TMP_DIR/wallet_2.json"
export LINERA_KEYSTORE_2="$LINERA_TMP_DIR/keystore_2.json"
export LINERA_STORAGE_2="rocksdb:$LINERA_TMP_DIR/client_2.db"

export FAUCET_URL="https://faucet.testnet.linera.net"

# Initialize wallet 1
linera --with-wallet 1 wallet init --faucet $FAUCET_URL

# Initialize wallet 2
linera --with-wallet 2 wallet init --faucet $FAUCET_URL
```

**Use Case:** Useful for testing multi-user applications, smart contracts involving multiple parties, or setting up distinct identities for different services.

### 3.3 Requesting New Chains

After wallet initialization, you can request new chains from the faucet. Each chain is a personal blockchain managed by your wallet. The `request-chain` command outputs the new chain ID and its owner's public key.

**Requesting a Single Chain:**

```bash
# Ensure single wallet environment variables are set (as in Section 3.1)
# and wallet is initialized.

# Request a new chain and capture its ID and owner
INFO=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN="${INFO[0]}" # The chain ID
OWNER="${INFO[1]}" # The owner's public key

echo "New Chain ID: $CHAIN"
echo "Chain Owner: $OWNER"
```

**Requesting Multiple Chains for a Single Wallet:**

```bash
# Ensure single wallet environment variables are set and wallet is initialized.

# Request two new chains
INFO1=($(linera wallet request-chain --faucet $FAUCET_URL))
INFO2=($(linera wallet request-chain --faucet $FAUCET_URL))

CHAIN1="${INFO1[0]}"
ACCOUNT1="${INFO1[1]}" # Note: sometimes output is OWNER, sometimes ACCOUNT
CHAIN2="${INFO2[0]}"
ACCOUNT2="${INFO2[1]}"

echo "Chain 1 ID: $CHAIN1, Account: $ACCOUNT1"
echo "Chain 2 ID: $CHAIN2, Account: $ACCOUNT2"
```

**Requesting Chains for Multiple Wallets:**

```bash
# Ensure multiple wallet environment variables are set (as in Section 3.2)
# and both wallets are initialized.

# Request a chain for wallet 1
INFO_1=($(linera --with-wallet 1 wallet request-chain --faucet $FAUCET_URL))
CHAIN_1="${INFO_1[0]}"
OWNER_1="${INFO_1[1]}" # Note: index can vary, sometimes 1, sometimes 3

# Request a chain for wallet 2
INFO_2=($(linera --with-wallet 2 wallet request-chain --faucet $FAUCET_URL))
CHAIN_2="${INFO_2[0]}"
OWNER_2="${INFO_2[1]}"

echo "Wallet 1 Chain ID: $CHAIN_1, Owner: $OWNER_1"
echo "Wallet 2 Chain ID: $CHAIN_2, Owner: $OWNER_2"
```

**Use Case:** Essential for creating new user identities or application-specific chains on the Linera network. The output variables (`CHAIN`, `OWNER`, `ACCOUNT`) are crucial for subsequent operations like deploying applications or transferring tokens.

### 3.4 Listing Chains in Wallets

The `linera wallet show` command displays all chains currently managed by a specific wallet, including their IDs, latest block information, and owner.

```bash
# Ensure wallet(s) are initialized and chains are requested.

# Show chains for the default wallet
linera wallet show

# Show chains for wallet 1
linera --with-wallet 1 wallet show

# Show chains for wallet 2
linera --with-wallet 2 wallet show
```

**Use Case:** Verifying that chains have been correctly created and are tracked by the wallet, and for inspecting their current state.

### 3.5 Assigning Existing Chains to Wallets

Sometimes, an application might create a new chain (e.g., a game chain) that needs to be assigned to a user's wallet for interaction. The `linera assign` command facilitates this.

```bash
# Assume HEX_CHAIN and OWNER_1, OWNER_2 are already defined from previous steps.
# For example, HEX_CHAIN might come from a GraphQL query result.

# Assign the HEX_CHAIN to wallet 1, owned by OWNER_1
linera --with-wallet 1 assign --owner $OWNER_1 --chain-id $HEX_CHAIN

# Assign the HEX_CHAIN to wallet 2, owned by OWNER_2
linera --with-wallet 2 assign --owner $OWNER_2 --chain-id $HEX_CHAIN
```

**Use Case:** This is critical for applications that dynamically create chains (e.g., game instances, private channels) and need to grant specific users control over them.

## 4. Linera Node Service Startup

To enable client-side applications (JavaScript/TypeScript) or GraphQL clients to interact with your Linera wallet and chains, you need to start a local Linera node service. This service exposes a GraphQL API endpoint.

### 4.1 Starting a Single Node Service

Start a Linera service for your default wallet on a specified port. Running it in the background (`&`) allows your terminal to remain interactive.

```bash
# Ensure wallet is initialized and chains are requested.
# Define a port for the service
PORT=8080

# Start the Linera service in the background
linera service --port $PORT &

# It's good practice to wait a moment for the service to fully initialize
sleep 2
echo "Linera service started on port $PORT"
```

**Use Case:** Providing a local GraphQL endpoint for development and testing of client applications against a single user's wallet.

### 4.2 Starting Multiple Node Services

For multi-wallet scenarios, you can start separate Linera services for each wallet on different ports.

```bash
# Ensure multiple wallets are initialized and chains are requested (as in Section 3.2).

# Start service for wallet 1 on port 8080
linera --with-wallet 1 service --port 8080 &

# Wait for it to initialize
sleep 2

# Start service for wallet 2 on port 8081
linera --with-wallet 2 service --port 8081 &

# Wait for it to initialize
sleep 5
echo "Linera services started for wallet 1 on 8080 and wallet 2 on 8081"
```

**Use Case:** Simulating a multi-user environment where each user's wallet needs its own API endpoint for interaction, commonly used in integration tests or local development of decentralized applications.

### 4.3 Constructing GraphQL Endpoints

Once a Linera service is running, you can construct the GraphQL endpoint URL to interact with specific chains and applications.

```bash
# Assuming PORT, CHAIN, and LINERA_APPLICATION_ID are defined
# Example:
# PORT=8080
# CHAIN="0x..." # Your chain ID
# LINERA_APPLICATION_ID="0x..." # The ID of your deployed application

# Echo the GraphQL endpoint for a specific application on a chain
echo "GraphQL Endpoint: http://localhost:$PORT/chains/$CHAIN/applications/$LINERA_APPLICATION_ID"
```

**Use Case:** This URL is used by GraphQL clients (like GraphiQL, `curl`, or client-side JavaScript libraries) to send queries and mutations to a specific application instance on a particular chain.

## 5. Client-Side Development (JavaScript/TypeScript)

The `@linera/client` and `@linera/signer` libraries provide a robust way to interact with Linera from web applications.

### 5.1 Initializing the Linera Client

The `Client` class is the primary entry point for client-side interactions. It requires a `Wallet` object and a `Signer` object.

```typescript
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer'; // Example signer, MetaMask is also an option
import { ethers } from 'ethers'; // For mnemonic generation

async function initializeClient() {
  // Load Linera WASM module
  await linera.default();

  // 1. Initialize Faucet (using environment variable for URL)
  const faucet = await new linera.Faucet(import.meta.env.LINERA_FAUCET_URL);

  // 2. Create a Signer (e.g., from a randomly generated mnemonic)
  // For production, you'd load a mnemonic securely or use MetaMask.
  const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
  const signer = PrivateKey.fromMnemonic(mnemonic);

  // 3. Create a Wallet using the faucet
  const wallet = await faucet.createWallet();

  // 4. Get the owner address from the signer
  const owner = signer.address();

  // 5. Claim a new chain for this wallet and owner
  const chainId = await faucet.claimChain(wallet, owner);

  // 6. Instantiate the Linera Client
  const client = await new linera.Client(wallet, signer);

  console.log('Client initialized successfully!');
  console.log('Chain ID:', chainId);
  console.log('Owner Address:', owner);

  // Access an application frontend
  const application = await client.frontend().application(import.meta.env.LINERA_APPLICATION_ID);
  console.log('Connected to application:', import.meta.env.LINERA_APPLICATION_ID);

  return { client, application, chainId, owner };
}

initializeClient().catch(console.error);
```

**Use Case:** This is the standard pattern for any web or Node.js application that needs to programmatically interact with the Linera network, deploy applications, or send transactions.

### 5.2 Wallet Creation and Chain Claiming

The `Faucet` object simplifies the process of creating a new wallet and claiming a chain, which is often combined with client initialization.

```javascript
// ... (assuming linera.default() has been called)
const faucet = await new linera.Faucet(import.meta.env.LINERA_FAUCET_URL);
const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
const signer = PrivateKey.fromMnemonic(mnemonic);
const wallet = await faucet.createWallet();
const owner = signer.address();
const chainId = await faucet.claimChain(wallet, owner);

console.log(`Wallet created, chain claimed: ${chainId} for owner ${owner}`);
```

**Use Case:** Streamlining the onboarding process for new users in a DApp, allowing them to quickly get a wallet and an associated chain.

### 5.3 Performing Native Token Transfers

The Linera client can directly perform native token transfers between chains or to specific accounts.

```javascript
// ... (assuming client, chainId, and owner 'me' are initialized)

// Example: Transfer 10 native tokens to the current chain and owner
await client.transfer({
  recipient: {
    chain_id: chainId,
    owner: me, // The current owner's identity
  },
  amount: 10,
});

console.log(`Transferred 10 native tokens to ${me}@${chainId}`);
```

**Use Case:** Fundamental for any DApp requiring basic token movement, such as funding user accounts or managing application-specific treasuries.

### 5.4 Handling Blockchain Notifications

The Linera client can subscribe to notifications from the blockchain, such as new blocks being created. This is essential for real-time UI updates.

```javascript
// ... (assuming client and application are initialized)

client.onNotification(notification => {
  let newBlock = notification.reason.NewBlock;
  if (!newBlock) return;

  console.log(`New block at height: ${newBlock.height}, hash: ${newBlock.hash}`);
  // Example: update UI or re-query balances
  // prependEntry(document.querySelector('#logs'), newBlock);
  // updateBalance(application);
});

console.log('Subscribed to blockchain notifications.');
```

**Use Case:** Building responsive user interfaces that react to on-chain events, such as transaction confirmations, balance changes, or new application states.

### 5.5 MetaMask Integration

The `@linera/signer` library supports MetaMask, allowing users to sign transactions using their existing MetaMask accounts.

```javascript
import * as linera from '@linera/client';
import * as linera_signer from '@linera/signer';

async function connectMetaMask() {
  await linera.default();
  const faucet = await new linera.Faucet(import.meta.env.LINERA_FAUCET_URL);

  // Initialize MetaMask signer
  const signer = await new linera_signer.MetaMask();

  // Get the owner address from MetaMask
  const owner = await signer.address();
  document.getElementById('owner').innerText = owner;

  // Create wallet and claim chain using MetaMask owner
  const wallet = await faucet.createWallet();
  const chainId = await faucet.claimChain(wallet, owner);
  document.getElementById('chain-id').innerText = chainId;

  // Instantiate client with MetaMask signer
  const client = await new linera.Client(wallet, signer);

  console.log('MetaMask connected and client initialized.');
  console.log('Owner:', owner);
  console.log('Chain ID:', chainId);

  // Example: Interact with a counter application
  const counter = await client.frontend().application(import.meta.env.LINERA_APPLICATION_ID);
  const response = await counter.query('{ "query": "query { value }" }');
  document.getElementById('count').innerText = JSON.parse(response).data.value;

  // Example: Increment counter via mutation
  document.getElementById('increment-btn').addEventListener('click', () => {
    counter.query('{ "query": "mutation { increment(value: 1) }" }');
  });
}

// Ensure this runs after DOM is loaded
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connectMetaMask);
else connectMetaMask();
```

**Use Case:** Integrating Linera DApps with the broader Web3 ecosystem, allowing users to leverage their existing MetaMask identities and manage their Linera assets and interactions through a familiar interface.

## 6. GraphQL API for Wallet Operations

Linera applications expose GraphQL APIs for querying blockchain state and executing mutations (transactions). This section covers common wallet-related GraphQL operations.

**Prerequisite:** Ensure a Linera node service is running and accessible (see [Section 4](#4-linera-node-service-startup)).

### 6.1 Connecting to the GraphQL Endpoint

You can interact with the GraphQL endpoint using tools like `curl`, GraphiQL, or client-side libraries.

**Example `curl` command:**

```bash
# Assuming your service is running on PORT and you have a CHAIN and APP_ID
# Example:
# PORT=8080
# CHAIN="0x..."
# APP_ID="0x..." # Application ID (e.g., for fungible token app)

# Construct the GraphQL endpoint URL
GRAPHQL_URL="http://localhost:$PORT/chains/$CHAIN/applications/$APP_ID"

# Example: Query the ticker symbol of a fungible token application
curl -X POST -H "Content-Type: application/json" \
     -d '{ "query": "query { tickerSymbol }" }' \
     $GRAPHQL_URL
```

### 6.2 Fungible Token Operations

These operations focus on managing fungible tokens (e.g., native tokens, custom tokens deployed via a fungible application).

#### 6.2.1 Querying Balances

You can query balances for specific accounts or retrieve all accounts managed by an application.

**Query Account Balance by Owner:**

```graphql
query GetBalance($owner: AccountOwner!) {
    accounts {
        entry(key: $owner) {
            value
        }
    }
}
```

**Use Case:** Checking the balance of a specific user or application-controlled account.
**Example Variables:** `{"owner": "$OWNER_1"}`

**Query All Accounts and Balances:**

```graphql
query GetAllAccounts {
    accounts {
        keys # List of all account owners
        entries {
            key # Account owner
            value # Balance
        }
    }
}
```

**Use Case:** Getting a comprehensive overview of all token holders and their balances within a fungible token application.

**Query Chain Balance (Native Tokens):**

```bash
# Using Linera CLI for native chain balance
linera query-balance "$CHAIN1"
```

**Use Case:** Checking the total native token balance held by a specific chain.

#### 6.2.2 Transferring Tokens

Transfer tokens between accounts on the same chain or across different chains.

**CLI Native Token Transfer:**

```bash
# Transfer 10 native tokens from CHAIN1 to CHAIN2
linera transfer 10 --from "$CHAIN1" --to "$CHAIN2"

# Transfer 5 native tokens from CHAIN1 to a specific account on CHAIN1
linera transfer 5 --from "$CHAIN1" --to "$CHAIN1:$ACCOUNT1"
```

**Use Case:** Basic native token movement for funding, payments, or application logic.

**GraphQL Fungible Token Transfer (Application-specific):**

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

**Use Case:** Transferring custom fungible tokens managed by a specific application.
**Example Variables:**
`{"owner": "$OWNER_1", "amount": "50.", "targetChain": "$CHAIN_1", "targetOwner": "$OWNER_2"}`

#### 6.2.3 Claiming Tokens

Tokens can be claimed from a source account on one chain to a target account on another chain. This is often used in cross-chain scenarios.

```graphql
mutation ClaimTokens($sourceChain: ChainId!, $sourceOwner: AccountOwner!, $amount: String!, $targetChain: ChainId!, $targetOwner: AccountOwner!) {
  claim(
    sourceAccount: {
      chainId: $sourceChain,
      owner: $sourceOwner,
    }
    amount: $amount,
    targetAccount: {
      chainId: $targetChain,
      owner: $targetOwner
    }
  )
}
```

**Use Case:** Consolidating tokens from various chains or facilitating multi-chain DApps where tokens need to be moved to a user's active chain.
**Example Variables:**
`{"sourceChain": "$CHAIN_1", "sourceOwner": "$OWNER_2", "amount": "100.", "targetChain": "$CHAIN_2", "targetOwner": "$OWNER_3"}`

#### 6.2.4 Pledging Tokens (Crowd-funding Example)

In applications like crowd-funding, users might pledge tokens to a campaign.

```graphql
mutation PledgeTokens($owner: AccountOwner!, $amount: String!) {
  pledge(
    owner: $owner,
    amount: $amount
  )
}
```

**Use Case:** Contributing fungible tokens to a specific application or smart contract, as demonstrated in a crowd-funding scenario.
**Example Variables:** `{"owner": "$OWNER_2", "amount": "80."}`

### 6.3 NFT Operations

Linera supports Non-Fungible Tokens (NFTs). These GraphQL operations allow for minting, querying, and transferring NFTs.

#### 6.3.1 Minting NFTs

Minting creates a new unique NFT and assigns it to an owner.

**Mint NFT with Prompt (Generative NFT):**

```graphql
mutation MintNftWithPrompt($minter: AccountOwner!, $prompt: String!) {
  mint(
    minter: $minter,
    prompt: $prompt
  )
}
```

**Use Case:** Creating new generative NFTs where a prompt influences the NFT's characteristics.
**Example Variables:** `{"minter": "$OWNER_1", "prompt": "Hello!"}`

**Mint NFT with Blob Hash:**

```graphql
mutation MintNftWithBlob($minter: AccountOwner!, $name: String!, $blobHash: DataBlobHash!) {
  mint(
    minter: $minter,
    name: $name,
    blobHash: $blobHash
  )
}
```

**Use Case:** Minting NFTs where the actual asset data (image, video, etc.) is stored as a data blob on-chain, and the NFT references this blob via its hash.
**Example Variables:** `{"minter": "$OWNER_1", "name": "nft1", "blobHash": "$BLOB_HASH"}`

#### 6.3.2 Querying NFTs

Retrieve information about individual NFTs, or list all NFTs owned by an account or available in the application.

**Query Owned NFTs by Owner:**

```graphql
query GetOwnedNfts($owner: AccountOwner!) {
  ownedNfts(owner: $owner)
}
```

**Use Case:** Displaying a user's NFT collection.
**Example Variables:** `{"owner": "$OWNER_1"}`

**Query All NFTs in Application:**

```graphql
query GetAllNfts {
  nfts
}
```

**Use Case:** Auditing all NFTs minted within a specific application or displaying a marketplace's entire catalog.

**Query Specific NFT Details by Token ID:**

```graphql
query GetNftDetails($tokenId: TokenId!) {
  nft(tokenId: $tokenId) {
    tokenId
    owner
    prompt # May vary depending on NFT app schema
    minter # May vary depending on NFT app schema
  }
}
```

**Use Case:** Retrieving detailed metadata and ownership information for a particular NFT.
**Example Variables:** `{"tokenId": "$TOKEN_ID"}`

#### 6.3.3 Transferring NFTs

Change the ownership of an NFT from one account to another.

```graphql
mutation TransferNft($sourceOwner: AccountOwner!, $tokenId: TokenId!, $targetChain: ChainId!, $targetOwner: AccountOwner!) {
  transfer(
    sourceOwner: $sourceOwner,
    tokenId: $tokenId,
    targetAccount: {
      chainId: $targetChain,
      owner: $targetOwner
    }
  )
}
```

**Use Case:** Facilitating NFT sales, gifts, or transfers between user accounts.
**Example Variables:** `{"sourceOwner": "$OWNER_1", "tokenId": "$TOKEN_ID", "targetChain": "$CHAIN_1", "targetOwner": "$OWNER_2"}`

#### 6.3.4 Publishing Data Blobs (for NFTs)

Data blobs can be published to a chain to store arbitrary data, often used to store NFT metadata or actual asset files.

```graphql
mutation PublishDataBlob($chainId: ChainId!, $bytes: [Byte!]!) {
  publishDataBlob(
    chainId: $chainId,
    bytes: $bytes
  )
}
```

**Use Case:** Storing immutable, on-chain data that can be referenced by NFTs or other applications. The `bytes` array would represent the raw data (e.g., image bytes, JSON metadata).
**Example Variables:** `{"chainId": "$CHAIN_1", "bytes": [104, 101, 108, 108, 111]}` (for "hello")

### 6.4 Automated Market Maker (AMM) Operations

These GraphQL operations interact with an AMM application for liquidity provision and token swapping.

#### 6.4.1 Adding Liquidity

Provide liquidity to an AMM pool by depositing a pair of tokens.

```graphql
mutation AddLiquidity($owner: AccountOwner!, $maxToken0Amount: String!, $maxToken1Amount: String!) {
  addLiquidity(
    owner: $owner,
    maxToken0Amount: $maxToken0Amount,
    maxToken1Amount: $maxToken1Amount,
  )
}
```

**Use Case:** Becoming a liquidity provider in a decentralized exchange, earning trading fees.
**Example Variables:** `{"owner": "$OWNER_1", "maxToken0Amount": "50", "maxToken1Amount": "50"}`

#### 6.4.2 Removing Liquidity

Withdraw liquidity from an AMM pool.

```graphql
mutation RemoveLiquidity($owner: AccountOwner!, $tokenToRemoveIdx: Int!, $tokenToRemoveAmount: String!) {
  removeLiquidity(
    owner: $owner,
    tokenToRemoveIdx: $tokenToRemoveIdx,
    tokenToRemoveAmount: $tokenToRemoveAmount,
  )
}
```

**Use Case:** Withdrawing your contributed tokens and accumulated fees from an AMM pool.
**Example Variables:** `{"owner": "$OWNER_1", "tokenToRemoveIdx": 1, "tokenToRemoveAmount": "1"}`

**Remove All Added Liquidity:**

```graphql
mutation RemoveAllLiquidity($owner: AccountOwner!) {
  removeAllAddedLiquidity(
    owner: $owner,
  )
}
```

**Use Case:** Fully exiting a liquidity position in an AMM.
**Example Variables:** `{"owner": "$OWNER_1"}`

#### 6.4.3 Swapping Tokens

Execute a token swap between two assets in the AMM pool.

```graphql
mutation SwapTokens($owner: AccountOwner!, $inputTokenIdx: Int!, $inputAmount: String!) {
  swap(
    owner: $owner,
    inputTokenIdx: $inputTokenIdx,
    inputAmount: $inputAmount,
  )
}
```

**Use Case:** Exchanging one type of token for another via the AMM.
**Example Variables:** `{"owner": "$OWNER_2", "inputTokenIdx": 1, "inputAmount": "1"}`

### 6.5 Matching Engine Operations

These GraphQL operations interact with a matching engine application to place bid and ask orders.

#### 6.5.1 Executing Bid Orders

Place a bid order to buy tokens at a specified price.

```graphql
mutation ExecuteBidOrder($owner: AccountOwner!, $amount: String!, $price: Int!) {
  executeOrder(
    order: {
      Insert : {
        owner: $owner,
        amount: $amount,
        nature: Bid,
        price: {
            price: $price
        }
      }
    }
  )
}
```

**Use Case:** Participating in a decentralized order book to purchase assets.
**Example Variables:** `{"owner": "$OWNER_1", "amount": "1", "price": 5}`

#### 6.5.2 Executing Ask Orders

Place an ask order to sell tokens at a specified price.

```graphql
mutation ExecuteAskOrder($owner: AccountOwner!, $amount: String!, $price: Int!) {
  executeOrder(
    order: {
      Insert : {
        owner: $owner,
        amount: $amount,
        nature: Ask,
        price: {
            price: $price
        }
      }
    }
  )
}
```

**Use Case:** Participating in a decentralized order book to sell assets.
**Example Variables:** `{"owner": "$OWNER_2", "amount": "2", "price": 5}`

### 6.6 General Chain Information Queries

Query general information about the current chain.

```graphql
query GetChainInfo {
    chainId
    blockHeight
    timestamp
    chainBalance
    ownerBalances
}
```

**Use Case:** Monitoring the state and activity of a specific Linera chain.

### 6.7 Social Media Application Queries/Mutations

Example GraphQL operations for a social media application.

**Query Social Media Posts:**

```graphql
query GetPosts {
    ownPosts {
        entries {
            timestamp
            text
            likes
        }
    }
    receivedPosts {
        entries {
            key {
                timestamp
                author
            }
            value {
                text
                likes
            }
        }
    }
}
```

**Use Case:** Retrieving posts made by the current user and posts received from subscribed chains.

**Subscribe to Another Chain's Posts:**

```graphql
mutation Subscribe($chainId: ChainId!) {
    subscribe(chainId: $chainId)
}
```

**Use Case:** Following other users or communities by subscribing to their chains to receive their posts.
**Example Variables:** `{"chainId": "$OTHER_USER_CHAIN_ID"}`

**Create a Post:**

```graphql
mutation CreatePost($text: String!) {
    post(text: $text)
}
```

**Use Case:** Publishing new content to your social media chain.
**Example Variables:** `{"text": "Hello, Linera!"}`

## 7. See Also

* [Applications.md](Applications.md): Application deployment and management
* [Chain-ownership.md](Chain-ownership.md): Chain ownership models and permissions
* [GraphQL.md](GraphQL.md): Complete GraphQL schema reference
* [linera-service.md](linera-service.md): Advanced service configuration and deployment
* [Design-Patterns.md](Design-Patterns.md): Best practices and design patterns for Linera development
