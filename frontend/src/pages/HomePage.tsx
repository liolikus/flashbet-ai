import UserBalance from '../components/UserBalance';
import MarketsList from '../components/MarketsList';
import { OraclePanel } from '../components/OraclePanel';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar - User Info */}
      <div className="lg:col-span-1">
        <UserBalance />
      </div>

      {/* Main Content - Markets */}
      <div className="lg:col-span-2 space-y-6">
        <MarketsList />

        {/* Oracle Panel - For publishing results (admin/demo) */}
        <div className="mt-8">
          <OraclePanel
            eventId="mlb_game_20251025_001"
            homeTeam="Yankees"
            awayTeam="Red Sox"
            onResultPublished={() => {
              console.log('Result published - refreshing market data...');
              window.location.reload();
            }}
          />
        </div>
      </div>
    </div>
  );
}
