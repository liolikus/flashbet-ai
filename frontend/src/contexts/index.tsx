/**
 * Context Providers Index
 * Central export point for all context providers and hooks
 */

import type { ReactNode } from 'react';

// Export individual providers
export { TokenProvider, useToken } from './TokenContext';
export { MarketsProvider, useMarkets } from './MarketsContext';
export { UserProvider, useUser } from './UserContext';

// Export composite provider
import { TokenProvider } from './TokenContext';
import { MarketsProvider } from './MarketsContext';
import { UserProvider } from './UserContext';

/**
 * AppProviders
 * Wraps all context providers in the correct order
 *
 * Usage:
 * ```tsx
 * import { AppProviders } from './contexts';
 *
 * function App() {
 *   return (
 *     <AppProviders>
 *       <YourApp />
 *     </AppProviders>
 *   );
 * }
 * ```
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TokenProvider>
      <UserProvider>
        <MarketsProvider>
          {children}
        </MarketsProvider>
      </UserProvider>
    </TokenProvider>
  );
}
