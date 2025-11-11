import { formatAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';
import { useToken } from '../contexts/TokenContext';
import { useUser } from '../contexts/UserContext';

export default function UserBalance() {
  const { tickerSymbol } = useToken();
  const { balance, loading } = useUser();

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--heroui-foreground))' }}>
          Your Balance
        </h2>
        <p className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
          Chain: {APP_IDS.CHAIN.slice(0, 8)}...
        </p>
      </div>

      {/* Balance Display */}
      <div>
        {loading && balance === '0' ? (
          <div className="skeleton" style={{ height: '4rem', borderRadius: '8px' }}></div>
        ) : (
          <div className="balance-display">
            <div className="text-4xl font-bold">
              {formatAmount(balance)}
            </div>
            <div className="text-sm mt-1" style={{ opacity: 0.8 }}>{tickerSymbol}</div>
          </div>
        )}
      </div>

      {/* Funding Instructions */}
      <div className="mt-4 p-3 rounded-lg" style={{ background: 'hsl(var(--heroui-content2))' }}>
        <p className="text-xs" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
          To place bets, simply select a market and choose your prediction.
          Your {tickerSymbol} tokens will be automatically transferred when you place a bet.
        </p>
      </div>
    </div>
  );
}
