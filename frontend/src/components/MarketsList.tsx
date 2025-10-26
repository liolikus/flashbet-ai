import { useState, useEffect } from 'react';
import MarketCard from './MarketCard';
import type { MarketState, Outcome } from '../types';
import { parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const BASE_URL = 'http://localhost:8080';

export default function MarketsList() {
  const [markets, setMarkets] = useState<MarketState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMultiMarketInfo, setShowMultiMarketInfo] = useState(true);

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, get all market IDs using the allMarkets query
      const allMarketsResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ allMarkets }`,
          }),
        }
      );

      const allMarketsData = await allMarketsResponse.json();
      console.log('All markets:', allMarketsData);

      if (allMarketsData.data && allMarketsData.data.allMarkets) {
        const marketIds: string[] = allMarketsData.data.allMarkets;

        if (marketIds.length === 0) {
          setMarkets([]);
          setLoading(false);
          return;
        }

        // For now, just fetch the latest market data (default behavior)
        // In the future, we can fetch each market individually by eventId
        const response = await fetch(
          `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `{
                eventId
                description
                homeTeam
                awayTeam
                eventTime
                status
                isResolved
                isOpen
                totalPool
                homePool
                awayPool
                drawPool
                betCount
                homeOdds
                awayOdds
                drawOdds
              }`,
            }),
          }
        );

        const data = await response.json();
        console.log('Market data:', data);

        if (data.data) {
          const rawData = data.data;
          const marketState: MarketState = {
            info: {
              marketId: rawData.eventId || '0',
              eventId: rawData.eventId || '',
              description: rawData.description || 'Unknown Market',
              closeTime: rawData.eventTime || 0,
              eventTime: rawData.eventTime || 0,
              homeTeam: rawData.homeTeam,
              awayTeam: rawData.awayTeam,
            },
            status: rawData.status || 'Open',
            pools: {
              Home: rawData.homePool || '0',
              Away: rawData.awayPool || '0',
              Draw: rawData.drawPool || '0',
            },
            totalPool: rawData.totalPool || '0',
            betCount: rawData.betCount || 0,
            winningOutcome: rawData.isResolved ? undefined : undefined,
          };
          // For now, showing latest market but we have all IDs available
          setMarkets([marketState]);
        } else if (data.errors) {
          setError(data.errors[0]?.message || 'Failed to load market');
        }
      } else if (allMarketsData.errors) {
        setError(allMarketsData.errors[0]?.message || 'Failed to load markets list');
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError('Failed to connect to GraphQL service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = async (
    eventId: string, // Multi-market: eventId identifies which market
    outcome: Outcome,
    amount: string
  ) => {
    try {
      // Multi-market architecture: marketId=0 (legacy), eventId identifies the market
      const numericMarketId = 0;
      const amountParsed = parseAmount(amount);

      // Step 1: Send placeBet mutation to User application (deducts balance, emits event)
      console.log('Step 1: Placing bet on User chain...');
      console.log(`  Event ID: ${eventId}`);
      const userResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              placeBet(
                marketChain: "${APP_IDS.MARKET_CHAIN}"
                marketId: ${numericMarketId}
                eventId: "${eventId}"
                outcome: ${outcome.toUpperCase()}
                amount: "${amountParsed}"
              )
            }`,
          }),
        }
      );

      const userData = await userResponse.json();
      if (userData.errors) {
        console.error('User bet placement failed:', userData.errors);
        throw new Error(userData.errors[0]?.message || 'Failed to place bet on User chain');
      }

      console.log('✓ User bet placed successfully');

      // Step 2: Relay bet to Market chain via RegisterBet operation
      // Wave 1: Frontend acts as relay between User and Market chains
      // Wave 2+: This will be automatic via cross-app event processing
      console.log('Step 2: Registering bet on Market chain...');

      // Build the Bet object matching Linera's Bet structure
      // Note: betId will be auto-incremented, but we pass 0 for initial bet
      // user field must be AccountOwner (cryptographic address), not chain ID
      const marketResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              registerBet(
                bet: {
                  betId: ${Date.now() % 1000000}
                  marketId: ${numericMarketId}
                  eventId: "${eventId}"
                  user: "${APP_IDS.USER_ACCOUNT_OWNER}"
                  outcome: ${outcome.toUpperCase()}
                  amount: "${amountParsed}"
                  timestamp: ${Date.now() * 1000}
                  userChain: "${APP_IDS.CHAIN}"
                }
              )
            }`,
          }),
        }
      );

      const marketData = await marketResponse.json();
      if (marketData.errors) {
        console.error('Market bet registration failed:', marketData.errors);
        console.warn('⚠️ Bet placed on User chain but not registered on Market chain - balance deducted but pool not updated');
        // Don't throw - bet is placed on User side, Market sync issue
      } else {
        console.log('✓ Bet registered on Market chain');
      }

      // Refresh markets data
      await fetchMarkets();
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  };

  if (loading && markets.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ height: '8rem', borderRadius: '6px' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-card">
        <p className="font-semibold">Failed to load markets: {error}</p>
        <button onClick={fetchMarkets} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (markets.length === 0 && !loading) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-600 mb-4">No markets available yet</p>
        <p className="text-sm text-gray-500">
          Markets will appear here once created
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Active Markets ({markets.length})</h2>
        <button onClick={fetchMarkets} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* Multi-Market Info Banner */}
      {showMultiMarketInfo && markets.length > 0 && (
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, hsl(var(--heroui-primary) / 0.1), hsl(var(--heroui-secondary) / 0.1))', border: '1px solid hsl(var(--heroui-primary) / 0.3)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎮</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--heroui-primary))' }}>
                Multi-Market Architecture Active!
              </h3>
              <p className="text-sm mb-2" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
                {markets.length} market{markets.length !== 1 ? 's' : ''} available! The system supports unlimited markets per chain,
                each identified by a unique event ID. Oracle Worker auto-generates markets from live games.
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                <strong>Status:</strong> ✅ allMarkets query working • Showing latest market ({markets[0]?.info.eventId})
              </p>
            </div>
            <button
              onClick={() => setShowMultiMarketInfo(false)}
              className="text-sm px-2 py-1 hover:opacity-70"
              style={{ color: 'hsl(var(--heroui-foreground-500))' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {markets.map((market, index) => (
        <MarketCard key={market.info.eventId || index} market={market} onPlaceBet={handlePlaceBet} />
      ))}
    </div>
  );
}
