import { useState } from 'react';
import type { MarketState, Outcome as OutcomeType } from '../types';
import { Outcome } from '../types';
import { formatAmount, calculateOdds, getOutcomeDisplay, getStatusColor, formatRelativeTime } from '../utils/helpers';

interface MarketCardProps {
  market: MarketState;
  onPlaceBet: (marketId: string, outcome: OutcomeType, amount: string) => Promise<void>;
}

export default function MarketCard({ market, onPlaceBet }: MarketCardProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);

  const odds = calculateOdds(market.pools, market.totalPool);
  const isOpen = market.status === 'Open';

  const handlePlaceBet = async () => {
    if (!selectedOutcome || !betAmount) return;

    setPlacing(true);
    try {
      await onPlaceBet(market.info.marketId, selectedOutcome, betAmount);
      setBetAmount('');
      setSelectedOutcome(null);
    } catch (error) {
      console.error('Bet placement failed:', error);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Market Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {market.info.description}
            </h3>
            <p className="text-sm text-gray-500">ID: {market.info.marketId}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(market.status)}`}>
            {market.status}
          </span>
        </div>

        {/* Event Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>📅 {formatRelativeTime(market.info.eventTime)}</span>
          <span>🔒 Closes {formatRelativeTime(market.info.closeTime)}</span>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div>
          <div className="text-sm text-gray-600">Total Pool</div>
          <div className="text-lg font-bold text-gray-900">
            {formatAmount(market.totalPool)} tokens
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total Bets</div>
          <div className="text-lg font-bold text-gray-900">
            {market.betCount}
          </div>
        </div>
      </div>

      {/* Outcomes */}
      <div className="space-y-2 mb-4">
        {Object.values(Outcome).map((outcome) => {
          const pool = market.pools[outcome] || '0';
          const isSelected = selectedOutcome === outcome;

          return (
            <button
              key={outcome}
              onClick={() => isOpen && setSelectedOutcome(outcome)}
              disabled={!isOpen}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              } ${!isOpen && 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{getOutcomeDisplay(outcome)}</span>
                  {market.winningOutcome === outcome && (
                    <span className="text-green-600 font-bold">✓ Winner</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {odds[outcome].toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">
                    Pool: {formatAmount(pool)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bet Form */}
      {isOpen && selectedOutcome && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bet Amount for {getOutcomeDisplay(selectedOutcome)}
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <button
              onClick={handlePlaceBet}
              disabled={placing || !betAmount}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placing ? 'Placing...' : 'Place Bet'}
            </button>
          </div>
          {betAmount && (
            <p className="text-sm text-gray-600 mt-2">
              Potential payout: {(parseFloat(betAmount) * odds[selectedOutcome]).toFixed(2)} tokens
              (at current odds)
            </p>
          )}
        </div>
      )}

      {!isOpen && (
        <div className="text-center py-4 text-gray-500">
          {market.status === 'Resolved' && market.winningOutcome
            ? `Market resolved - ${getOutcomeDisplay(market.winningOutcome)} won!`
            : `Market is ${market.status.toLowerCase()}`}
        </div>
      )}
    </div>
  );
}
