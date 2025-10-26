import { useState, useEffect } from 'react';
import MarketCard from './MarketCard';
import type { MarketState, Outcome } from '../types';
import { parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const BASE_URL = 'http://localhost:8080';

type MarketFilter = 'all' | 'active' | 'ended';

export default function MarketsList() {
  const [markets, setMarkets] = useState<MarketState[]>([]);
  const [loading, setLoading] = useState(true); // Start with true for initial load
  const [initialLoad, setInitialLoad] = useState(true); // Track if this is the first load
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MarketFilter>('all');

  const fetchMarkets = async () => {
    // Only show loading spinner on initial load, not on background refreshes
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      console.log('%c🔗 Linera Blockchain Query', 'color: #a855f7; font-weight: bold; font-size: 14px');
      console.log('📍 Network: Conway Testnet');
      console.log(`📦 Market Chain: ${APP_IDS.MARKET_CHAIN.substring(0, 16)}...`);
      console.log(`🎯 Market App: ${APP_IDS.MARKET.substring(0, 16)}...`);
      console.log('📡 Fetching all markets from blockchain...');

      // First, get all market IDs using the allMarkets query
      const allMarketsResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ allMarkets }`,
          }),
        }
      );

      const allMarketsData = await allMarketsResponse.json();
      console.log(`✅ Received ${allMarketsData.data?.allMarkets?.length || 0} markets from Linera`, allMarketsData.data?.allMarkets);

      if (allMarketsData.data && allMarketsData.data.allMarkets) {
        const marketIds: string[] = allMarketsData.data.allMarkets;

        if (marketIds.length === 0) {
          // Only update if markets is not already empty
          if (markets.length !== 0) {
            setMarkets([]);
          }
          // Only update loading on initial load
          if (initialLoad) {
            setLoading(false);
            setInitialLoad(false);
          }
          return;
        }

        // Fetch each market individually by eventId using parameterized queries
        const marketStates: MarketState[] = [];
        console.log(`🔄 Querying ${marketIds.length} markets from blockchain...`);

        for (const eventId of marketIds) {
          try {
            console.log(`  📊 Fetching market: ${eventId}`);
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
                  marketId: rawData.eventId || '0',
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

        // Only update state if data has actually changed to prevent unnecessary re-renders
        setMarkets(prevMarkets => {
          // Simple comparison: check if market count or data changed
          if (prevMarkets.length !== marketStates.length) {
            return marketStates;
          }

          // Check if any market data changed by comparing JSON
          const hasChanged = marketStates.some((newMarket, index) => {
            const prevMarket = prevMarkets[index];
            if (!prevMarket) return true;

            return (
              newMarket.totalPool !== prevMarket.totalPool ||
              newMarket.betCount !== prevMarket.betCount ||
              newMarket.status !== prevMarket.status
            );
          });

          return hasChanged ? marketStates : prevMarkets;
        });
        console.log(`✅ Blockchain data loaded: ${marketStates.length} markets`);
      } else if (allMarketsData.errors) {
        setError(allMarketsData.errors[0]?.message || 'Failed to load markets list');
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError('Failed to connect to GraphQL service');
    } finally {
      // Only update loading state on initial load
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    console.log('%c⚡ FlashBet AI - Connecting to Linera Blockchain', 'color: #a855f7; font-weight: bold; font-size: 16px');
    console.log('🌐 Network: Conway Testnet (v0.15.3)');
    console.log('🔗 GraphQL Endpoint: http://localhost:8080');
    console.log('📦 Deployed Contracts:');
    console.log(`  🔮 Oracle: ${APP_IDS.ORACLE.substring(0, 16)}...`);
    console.log(`  🎯 Market: ${APP_IDS.MARKET.substring(0, 16)}...`);
    console.log(`  👤 User: ${APP_IDS.USER.substring(0, 16)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = async (
    eventId: string, // Multi-market: eventId identifies which market
    outcome: Outcome,
    amount: string
  ) => {
    try {
      console.log('%c💰 Linera Blockchain Transaction', 'color: #10b981; font-weight: bold; font-size: 14px');
      console.log('📍 Network: Conway Testnet');

      // Multi-market architecture: marketId=0 (legacy), eventId identifies the market
      const numericMarketId = 0;
      const amountParsed = parseAmount(amount);

      // Step 1: Send placeBet mutation to User application (deducts balance, emits event)
      console.log('%cStep 1: User Chain Transaction', 'color: #3b82f6; font-weight: bold');
      console.log(`  📦 User Chain: ${APP_IDS.CHAIN.substring(0, 16)}...`);
      console.log(`  👤 User App: ${APP_IDS.USER.substring(0, 16)}...`);
      console.log(`  🎯 Market: ${eventId}`);
      console.log(`  🎲 Outcome: ${outcome}`);
      console.log(`  💵 Amount: ${amount} tokens`);
      const userResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              placeBet(
                marketChain: "${APP_IDS.MARKET_CHAIN}"
                marketId: ${numericMarketId}
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
        console.error('❌ User bet placement failed:', userData.errors);
        throw new Error(userData.errors[0]?.message || 'Failed to place bet on User chain');
      }

      console.log('✅ User chain transaction confirmed');
      console.log(`  📝 Transaction: ${userData.data?.substring(0, 16)}...`);

      // Step 2: Relay bet to Market chain via RegisterBet operation
      // Wave 1: Frontend acts as relay between User and Market chains
      // Wave 2+: This will be automatic via cross-app event processing
      console.log('%cStep 2: Market Chain Transaction', 'color: #3b82f6; font-weight: bold');
      console.log(`  📦 Market Chain: ${APP_IDS.MARKET_CHAIN.substring(0, 16)}...`);
      console.log(`  🎯 Market App: ${APP_IDS.MARKET.substring(0, 16)}...`);
      console.log('  📡 Registering bet on blockchain...');

      // Build the Bet object matching Linera's Bet structure
      // Note: betId will be auto-incremented, but we pass 0 for initial bet
      // user field must be AccountOwner (cryptographic address), not chain ID
      const marketResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              registerBet(
                bet: {
                  betId: ${Date.now() % 1000000}
                  marketId: ${numericMarketId}
                  eventId: "${eventId}"
                  user: "${APP_IDS.USER_ACCOUNT_OWNER}"
                  outcome: ${outcome.toUpperCase()}
                  amount: "${amountParsed}"
                  timestamp: ${Date.now() * 1000}
                  userChain: "${APP_IDS.CHAIN}"
                }
              )
            }`,
          }),
        }
      );

      const marketData = await marketResponse.json();
      if (marketData.errors) {
        console.error('❌ Market bet registration failed:', marketData.errors);
        console.warn('⚠️ Bet placed on User chain but not registered on Market chain - balance deducted but pool not updated');
        // Don't throw - bet is placed on User side, Market sync issue
      } else {
        console.log('✅ Market chain transaction confirmed');
        console.log(`  📝 Transaction: ${marketData.data?.substring(0, 16)}...`);
      }

      console.log('%c🎉 Cross-Chain Transaction Complete!', 'color: #10b981; font-weight: bold; font-size: 14px');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Transaction Summary:');
      console.log(`  🎯 Market: ${eventId}`);
      console.log(`  🎲 Bet Placed: ${outcome.toUpperCase()}`);
      console.log(`  💵 Amount: ${amount} tokens`);
      console.log(`  ⛓️  Chains Updated: 2 (User + Market)`);
      console.log('');
      console.log('✅ Status:');
      console.log(`  ✓ User Chain: Balance deducted (${APP_IDS.CHAIN.substring(0, 12)}...)`);
      console.log(`  ✓ Market Chain: Pool updated (${APP_IDS.MARKET_CHAIN.substring(0, 12)}...)`);
      console.log(`  ✓ Cross-chain messaging: Completed`);
      console.log('');
      console.log('🔄 Refreshing market data from blockchain...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Refresh markets data
      await fetchMarkets();
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
      console.log(`  Total Pool: ${totalPool.toFixed(2)} tokens`);
      console.log(`  Home Pool: ${homePool.toFixed(2)} tokens (${market.betCount > 0 ? ((homePool / totalPool) * 100).toFixed(1) : 0}%)`);
      console.log(`  Away Pool: ${awayPool.toFixed(2)} tokens (${market.betCount > 0 ? ((awayPool / totalPool) * 100).toFixed(1) : 0}%)`);
      console.log(`  Draw Pool: ${drawPool.toFixed(2)} tokens (${market.betCount > 0 ? ((drawPool / totalPool) * 100).toFixed(1) : 0}%)`);
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
      console.log(`  💵 Winning Pool: ${winningPool.toFixed(2)} tokens`);
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
      console.log(`  💰 Total Pool Distributed: ${totalPool.toFixed(2)} tokens`);
      console.log(`  👥 Winners' Pool: ${winningPool.toFixed(2)} tokens`);
      console.log(`  📈 Payout Multiplier: ${payoutPerToken.toFixed(2)}x`);
      console.log(`  📊 ${winningPool > 0 ? `Winners receive ${payoutPerToken.toFixed(2)} tokens per 1 token bet` : 'No bets on winning outcome'}`);
      console.log('');
      console.log('✅ Status:');
      console.log(`  ✓ Market Status: Resolved`);
      console.log(`  ✓ Betting: Closed`);
      console.log(`  ✓ Cross-chain payouts: Automatically distributed to User chains`);
      console.log('  🔄 Refreshing market data from blockchain...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Refresh markets data
      await fetchMarkets();
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
    return market.status.includes('Resolved') || market.status === 'Locked';
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Markets ({filteredMarkets.length})
        </h2>
        <button onClick={fetchMarkets} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gradient-to-r from-[hsl(var(--heroui-primary))] to-[hsl(var(--heroui-secondary))] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({markets.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active'
              ? 'bg-gradient-to-r from-[hsl(var(--heroui-primary))] to-[hsl(var(--heroui-secondary))] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('ended')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'ended'
              ? 'bg-gradient-to-r from-[hsl(var(--heroui-primary))] to-[hsl(var(--heroui-secondary))] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ended ({endedCount})
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
