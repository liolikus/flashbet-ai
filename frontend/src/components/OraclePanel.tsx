import { useState } from 'react';
import { APP_IDS, BASE_URL } from '../config/apollo';

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
      console.log('Note: Market contract will automatically distribute payouts to winners');

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
              {homeTeam}
            </button>
            <button
              onClick={() => setSelectedOutcome('AWAY')}
              className={`outcome-button flex-1 ${selectedOutcome === 'AWAY' ? 'selected' : ''}`}
              disabled={publishing}
            >
              {awayTeam}
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
