# FlashBet Oracle Worker

Automated Oracle service that fetches sports results and publishes them to the Linera blockchain.

## Features

- 🤖 **Automated**: Polls for finished games every 60 seconds
- 🎯 **Complete Workflow**: Publishes results → Resolves markets → Distributes payouts
- 📊 **The Odds API INTEGRATION**: once per 4 hours due to ODDS api free tier limitations
- 📊 **Mock Data for DEMO**: Includes simulated games for testing (no API key needed)
- 🔄 **Production Ready**: Can integrate with The Odds API for real sports data
- 💾 **Event Tracking**: Prevents duplicate publications

## Quick Start

### 1. Install Dependencies

```bash
cd oracle-worker
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Run in Development Mode

```bash
npm run dev
```

### 4. Run in Production (Compiled)

```bash
npm start
```

## Configuration

Edit `.env` file to configure:

```env
# Linera Configuration
LINERA_GRAPHQL_URL=http://localhost:8080
ORACLE_CHAIN_ID=your_oracle_chain_id
ORACLE_APP_ID=your_oracle_app_id
MARKET_CHAIN_ID=your_market_chain_id
MARKET_APP_ID=your_market_app_id

# Oracle Account Owner
ORACLE_ACCOUNT_OWNER=0xYourOracleAccountOwner

# Mode: 'mock' or 'live'
DATA_MODE=mock

# Poll interval in milliseconds
POLL_INTERVAL_MS=60000
```

## How It Works

1. **Poll for Games**: Every 60 seconds, checks for finished games
2. **Publish to Oracle**: Sends result to Oracle Chain via GraphQL
3. **Process on Market**: Triggers market resolution
4. **Distribute Payouts**: Queries winning bets and sends payouts to User Chains

## Mock Data for DEMO

By default, uses simulated games defined in `src/api/mockSportsData.ts`.

To test:
1. Games finish 5 minutes after creation
2. Random scores generated
3. Automatic payout distribution

## Live API Integration

To use real sports data:

1. Get API key from [The Odds API](https://the-odds-api.com)
2. Set `THE_ODDS_API_KEY` in `.env`
3. Set `DATA_MODE=live`
4. Implement API client in `src/api/sportsdata.ts` (TODO)



