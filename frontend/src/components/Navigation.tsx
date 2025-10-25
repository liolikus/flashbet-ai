import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Markets', icon: '🎯' },
  ];

  return (
    <nav className="bg-linera-black-700 backdrop-blur-lg border-b border-linera-black-500 mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-heading font-bold bg-gradient-to-r from-linera-blue-400 to-linera-blue-300 bg-clip-text text-transparent">
              FlashBet AI
            </div>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition-all font-body ${
                    location.pathname === item.path
                      ? 'bg-linera-blue-400/20 text-linera-blue-400 font-semibold'
                      : 'text-linera-grey-200 hover:bg-linera-black-500 hover:text-linera-white'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-sm font-body text-linera-grey-200">
            Powered by Linera Protocol
          </div>
        </div>
      </div>
    </nav>
  );
}
