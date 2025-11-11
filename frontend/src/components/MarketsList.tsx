import { useState } from 'react';
import MarketCard from './MarketCard';
import type { Outcome } from '../types';
import { parseAmount } from '../utils/helpers';
import { APP_IDS, BASE_URL } from '../config/apollo';
import { useToken } from '../contexts/TokenContext';
import { useMarkets } from '../contexts/MarketsContext';

type MarketFilter = 'all' | 'active' | 'ended';

export default function MarketsList() {
  const { tickerSymbol } = useToken();
  const { markets, loading, error, refetch } = useMarkets();
  const [filter, setFilter] = useState<MarketFilter>('active'); // Default to active markets

  const handlePlaceBet = async (
    eventId: string, // Multi-market: eventId identifies which market
    outcome: Outcome,
    amount: string
  ) => {
    try {
      console.log('%c💰 Placing Bet via Linera Cross-Chain Messaging', 'color: #10b981; font-weight: bold; font-size: 14px');
      console.log('📍 Network: Conway Testnet');

      // Multi-market architecture: eventId is the primary key for markets
      const amountParsed = parseAmount(amount);

      // Send placeBet mutation to User application
      // User app will:
      // 1. Transfer BET tokens to Market chain via cross-application call
      // 2. Send PlaceBet message to Market chain via Linera messaging
      // 3. Market chain will process message automatically in execute_message()
      console.log(`  📦 User Chain: ${APP_IDS.CHAIN.substring(0, 16)}...`);
      console.log(`  👤 User App: ${APP_IDS.USER.substring(0, 16)}...`);
      console.log(`  🎯 Market: ${eventId}`);
      console.log(`  🎲 Outcome: ${outcome}`);
      console.log(`  💵 Amount: ${amount} ${tickerSymbol}`);

      const userResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              placeBet(
                marketChain: "${APP_IDS.MARKET_CHAIN}"
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
        console.error('❌ Bet placement failed:', userData.errors);
        throw new Error(userData.errors[0]?.message || 'Failed to place bet');
      }

      console.log('✅ Bet placed successfully');
      console.log(`  📝 Transaction: ${userData.data?.substring(0, 16)}...`);
      console.log('');
      console.log('%cℹ️ Cross-Chain Message Delivery', 'color: #3b82f6; font-weight: bold');
      console.log('  🔄 Linera runtime is delivering your bet to the Market chain...');
      console.log('  📡 Market chain will process the bet automatically');
      console.log('  ⏱️ This may take a few seconds');
      console.log('');
      console.log('🔄 Refreshing market data...');

      // Refresh markets data after a short delay to allow cross-chain message delivery
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refetch();

      console.log('✅ Bet placement complete!');
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  };

  const handleCloseMarket = async (eventId: string) => {
    try {
      console.log('%c🔒 Linera Blockchain - Resolve & Close Market', 'color: #f59e0b; font-weight: bold; font-size: 14px');
      console.log('📍 Network: Conway Testnet');
      console.log(`📦 Market Chain: ${APP_IDS.MARKET_CHAIN.substring(0, 16)}...`);
      console.log(`🎯 Market App: ${APP_IDS.MARKET.substring(0, 16)}...`);
      console.log(`🎲 Market ID: ${eventId}`);

      // First, fetch current market state to show pool amounts
      console.log('📊 Fetching current market state...');
      const market = markets.find(m => m.info.eventId === eventId);
      if (!market) {
        throw new Error('Market not found');
      }

      const totalPool = parseFloat(market.totalPool) / 1e18;
      const homePool = parseFloat(market.pools.Home) / 1e18;
      const awayPool = parseFloat(market.pools.Away) / 1e18;
      const drawPool = parseFloat(market.pools.Draw) / 1e18;

      console.log('');
      console.log('💰 Current Pool State:');
      console.log(`  Total Pool: ${totalPool.toFixed(2)} ${tickerSymbol}`);
      console.log(`  Home Pool: ${homePool.toFixed(2)} ${tickerSymbol} (${market.betCount > 0 ? ((homePool / totalPool) * 100).toFixed(1) : 0}%)`);
      console.log(`  Away Pool: ${awayPool.toFixed(2)} ${tickerSymbol} (${market.betCount > 0 ? ((awayPool / totalPool) * 100).toFixed(1) : 0}%)`);
      console.log(`  Draw Pool: ${drawPool.toFixed(2)} ${tickerSymbol} (${market.betCount > 0 ? ((drawPool / totalPool) * 100).toFixed(1) : 0}%)`);
      console.log(`  Total Bets: ${market.betCount}`);

      // For demo: randomly select a winning outcome
      const outcomes = ['HOME', 'AWAY', 'DRAW'];
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const timestamp = Date.now() * 1000; // Convert to microseconds

      // Calculate winning pool
      const winningPool = randomOutcome === 'HOME' ? homePool : randomOutcome === 'AWAY' ? awayPool : drawPool;
      const payoutPerToken = winningPool > 0 ? totalPool / winningPool : 0;

      console.log('');
      console.log('📡 Publishing oracle result to resolve market...');
      console.log(`  🎯 Demo Result: ${randomOutcome} wins (simulated)`);
      console.log(`  💵 Winning Pool: ${winningPool.toFixed(2)} ${tickerSymbol}`);
      console.log(`  📈 Payout Ratio: ${payoutPerToken.toFixed(2)}x`);

      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              processOracleResult(result: {
                eventId: "${eventId}"
                outcome: ${randomOutcome}
                score: null
                timestamp: ${timestamp}
              })
            }`,
          }),
        }
      );

      const data = await response.json();
      if (data.errors) {
        console.error('❌ Failed to resolve market:', data.errors);
        throw new Error(data.errors[0]?.message || 'Failed to resolve market');
      }

      console.log('');
      console.log('✅ Oracle result published successfully');
      console.log(`  📝 Transaction: ${JSON.stringify(data.data).substring(0, 30)}...`);
      console.log('%c🎉 Market Resolved & Closed!', 'color: #10b981; font-weight: bold; font-size: 14px');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Resolution Summary:');
      console.log(`  🎲 Market: ${eventId}`);
      console.log(`  🏆 Winner: ${randomOutcome}`);
      console.log(`  💰 Total Pool Distributed: ${totalPool.toFixed(2)} ${tickerSymbol}`);
      console.log(`  👥 Winners' Pool: ${winningPool.toFixed(2)} ${tickerSymbol}`);
      console.log(`  📈 Payout Multiplier: ${payoutPerToken.toFixed(2)}x`);
      console.log(`  📊 ${winningPool > 0 ? `Winners receive ${payoutPerToken.toFixed(2)} ${tickerSymbol} per 1 ${tickerSymbol} bet` : 'No bets on winning outcome'}`);
      console.log('');
      console.log('✅ Status:');
      console.log(`  ✓ Market Status: Resolved`);
      console.log(`  ✓ Betting: Closed`);
      console.log('');
      console.log('%cℹ️ Automatic Payout Distribution', 'color: #3b82f6; font-weight: bold');
      console.log('  💸 Market contract is automatically distributing payouts...');
      console.log('  🔄 BET tokens will be transferred to winners automatically');
      console.log('  ⏱️ Payouts may take a few seconds to arrive');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Refresh markets data after a delay to allow automatic payout processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      await refetch();
    } catch (error) {
      console.error('❌ Failed to resolve market:', error);
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

  // Filter markets based on status
  const isMarketEnded = (market: MarketState) => {
    // Market is ended if it's Resolved (any outcome), Locked, or Cancelled
    return market.status.includes('Resolved') ||
           market.status === 'Locked' ||
           market.status === 'Cancelled';
  };

  const filteredMarkets = markets.filter(market => {
    if (filter === 'all') return true;
    if (filter === 'active') return !isMarketEnded(market);
    if (filter === 'ended') return isMarketEnded(market);
    return true;
  });

  const activeCount = markets.filter(m => !isMarketEnded(m)).length;
  const endedCount = markets.filter(m => isMarketEnded(m)).length;

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`btn-secondary text-sm ${
            filter === 'all' ? 'opacity-100' : 'opacity-70'
          }`}
          style={{
            background: filter === 'all'
              ? 'linear-gradient(135deg, hsl(var(--heroui-primary)) 0%, hsl(var(--heroui-secondary)) 100%)'
              : undefined,
            color: filter === 'all' ? '#ffffff' : undefined,
            fontWeight: filter === 'all' ? '600' : undefined
          }}
        >
          All ({markets.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`btn-secondary text-sm ${
            filter === 'active' ? 'opacity-100' : 'opacity-70'
          }`}
          style={{
            background: filter === 'active'
              ? 'linear-gradient(135deg, hsl(var(--heroui-primary)) 0%, hsl(var(--heroui-secondary)) 100%)'
              : undefined,
            color: filter === 'active' ? '#ffffff' : undefined,
            fontWeight: filter === 'active' ? '600' : undefined
          }}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('ended')}
          className={`btn-secondary text-sm ${
            filter === 'ended' ? 'opacity-100' : 'opacity-70'
          }`}
          style={{
            background: filter === 'ended'
              ? 'linear-gradient(135deg, hsl(var(--heroui-primary)) 0%, hsl(var(--heroui-secondary)) 100%)'
              : undefined,
            color: filter === 'ended' ? '#ffffff' : undefined,
            fontWeight: filter === 'ended' ? '600' : undefined
          }}
        >
          Ended ({endedCount})
        </button>
        <button onClick={fetchMarkets} className="btn-secondary text-sm ml-auto">
          Refresh
        </button>
      </div>

      {/* Market Cards - 2 Column Grid */}
      {filteredMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMarkets.map((market, index) => (
            <MarketCard key={market.info.eventId || index} market={market} onPlaceBet={handlePlaceBet} onCloseMarket={handleCloseMarket} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-600 mb-2">No {filter} markets found</p>
          <p className="text-sm text-gray-500">
            Try selecting a different filter
          </p>
        </div>
      )}
    </div>
  );
}
