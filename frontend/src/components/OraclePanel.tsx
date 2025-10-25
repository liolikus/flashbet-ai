import { useState } from 'react';
import { APP_IDS } from '../config/apollo';

const BASE_URL = 'http://localhost:8080';

type Outcome = 'HOME' | 'AWAY' | 'DRAW';

interface OraclePanelProps {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  onResultPublished?: () => void;
}

export function OraclePanel({ eventId, homeTeam, awayTeam, onResultPublished }: OraclePanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>('HOME');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePublishResult = async () => {
    try {
      setPublishing(true);
      setError('');
      setSuccess(false);

      // Step 0: Authorize oracle (idempotent - safe to call multiple times)
      console.log('Step 0: Authorizing oracle...');
      try {
        await fetch(
          `${BASE_URL}/chains/${APP_IDS.ORACLE_CHAIN}/applications/${APP_IDS.ORACLE}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `mutation {
                authorizeOracle(oracle: "${APP_IDS.ORACLE_ACCOUNT_OWNER}")
              }`,
            }),
          }
        );
        console.log('✓ Oracle authorized (or already authorized)');
      } catch (authError) {
        // Ignore authorization errors - oracle might already be authorized
        console.log('⚠️ Authorization step skipped (oracle may already be authorized)');
      }

      console.log('Step 1: Publishing Oracle result...');

      // Publish result to Oracle chain
      const oracleResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.ORACLE_CHAIN}/applications/${APP_IDS.ORACLE}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              publishResult(
                result: {
                  eventId: "${eventId}"
                  outcome: ${selectedOutcome}
                  score: ${homeScore && awayScore ? `{home: ${homeScore}, away: ${awayScore}}` : 'null'}
                  timestamp: ${Date.now() * 1000}
                }
              )
            }`,
          }),
        }
      );

      const oracleData = await oracleResponse.json();
      if (oracleData.errors) {
        console.error('Oracle publication failed:', oracleData.errors);
        throw new Error(oracleData.errors[0]?.message || 'Failed to publish oracle result');
      }

      console.log('✓ Oracle result published');
      console.log('Step 2: Processing result on Market chain...');

      // Process oracle result on Market chain
      const marketResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation {
              processOracleResult(
                result: {
                  eventId: "${eventId}"
                  outcome: ${selectedOutcome}
                  score: ${homeScore && awayScore ? `{home: ${homeScore}, away: ${awayScore}}` : 'null'}
                  timestamp: ${Date.now() * 1000}
                }
              )
            }`,
          }),
        }
      );

      const marketData = await marketResponse.json();
      if (marketData.errors) {
        console.error('Market processing failed:', marketData.errors);
        console.warn('⚠️ Result published to Oracle but Market processing failed');
        throw new Error(marketData.errors[0]?.message || 'Failed to process result on Market');
      }

      console.log('✓ Market resolved');
      console.log('Step 3: Distributing payouts...');

      // Query Market for winning bets and total pool to calculate payouts
      const marketStateResponse = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ allBets { betId marketId user outcome amount userChain } totalPool homePool awayPool drawPool }`,
          }),
        }
      );

      const marketStateData = await marketStateResponse.json();
      if (marketStateData.data?.allBets) {
        const allBets = marketStateData.data.allBets;
        const totalPool = parseFloat(marketStateData.data.totalPool || '0');
        const pools: Record<string, string> = {
          home: marketStateData.data.homePool || '0',
          away: marketStateData.data.awayPool || '0',
          draw: marketStateData.data.drawPool || '0',
        };

        // Get winning pool amount
        const winningPoolKey = selectedOutcome.toLowerCase();
        const winningPool = parseFloat(pools[winningPoolKey] || '0');

        // Filter winning bets
        const winningBets = allBets.filter(
          (bet: any) => bet.outcome === selectedOutcome
        );

        console.log(`Found ${winningBets.length} winning bet(s)`);
        console.log(`Total pool: ${totalPool}, Winning pool: ${winningPool}`);

        // Distribute payouts to each winner
        for (const bet of winningBets) {
          const betAmount = parseFloat(bet.amount);

          // Calculate payout: (betAmount / winningPool) * totalPool
          // This formula works for both single and multiple winners
          let payoutAmount = 0;
          if (winningPool > 0) {
            payoutAmount = (betAmount / winningPool) * totalPool;
          }

          // Round to avoid floating point issues
          const payoutAmountStr = Math.floor(payoutAmount).toString();

          console.log(`Payout calculation for bet ${bet.betId}:`);
          console.log(`  - Bet amount: ${betAmount} attos`);
          console.log(`  - Total pool: ${totalPool} attos`);
          console.log(`  - Winning pool: ${winningPool} attos`);
          console.log(`  - Formula: (${betAmount} / ${winningPool}) × ${totalPool} = ${payoutAmount} attos`);
          console.log(`  - Rounded payout: ${payoutAmountStr} attos`);

          // Send payout to User chain
          // Note: In Wave 1, we assume all bets are from same User chain (APP_IDS.CHAIN)
          try {
            const payoutResponse = await fetch(
              `${BASE_URL}/chains/${APP_IDS.CHAIN}/applications/${APP_IDS.USER}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `mutation {
                    receivePayout(
                      payout: {
                        marketId: ${bet.marketId}
                        betId: ${bet.betId}
                        amount: "${payoutAmountStr}"
                        timestamp: ${Date.now() * 1000}
                      }
                    )
                  }`,
                }),
              }
            );

            const payoutData = await payoutResponse.json();
            if (payoutData.errors) {
              console.error(`Failed to send payout for bet ${bet.betId}:`, payoutData.errors);
            } else {
              console.log(`✓ Payout sent to bet ${bet.betId}`);
            }
          } catch (payoutError) {
            console.error(`Error sending payout for bet ${bet.betId}:`, payoutError);
          }
        }

        console.log(`✓ ${winningBets.length} payout(s) distributed`);
      }

      setSuccess(true);
      if (onResultPublished) {
        onResultPublished();
      }
    } catch (error: any) {
      console.error('Failed to publish result:', error);
      setError(error.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Oracle Panel - Publish Result</h3>

      <div className="space-y-4">
        {/* Event Info */}
        <div className="p-4" style={{ background: 'hsl(var(--heroui-content2))' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
            Event: <span className="font-semibold">{eventId}</span>
          </p>
          <p className="text-sm mt-1">
            <span className="font-semibold">{homeTeam}</span> vs{' '}
            <span className="font-semibold">{awayTeam}</span>
          </p>
        </div>

        {/* Outcome Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Winning Outcome</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOutcome('HOME')}
              className={`outcome-button flex-1 ${selectedOutcome === 'HOME' ? 'selected' : ''}`}
              disabled={publishing}
            >
              Home Win
              <span className="block text-xs mt-1" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                {homeTeam}
              </span>
            </button>
            <button
              onClick={() => setSelectedOutcome('AWAY')}
              className={`outcome-button flex-1 ${selectedOutcome === 'AWAY' ? 'selected' : ''}`}
              disabled={publishing}
            >
              Away Win
              <span className="block text-xs mt-1" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                {awayTeam}
              </span>
            </button>
            <button
              onClick={() => setSelectedOutcome('DRAW')}
              className={`outcome-button flex-1 ${selectedOutcome === 'DRAW' ? 'selected' : ''}`}
              disabled={publishing}
            >
              Draw
            </button>
          </div>
        </div>

        {/* Score Input (Optional) */}
        <div>
          <label className="block text-sm font-semibold mb-2">Final Score (Optional)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={`${homeTeam} score`}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="input flex-1"
              disabled={publishing}
            />
            <span className="self-center text-lg font-bold">-</span>
            <input
              type="number"
              placeholder={`${awayTeam} score`}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="input flex-1"
              disabled={publishing}
            />
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublishResult}
          disabled={publishing}
          className="btn-primary w-full"
        >
          {publishing ? 'Processing...' : 'Publish Result, Resolve Market & Distribute Payouts'}
        </button>

        {/* Help Text */}
        {!publishing && !success && (
          <p className="text-xs text-center" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
            This will: authorize oracle → publish result → resolve market → send payouts to winners
          </p>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4" style={{ background: 'hsl(var(--heroui-success) / 0.2)', borderRadius: 'var(--heroui-radius-medium)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--heroui-success))' }}>
              ✓ Complete! All steps successful
            </p>
            <p className="text-xs" style={{ color: 'hsl(var(--heroui-success))' }}>
              Market resolved with outcome: {selectedOutcome} • Payouts distributed to winners
            </p>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
              The page will reload shortly to show updated balances...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4" style={{ background: 'hsl(var(--heroui-danger) / 0.2)', borderRadius: 'var(--heroui-radius-medium)' }}>
            <p className="text-sm" style={{ color: 'hsl(var(--heroui-danger))' }}>
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
