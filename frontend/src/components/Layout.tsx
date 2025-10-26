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

      {/* Footer - Linera Dark Theme */}
      <footer style={{
        background: 'hsl(var(--heroui-content1))',
        borderTop: '1px solid hsl(var(--heroui-primary) / 0.2)',
        marginTop: 'auto',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm" style={{
            color: 'hsl(var(--heroui-foreground-500))',
            fontFamily: 'var(--font-body)'
          }}>
            <p>Wave 2 MVP - Enhanced Web UI</p>
            <p style={{
              background: 'linear-gradient(135deg, hsl(var(--heroui-primary)) 0%, hsl(var(--heroui-secondary)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '600'
            }}>
              Built on Linera Protocol
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
