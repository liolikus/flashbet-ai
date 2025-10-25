import UserBalance from '../components/UserBalance';
import MarketsList from '../components/MarketsList';
import { OracleStatus } from '../components/OracleStatus';

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

        {/* Oracle Status - Real-time automation monitoring */}
        <div className="mt-8">
          <OracleStatus />
        </div>
      </div>
    </div>
  );
}
