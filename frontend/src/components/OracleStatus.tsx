import { useState, useEffect } from 'react';
import { APP_IDS, BASE_URL } from '../config/apollo';

interface MarketData {
  eventId: string;
  status: string;
  totalPool: string;
  betCount: number;
  homePool?: string;
  awayPool?: string;
  drawPool?: string;
}

interface ActivityEvent {
  id: string;
  type: 'result' | 'resolved' | 'payout';
  message: string;
  timestamp: Date;
}

export function OracleStatus() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPoll, setNextPoll] = useState(60);
  const [showManual, setShowManual] = useState(false);

  // Fetch market status
  const fetchMarketStatus = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/chains/${APP_IDS.MARKET_CHAIN}/applications/${APP_IDS.MARKET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ eventId status totalPool betCount homePool awayPool drawPool }`,
          }),
        }
      );

      const data = await response.json();
      if (data.data) {
        setMarketData(data.data);

        // Add activity event if status changed
        const statusMatch = data.data.status.match(/Resolved\((\w+)\)/);
        if (statusMatch && activity.length === 0) {
          addActivity('resolved', `Market resolved with outcome: ${statusMatch[1]}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch market status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add activity event
  const addActivity = (type: ActivityEvent['type'], message: string) => {
    const newEvent: ActivityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type,
      message,
      timestamp: new Date(),
    };
    setActivity(prev => [newEvent, ...prev].slice(0, 10)); // Keep last 10
  };

  // Poll for updates
  useEffect(() => {
    fetchMarketStatus();
    const interval = setInterval(fetchMarketStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNextPoll(prev => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    if (status.includes('Resolved')) return 'hsl(var(--heroui-success))';
    if (status === 'Locked') return 'hsl(var(--heroui-warning))';
    if (status === 'Open') return 'hsl(var(--heroui-primary))';
    return 'hsl(var(--heroui-foreground-600))';
  };

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'result': return '🔵';
      case 'resolved': return '🟢';
      case 'payout': return '💰';
      default: return '●';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Oracle Automation Status</h3>

      {/* Oracle Worker Status */}
      <div className="space-y-4">
        <div className="p-4" style={{ background: 'hsl(var(--heroui-content2))', borderRadius: 'var(--heroui-radius-medium)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🟢</span>
              <span className="font-semibold">Oracle Worker Running</span>
            </div>
            <span className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
              Poll: 60s | Next: {nextPoll}s
            </span>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
            Automated service monitoring sports results and resolving markets
          </p>
        </div>

        {/* Current Market Status */}
        {loading ? (
          <div className="p-4 text-center" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
            Loading market status...
          </div>
        ) : marketData ? (
          <div className="p-4" style={{ background: 'hsl(var(--heroui-content2))', borderRadius: 'var(--heroui-radius-medium)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Current Market</h4>
              <span
                className="px-2 py-1 text-xs font-semibold rounded"
                style={{
                  background: `${getStatusColor(marketData.status)} / 0.2)`,
                  color: getStatusColor(marketData.status)
                }}
              >
                {marketData.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span style={{ color: 'hsl(var(--heroui-foreground-600))' }}>Event:</span>
                <p className="font-mono text-xs">{marketData.eventId}</p>
              </div>
              <div>
                <span style={{ color: 'hsl(var(--heroui-foreground-600))' }}>Total Pool:</span>
                <p className="font-semibold">{(parseFloat(marketData.totalPool) / 1e18).toFixed(0)} tokens</p>
              </div>
              <div>
                <span style={{ color: 'hsl(var(--heroui-foreground-600))' }}>Bets Placed:</span>
                <p className="font-semibold">{marketData.betCount}</p>
              </div>
              {marketData.status.includes('Resolved') && (
                <div>
                  <span style={{ color: 'hsl(var(--heroui-foreground-600))' }}>Outcome:</span>
                  <p className="font-semibold text-green-600">
                    {marketData.status.match(/Resolved\((\w+)\)/)?.[1]}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
            No market data available
          </div>
        )}

        {/* Activity Feed */}
        <div>
          <h4 className="font-semibold mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {activity.length > 0 ? (
              activity.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 text-sm"
                  style={{ background: 'hsl(var(--heroui-content2))', borderRadius: 'var(--heroui-radius-small)' }}
                >
                  <span className="text-base">{getActivityIcon(event.type)}</span>
                  <div className="flex-1">
                    <p>{event.message}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                      {formatTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm p-4 text-center" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
                Waiting for Oracle Worker activity...
              </p>
            )}
          </div>
        </div>

        {/* Manual Override Section (Collapsed) */}
        <div>
          <button
            onClick={() => setShowManual(!showManual)}
            className="w-full p-2 text-sm text-left flex items-center justify-between"
            style={{
              background: 'hsl(var(--heroui-content2))',
              borderRadius: 'var(--heroui-radius-medium)',
              color: 'hsl(var(--heroui-foreground-600))'
            }}
          >
            <span>{showManual ? '▼' : '▶'} Emergency Manual Override</span>
            <span className="text-xs">For testing/emergency only</span>
          </button>

          {showManual && (
            <div className="mt-2 p-4" style={{
              background: 'hsl(var(--heroui-warning) / 0.1)',
              borderRadius: 'var(--heroui-radius-medium)',
              border: '1px solid hsl(var(--heroui-warning) / 0.3)'
            }}>
              <p className="text-xs mb-3" style={{ color: 'hsl(var(--heroui-warning))' }}>
                ⚠️ Manual controls are not needed - Oracle Worker handles automation
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-600))' }}>
                Use the oracle-worker CLI for manual operations:
                <code className="block mt-2 p-2 bg-black/20 rounded text-xs font-mono">
                  cd oracle-worker && ./start-oracle.sh
                </code>
              </p>
            </div>
          )}
        </div>

        {/* Auto-refresh indicator */}
        <p className="text-xs text-center" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
          Auto-refreshing every 5 seconds
        </p>
      </div>
    </div>
  );
}
