import type { ReactNode } from 'react';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--heroui-background))' }}>
      {/* Navigation */}
      <Navigation />

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
