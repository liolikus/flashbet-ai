import Layout from './components/Layout';
import UserBalance from './components/UserBalance';
import MarketsList from './components/MarketsList';

function App() {
  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - User Info */}
        <div className="lg:col-span-1">
          <UserBalance />
        </div>

        {/* Main Content - Markets */}
        <div className="lg:col-span-2">
          <MarketsList />
        </div>
      </div>
    </Layout>
  );
}

export default App;
