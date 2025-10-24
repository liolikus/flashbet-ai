import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--heroui-background))' }}>
      {/* Header */}
      <header style={{
        background: 'hsl(var(--heroui-content1))',
        borderBottom: '1px solid hsl(var(--heroui-default-200))',
        boxShadow: 'var(--heroui-box-shadow-small)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--heroui-primary))' }}>⚡️</div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--heroui-foreground))' }}>
                  FlashBet AI
                </h1>
                <p className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                  Real-Time Sports Prediction Markets
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
                Powered by Linera
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'hsl(var(--heroui-content1))',
        borderTop: '1px solid hsl(var(--heroui-default-200))',
        marginTop: 'auto'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm" style={{ color: 'hsl(var(--heroui-foreground-500))' }}>
            <p>Wave 2 MVP - Enhanced Web UI</p>
            <p>Built on Linera Protocol</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
