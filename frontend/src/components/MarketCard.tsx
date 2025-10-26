import { useState } from 'react';
import type { MarketState, Outcome as OutcomeType } from '../types';
import { Outcome } from '../types';
import { formatAmount, calculateOdds, getOutcomeDisplay, formatRelativeTime } from '../utils/helpers';

interface MarketCardProps {
  market: MarketState;
  onPlaceBet: (marketId: string, outcome: OutcomeType, amount: string) => Promise<void>;
  onCloseMarket: (eventId: string) => Promise<void>;
}

export default function MarketCard({ market, onPlaceBet, onCloseMarket }: MarketCardProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [closing, setClosing] = useState(false);

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

  const handleCloseMarket = async () => {
    setClosing(true);
    try {
      await onCloseMarket(market.info.eventId);
    } catch (error) {
      console.error('Market close failed:', error);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow" style={{ padding: '0.875rem' }}>
      {/* Market Header */}
      <div className="mb-2">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--heroui-foreground))' }}>
              {market.info.description}
            </h3>
            <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>ID: {market.info.marketId}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-${market.status.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
              {market.status}
            </span>
            {isOpen && (
              <button
                onClick={handleCloseMarket}
                disabled={closing}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                title="Resolve market with random outcome (demo)"
              >
                {closing ? '⚡...' : '⚡ Resolve'}
              </button>
            )}
          </div>
        </div>

        {/* Event Info */}
        <div className="flex items-center space-x-2 text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
          <span>📅 {formatRelativeTime(market.info.eventTime)}</span>
          <span>🔒 Closes {formatRelativeTime(market.info.closeTime)}</span>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-2 mb-2 p-2 rounded-lg" style={{ background: 'hsl(var(--heroui-content2))' }}>
        <div>
          <div className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>Total Pool</div>
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--heroui-foreground))' }}>
            {formatAmount(market.totalPool)} tokens
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>Total Bets</div>
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--heroui-foreground))' }}>
            {market.betCount}
          </div>
        </div>
      </div>

      {/* Outcomes */}
      <div className="space-y-1 mb-2">
        {Object.values(Outcome).map((outcome) => {
          const pool = market.pools[outcome] || '0';
          const isSelected = selectedOutcome === outcome;

          return (
            <button
              key={outcome}
              onClick={() => isOpen && setSelectedOutcome(outcome)}
              disabled={!isOpen}
              className={`outcome-button w-full ${isSelected ? 'selected' : ''}`}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{getOutcomeDisplay(outcome, market.info.homeTeam, market.info.awayTeam)}</span>
                  {market.winningOutcome === outcome && (
                    <span className="font-bold text-xs" style={{ color: 'hsl(var(--heroui-success))' }}>✓ Winner</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-bold" style={{ color: 'hsl(var(--heroui-primary))' }}>
                    {odds[outcome].toFixed(2)}x
                  </div>
                  <div className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
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
        <div className="border-t pt-2 mt-2" style={{ borderColor: 'hsl(var(--heroui-default-200))' }}>
          <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--heroui-foreground))' }}>
            Bet Amount for {getOutcomeDisplay(selectedOutcome, market.info.homeTeam, market.info.awayTeam)}
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1"
              style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
              min="0"
              step="0.01"
            />
            <button
              onClick={handlePlaceBet}
              disabled={placing || !betAmount}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
            >
              {placing ? 'Placing...' : 'Place Bet'}
            </button>
          </div>
          {betAmount && (
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
              Potential payout: {(parseFloat(betAmount) * odds[selectedOutcome]).toFixed(2)} tokens
              (at current odds)
            </p>
          )}
        </div>
      )}

      {!isOpen && (
        <div className="text-center py-2 text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
          {market.status === 'Resolved' && market.winningOutcome
            ? `Market resolved - ${getOutcomeDisplay(market.winningOutcome, market.info.homeTeam, market.info.awayTeam)} won!`
            : `Market is ${market.status.toLowerCase()}`}
        </div>
      )}
    </div>
  );
}
