import { useState, useEffect } from 'react';
import MarketCard from './MarketCard';
import type { MarketState, Outcome } from '../types';
import { parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const BASE_URL = 'http://localhost:8080';

export default function MarketsList() {
  const [market, setMarket] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.MARKET}`,
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
        // Transform flat data to MarketState structure
        const rawData = data.data;
        const marketState: MarketState = {
          info: {
            marketId: rawData.eventId || '0',
            eventId: rawData.eventId || '',
            description: rawData.description || 'Unknown Market',
            closeTime: rawData.eventTime || 0,
            eventTime: rawData.eventTime || 0,
          },
          status: rawData.status || 'Open',
          pools: {
            Home: rawData.homePool || '0',
            Away: rawData.awayPool || '0',
            Draw: rawData.drawPool || '0',
          },
          totalPool: rawData.totalPool || '0',
          betCount: rawData.betCount || 0,
          winningOutcome: rawData.isResolved ? undefined : undefined, // TODO: Add winningOutcome to schema
        };
        setMarket(marketState);
      } else if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to load market');
      }
    } catch (err) {
      console.error('Failed to fetch market:', err);
      setError('Failed to connect to GraphQL service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = async (
    marketId: string,
    outcome: Outcome,
    amount: string
  ) => {
    try {
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              placeBet(
                marketChain: "${APP_IDS.CHAIN}"
                marketId: ${marketId}
                outcome: ${outcome.toUpperCase()}
                amount: "${parseAmount(amount)}"
              )
            }`,
          }),
        }
      );

      const data = await response.json();
      if (data.errors) {
        console.error('Bet placement failed:', data.errors);
        throw new Error(data.errors[0]?.message || 'Failed to place bet');
      }

      // Refresh market data
      await fetchMarket();
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  };

  if (loading && !market) {
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
        <button onClick={fetchMarket} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!market) {
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
        <h2 className="text-2xl font-bold text-gray-900">Active Markets</h2>
        <button onClick={fetchMarket} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      <MarketCard market={market} onPlaceBet={handlePlaceBet} />
    </div>
  );
}
