import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { APP_IDS, BASE_URL } from '../config/apollo';

interface TokenContextType {
  tickerSymbol: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [tickerSymbol, setTickerSymbol] = useState('BET'); // Default fallback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickerSymbol = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ tickerSymbol }' }),
        }
      );

      const data = await response.json();

      if (data.data?.tickerSymbol) {
        setTickerSymbol(data.data.tickerSymbol);
      } else {
        console.warn('Failed to fetch ticker symbol, using default: BET');
      }
    } catch (err) {
      console.error('Error fetching ticker symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ticker symbol');
      // Keep default 'BET' on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickerSymbol();
  }, []);

  return (
    <TokenContext.Provider
      value={{
        tickerSymbol,
        loading,
        error,
        refetch: fetchTickerSymbol,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}
