import { useState, useEffect } from 'react';
import { formatAmount, parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const BASE_URL = 'http://localhost:8080';

export default function UserBalance() {
  const [balance, setBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositing, setDepositing] = useState(false);

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

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    setDepositing(true);
    try {
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { deposit(amount: "${parseAmount(depositAmount)}") }`,
          }),
        }
      );
      const data = await response.json();
      if (!data.errors) {
        setDepositAmount('');
        setIsDepositOpen(false);
        await fetchBalance();
      } else {
        console.error('Deposit failed:', data.errors);
      }
    } catch (error) {
      console.error('Deposit failed:', error);
    } finally {
      setDepositing(false);
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
            onClick={() => setIsDepositOpen(!isDepositOpen)}
            className="btn-secondary text-sm"
          >
            {isDepositOpen ? 'Cancel' : 'Deposit'}
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
              <div className="text-sm mt-1" style={{ opacity: 0.8 }}>tokens</div>
            </div>
          )}
        </div>

        {/* Deposit Form */}
        {isDepositOpen && (
          <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--heroui-default-200))' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--heroui-foreground))' }}>
              Deposit Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1"
                min="0"
                step="0.01"
              />
              <button
                onClick={handleDeposit}
                disabled={depositing || !depositAmount}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {depositing ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
              Note: This will add tokens to your User Chain balance
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
