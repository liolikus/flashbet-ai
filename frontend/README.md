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
CHAIN:  15fbdd3dc9cad5ab05ac3c77e0645962f6bc6f90c213b0e4787b9ab8bedb8ec7
ORACLE: d4a3c79502b626278c2d10457947440a7b72f86207ac2349e68fd7ece154ce01
MARKET: 8d4e1c6afd378769dafb2fc8cee0897f886d127a9160757e0c2c3317a31e8017
USER:   8fd6c26d5068f53015fcf90f3770e325d55b98e27ddadb9054d60372f6421156
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
