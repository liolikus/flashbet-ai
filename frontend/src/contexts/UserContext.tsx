import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { APP_IDS, BASE_URL } from '../config/apollo';

interface UserContextType {
  balance: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isInitialized: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const REFRESH_INTERVAL = 3000; // 3 seconds

export function UserProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      setError(null);

      // Query User application for balance (User app calls BET token internally)
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '{ balance }',
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Failed to fetch balance');
      }

      if (data.data?.balance) {
        setBalance(data.data.balance);
      } else {
        // If no balance found, default to 0
        setBalance('0.');
      }

      if (!isInitialized) {
        setIsInitialized(true);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance('0.');
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return (
    <UserContext.Provider
      value={{
        balance,
        loading,
        error,
        refetch: fetchBalance,
        isInitialized,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
