import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-blue-600">⚡️</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FlashBet AI</h1>
                <p className="text-sm text-gray-500">Real-Time Sports Prediction Markets</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Powered by Linera</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Wave 2 MVP - Enhanced Web UI</p>
            <p>Built on Linera Protocol</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
