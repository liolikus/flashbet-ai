 FlashBet AI - Frontend

## Features

- **Real-time Market Display** - View live betting odds and pools
- **User Balance Management** - Deposit and track your balance
- **Bet Placement** - Place bets on markets with live odds calculation
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Auto-refresh** - Markets and balance update every 3 seconds

## Prerequisites

- Node.js 18+ and npm
- Linera service running on `http://localhost:8080`
- FlashBet AI contracts deployed (User, Market, Oracle chains)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Configuration

Application IDs are configured in `src/config/apollo.ts`:
```typescript
CHAIN:  2ded66b2c1277f566a798343954aa0fb2297ed7f902d93de7cb7b6afe43e0299
ORACLE: 4354163cac4183dc17bef63ec9e8d22a949c6046d9f36092e1e1a53eb1ca0c99
MARKET: b50abb232c6bf41e9fd8ba315790f766d35b7c16da993eb3e2a112e5d5a31050
USER:   874a0002bcf3195f98bed4d26f6e2ea5f577f70c12d9d715ac97247d1b8bfb53
```

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Apollo Client (GraphQL)
- Tailwind CSS v4
- graphql-ws (WebSocket subscriptions)

## Project Structure

```
src/
├── components/         # React components
├── config/            # Apollo Client config
├── types/             # TypeScript definitions
├── utils/             # Helper functions
├── App.tsx            # Main App
└── main.tsx           # Entry point
```

## Development

The UI connects to `http://localhost:8080/graphql` by default.

1. **Start Linera Service**: `cd .. && ./scripts/start_service.sh`
2. **Start Frontend**: `npm run dev`
3. **Open Browser**: `http://localhost:5173`

## License

MIT License - Part of FlashBet AI
