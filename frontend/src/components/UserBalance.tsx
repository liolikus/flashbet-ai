import { useState, useEffect } from 'react';
import { formatAmount, parseAmount } from '../utils/helpers';
import { APP_IDS, BASE_URL } from '../config/apollo';
import { useToken } from '../contexts/TokenContext';

export default function UserBalance() {
  const { tickerSymbol } = useToken();
  const [balance, setBalance] = useState('0');
  const [transferAmount, setTransferAmount] = useState('');
  const [targetChain, setTargetChain] = useState('');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ balance }' }),
        }
      );
      const data = await response.json();
      if (data.data?.balance) {
        setBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTransfer = async (destinationChain?: string) => {
    const chainToUse = destinationChain || targetChain;
    if (!transferAmount || parseFloat(transferAmount) <= 0 || !chainToUse) return;

    setTransferring(true);
    try {
      // Native token transfer using runtime.transfer()
      // Note: This requires a Transfer operation to be added to the backend
      // For now, display info about native tokens
      console.log(`Transfer ${transferAmount} ${tickerSymbol} to chain ${chainToUse}`);

      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { transfer(toChain: "${chainToUse}", amount: "${parseAmount(transferAmount)}") }`,
          }),
        }
      );
      const data = await response.json();
      if (!data.errors) {
        setTransferAmount('');
        setTargetChain('');
        setIsTransferOpen(false);
        await fetchBalance();
      } else {
        console.error('Transfer failed:', data.errors);
        alert(`Transfer failed: ${JSON.stringify(data.errors)}`);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      alert(`Transfer error: ${error}`);
    } finally {
      setTransferring(false);
    }
  };

  const categories = [
    { id: 'trending', name: 'Trending' },
    { id: 'f1', name: 'F1 Grand Prix 2025' },
    { id: 'ucl', name: 'Champions League 2025' },
    { id: 'epl', name: 'Premier League 2025' },
    { id: 'mlb', name: 'MLB World Series' },
    { id: 'nba', name: 'NBA 2025' },
    { id: 'nfl', name: 'NFL Playoffs' },
    { id: 'boxing', name: 'Boxing' },
    { id: 'cricket', name: 'Cricket World Cup' },
  ];

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--heroui-foreground))' }}>Your Balance</h2>
            <p className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>Chain: {APP_IDS.CHAIN.slice(0, 8)}...</p>
          </div>
          <button
            onClick={() => setIsTransferOpen(!isTransferOpen)}
            className="btn-secondary text-sm"
          >
            {isTransferOpen ? 'Cancel' : 'Transfer'}
          </button>
        </div>

        {/* Balance Display */}
        <div className="mb-4">
          {loading && balance === '0' ? (
            <div className="skeleton" style={{ height: '4rem', borderRadius: '8px' }}></div>
          ) : (
            <div className="balance-display">
              <div className="text-4xl font-bold">
                {formatAmount(balance)}
              </div>
              <div className="text-sm mt-1" style={{ opacity: 0.8 }}>{tickerSymbol}</div>
            </div>
          )}
        </div>

        {/* Transfer Form */}
        {isTransferOpen && (
          <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--heroui-default-200))' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--heroui-foreground))' }}>
              Transfer {tickerSymbol} to Market Chain
            </label>
            <p className="text-xs mb-3" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
              Transfer tokens to the Market Chain to place bets
            </p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>Amount</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <button
              onClick={() => handleTransfer(APP_IDS.MARKET_CHAIN)}
              disabled={transferring || !transferAmount || parseFloat(transferAmount) <= 0}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transferring ? 'Transferring...' : `Transfer to Market Chain`}
            </button>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
              Destination: {APP_IDS.MARKET_CHAIN.slice(0, 8)}...{APP_IDS.MARKET_CHAIN.slice(-6)}
            </p>
          </div>
        )}
      </div>

      {/* Categories Navigation */}
      <div className="card mt-4" style={{ padding: '0.75rem' }}>
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              disabled
              className="px-3 py-2 rounded-lg text-left transition-all cursor-not-allowed"
              style={{
                background: 'hsl(var(--heroui-content2))',
                color: 'hsl(var(--heroui-foreground-400))',
                fontWeight: '400',
                fontSize: '0.875rem',
                border: '1px solid hsl(var(--heroui-default-200))',
                opacity: 0.6
              }}
            >
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
