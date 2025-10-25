import axios from 'axios';
import { config } from '../config';
import type { GameResult } from '../api/mockSportsData';

interface EventResult {
  eventId: string;
  outcome: 'HOME' | 'AWAY' | 'DRAW';
  score: { home: number; away: number } | null;
  timestamp: number;
}

/**
 * Publish an oracle result to the Oracle Chain via GraphQL
 */
export async function publishOracleResult(
  result: EventResult
): Promise<boolean> {
  try {
    const endpoint = `${config.lineraGraphqlUrl}/chains/${config.oracleChainId}/applications/${config.oracleAppId}`;

    const scoreParam = result.score
      ? `{home: ${result.score.home}, away: ${result.score.away}}`
      : 'null';

    const mutation = `
      mutation {
        publishResult(
          result: {
            eventId: "${result.eventId}"
            outcome: ${result.outcome}
            score: ${scoreParam}
            timestamp: ${result.timestamp}
          }
        )
      }
    `;

    console.log(`📡 Publishing result for ${result.eventId}...`);

    const response = await axios.post(endpoint, {
      query: mutation,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.errors) {
      console.error('❌ Oracle publication failed:', response.data.errors);
      return false;
    }

    console.log(`✅ Oracle result published: ${result.eventId} → ${result.outcome}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to publish oracle result:', error);
    return false;
  }
}

/**
 * Process oracle result on Market Chain (triggers market resolution & payouts)
 */
export async function processResultOnMarket(
  result: EventResult
): Promise<boolean> {
  try {
    const endpoint = `${config.lineraGraphqlUrl}/chains/${config.marketChainId}/applications/${config.marketAppId}`;

    const scoreParam = result.score
      ? `{home: ${result.score.home}, away: ${result.score.away}}`
      : 'null';

    const mutation = `
      mutation {
        processOracleResult(
          result: {
            eventId: "${result.eventId}"
            outcome: ${result.outcome}
            score: ${scoreParam}
            timestamp: ${result.timestamp}
          }
        )
      }
    `;

    console.log(`🎯 Processing result on Market Chain for ${result.eventId}...`);

    const response = await axios.post(endpoint, {
      query: mutation,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.errors) {
      console.error('❌ Market processing failed:', response.data.errors);
      return false;
    }

    console.log(`✅ Market resolved: ${result.eventId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to process result on Market:', error);
    return false;
  }
}

/**
 * Distribute payouts to winners (queries market for bets, sends payouts)
 */
export async function distributePayouts(eventId: string): Promise<boolean> {
  try {
    // Query Market for winning bets and pool data
    const marketEndpoint = `${config.lineraGraphqlUrl}/chains/${config.marketChainId}/applications/${config.marketAppId}`;

    const query = `{
      allBets { betId marketId user outcome amount userChain }
      totalPool
      homePool
      awayPool
      drawPool
      status
    }`;

    const marketResponse = await axios.post(marketEndpoint, { query }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (marketResponse.data.errors || !marketResponse.data.data) {
      console.error('❌ Failed to query market state');
      return false;
    }

    const marketData = marketResponse.data.data;
    const allBets = marketData.allBets || [];
    const totalPool = parseFloat(marketData.totalPool || '0');

    // Determine winning outcome from market status
    const status = marketData.status;
    const winningOutcome = status.replace('Resolved(', '').replace(')', '').toUpperCase();

    const winningBets = allBets.filter((bet: any) => bet.outcome === winningOutcome);

    if (winningBets.length === 0) {
      console.log(`ℹ️  No winning bets for ${eventId}`);
      return true;
    }

    // Get winning pool amount
    const pools: Record<string, string> = {
      HOME: marketData.homePool || '0',
      AWAY: marketData.awayPool || '0',
      DRAW: marketData.drawPool || '0',
    };
    const winningPool = parseFloat(pools[winningOutcome] || '0');

    console.log(`💰 Distributing payouts: ${winningBets.length} winner(s), pool: ${totalPool}`);

    // Send payout to each winner
    for (const bet of winningBets) {
      const betAmount = parseFloat(bet.amount);
      const payoutAmount = winningPool > 0 ? (betAmount / winningPool) * totalPool : totalPool;
      const payoutAmountStr = Math.floor(payoutAmount).toString();

      const userEndpoint = `${config.lineraGraphqlUrl}/chains/${config.userChainId}/applications/${config.userAppId}`;

      const mutation = `
        mutation {
          receivePayout(
            payout: {
              marketId: ${bet.marketId}
              betId: ${bet.betId}
              amount: "${payoutAmountStr}"
              timestamp: ${Date.now() * 1000}
            }
          )
        }
      `;

      try {
        const payoutResponse = await axios.post(userEndpoint, { query: mutation }, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (payoutResponse.data.errors) {
          console.error(`❌ Failed to send payout for bet ${bet.betId}`);
        } else {
          console.log(`  ✓ Payout sent: bet ${bet.betId} → ${payoutAmountStr} attos`);
        }
      } catch (error) {
        console.error(`❌ Error sending payout for bet ${bet.betId}:`, error);
      }
    }

    console.log(`✅ Payout distribution complete for ${eventId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to distribute payouts:', error);
    return false;
  }
}

/**
 * Complete oracle workflow: publish → process → distribute
 */
export async function handleGameResult(game: GameResult): Promise<void> {
  const outcome = game.homeScore > game.awayScore ? 'HOME' :
                  game.awayScore > game.homeScore ? 'AWAY' : 'DRAW';

  const result: EventResult = {
    eventId: game.eventId,
    outcome,
    score: { home: game.homeScore, away: game.awayScore },
    timestamp: game.timestamp * 1000, // Convert to microseconds
  };

  console.log(`\n🎮 Processing game: ${game.homeTeam} vs ${game.awayTeam}`);
  console.log(`   Score: ${game.homeScore}-${game.awayScore} → ${outcome}`);

  // Step 1: Publish to Oracle Chain
  const published = await publishOracleResult(result);
  if (!published) {
    console.error('❌ Skipping market processing due to Oracle publication failure');
    return;
  }

  // Step 2: Process on Market Chain
  const processed = await processResultOnMarket(result);
  if (!processed) {
    console.error('❌ Skipping payout distribution due to Market processing failure');
    return;
  }

  // Step 3: Distribute payouts
  await distributePayouts(game.eventId);

  console.log(`✅ Complete automation cycle finished for ${game.eventId}\n`);
}
