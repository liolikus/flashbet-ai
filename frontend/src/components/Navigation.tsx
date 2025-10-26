import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const navItems = [
    { id: 'sport', path: '/', label: 'Sport', active: true },
    { id: 'politics', path: '#politics', label: 'Politics', active: false },
    { id: 'trending', path: '#trending', label: 'Trending', active: false },
    { id: 'finance', path: '#finance', label: 'Finance', active: false },
    { id: 'crypto', path: '#crypto', label: 'Crypto', active: false },
  ];

  return (
    <nav style={{
      background: 'hsl(var(--heroui-content1))',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid hsl(var(--heroui-primary) / 0.2)',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold" style={{
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(135deg, hsl(var(--heroui-primary)) 0%, hsl(var(--heroui-secondary)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              FlashBet AI
            </div>
            <div className="flex space-x-4">
              {navItems.map((item) => {
                const isActive = item.active && location.pathname === item.path;
                const isInactive = !item.active;

                return (
                  <Link
                    key={item.id}
                    to={isInactive ? '#' : item.path}
                    className="px-4 py-2 rounded-lg transition-all"
                    style={{
                      fontFamily: 'var(--font-body)',
                      background: isActive
                        ? 'linear-gradient(135deg, hsl(var(--heroui-primary) / 0.2) 0%, hsl(var(--heroui-secondary) / 0.2) 100%)'
                        : 'transparent',
                      color: isInactive
                        ? 'hsl(var(--heroui-foreground-400))'
                        : isActive
                        ? 'hsl(var(--heroui-primary))'
                        : 'hsl(var(--heroui-foreground-500))',
                      fontWeight: isActive ? '600' : '400',
                      border: isInactive
                        ? '1px solid hsl(var(--heroui-default-300) / 0.3)'
                        : isActive
                        ? '1px solid hsl(var(--heroui-primary) / 0.3)'
                        : '1px solid transparent',
                      opacity: isInactive ? 0.5 : 1,
                      cursor: isInactive ? 'not-allowed' : 'pointer',
                      pointerEvents: isInactive ? 'none' : 'auto'
                    }}
                    onMouseEnter={(e) => {
                      if (item.active && location.pathname !== item.path) {
                        e.currentTarget.style.background = 'hsl(var(--heroui-content2))';
                        e.currentTarget.style.color = 'hsl(var(--heroui-foreground))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.active && location.pathname !== item.path) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'hsl(var(--heroui-foreground-500))';
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
