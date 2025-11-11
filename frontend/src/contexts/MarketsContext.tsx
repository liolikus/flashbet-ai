import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { MarketState } from '../types';
import { APP_IDS, BASE_URL } from '../config/apollo';

interface MarketsContextType {
  markets: MarketState[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getMarketByEventId: (eventId: string) => MarketState | undefined;
}

const MarketsContext = createContext<MarketsContextType | undefined>(undefined);

const REFRESH_INTERVAL = 3000; // 3 seconds

export function MarketsProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<MarketState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setError(null);

      // Step 1: Get all market event IDs
      const allMarketsResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ allMarkets }' }),
        }
      );

      const allMarketsData = await allMarketsResponse.json();

      if (allMarketsData.errors) {
        throw new Error(allMarketsData.errors[0]?.message || 'Failed to fetch markets');
      }

      if (!allMarketsData.data?.allMarkets) {
        setMarkets([]);
        return;
      }

      const eventIds: string[] = allMarketsData.data.allMarkets;

      if (eventIds.length === 0) {
        setMarkets([]);
        return;
      }

      // Step 2: Fetch each market individually by eventId
      const marketStates: MarketState[] = [];

      for (const eventId of eventIds) {
        try {
          const response = await fetch(
            `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `{
                  eventId(eventId: "${eventId}")
                  description(eventId: "${eventId}")
                  homeTeam(eventId: "${eventId}")
                  awayTeam(eventId: "${eventId}")
                  eventTime(eventId: "${eventId}")
                  status(eventId: "${eventId}")
                  isResolved(eventId: "${eventId}")
                  isOpen(eventId: "${eventId}")
                  totalPool(eventId: "${eventId}")
                  homePool(eventId: "${eventId}")
                  awayPool(eventId: "${eventId}")
                  drawPool(eventId: "${eventId}")
                  betCount(eventId: "${eventId}")
                  homeOdds(eventId: "${eventId}")
                  awayOdds(eventId: "${eventId}")
                  drawOdds(eventId: "${eventId}")
                }`,
              }),
            }
          );

          const data = await response.json();

          if (data.data) {
            const rawData = data.data;
            const marketState: MarketState = {
              info: {
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
            marketStates.push(marketState);
          }
        } catch (err) {
          console.error(`Failed to fetch market ${eventId}:`, err);
          // Continue with other markets
        }
      }

      setMarkets(marketStates);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to get market by eventId
  const getMarketByEventId = useCallback(
    (eventId: string) => {
      return markets.find((m) => m.info.eventId === eventId);
    },
    [markets]
  );

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return (
    <MarketsContext.Provider
      value={{
        markets,
        loading,
        error,
        refetch: fetchMarkets,
        getMarketByEventId,
      }}
    >
      {children}
    </MarketsContext.Provider>
  );
}

export function useMarkets() {
  const context = useContext(MarketsContext);
  if (context === undefined) {
    throw new Error('useMarkets must be used within a MarketsProvider');
  }
  return context;
}
