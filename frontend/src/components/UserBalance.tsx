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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Balance</h2>
          <p className="text-sm text-gray-500">Chain: {APP_IDS.CHAIN.slice(0, 8)}...</p>
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
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-4xl font-bold text-blue-600">
              {formatAmount(balance)}
            </div>
            <div className="text-sm text-gray-600 mt-1">tokens</div>
          </div>
        )}
      </div>

      {/* Deposit Form */}
      {isDepositOpen && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deposit Amount
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-xs text-gray-500 mt-2">
            Note: This will add tokens to your User Chain balance
          </p>
        </div>
      )}
    </div>
  );
}
