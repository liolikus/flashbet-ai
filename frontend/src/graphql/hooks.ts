/**
 * GraphQL Hooks
 * Custom hooks for executing GraphQL operations against Linera endpoints
 *
 * Note: These hooks use fetch() instead of Apollo Client due to Linera's
 * multi-endpoint architecture (different chain/application combinations).
 * In the future, we may migrate to Apollo Client with dynamic link resolution.
 */

import { useState, useCallback } from 'react';
import { APP_IDS, BASE_URL } from '../config/apollo';

// ============================================================================
// Types
// ============================================================================

interface QueryOptions {
  endpoint?: string; // Override default endpoint
  skip?: boolean; // Skip query execution
}

interface MutationOptions {
  endpoint?: string; // Override default endpoint
}

interface QueryResult<TData> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface MutationResult<TData, TVariables> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  mutate: (variables: TVariables) => Promise<TData>;
}

// ============================================================================
// Endpoint Helpers
// ============================================================================

/**
 * Build endpoint URL for a specific chain and application
 */
export function buildEndpoint(chainId: string, applicationId: string): string {
  return `${BASE_URL}/chains/${chainId}/applications/${applicationId}`;
}

/**
 * Get default endpoint for User application
 */
export function getUserEndpoint(): string {
  return buildEndpoint(APP_IDS.CHAIN, APP_IDS.USER);
}

/**
 * Get default endpoint for Market application
 */
export function getMarketEndpoint(): string {
  return buildEndpoint(APP_IDS.MARKET_CHAIN, APP_IDS.MARKET);
}

/**
 * Get default endpoint for Oracle application
 */
export function getOracleEndpoint(): string {
  return buildEndpoint(APP_IDS.ORACLE_CHAIN, APP_IDS.ORACLE);
}

/**
 * Get default endpoint for Token application
 */
export function getTokenEndpoint(): string {
  return buildEndpoint(APP_IDS.CHAIN, APP_IDS.TOKEN);
}

// ============================================================================
// Query Hook
// ============================================================================

/**
 * Custom hook for GraphQL queries
 *
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @param options - Query options (endpoint, skip)
 */
export function useGraphQLQuery<TData = any, TVariables = any>(
  query: string,
  variables?: TVariables,
  options: QueryOptions = {}
): QueryResult<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = options.endpoint || getUserEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL query failed');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [query, variables, options.endpoint, options.skip]);

  return {
    data,
    loading,
    error,
    refetch: executeQuery,
  };
}

// ============================================================================
// Mutation Hook
// ============================================================================

/**
 * Custom hook for GraphQL mutations
 *
 * @param mutation - GraphQL mutation string
 * @param options - Mutation options (endpoint)
 */
export function useGraphQLMutation<TData = any, TVariables = any>(
  mutation: string,
  options: MutationOptions = {}
): MutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = options.endpoint || getUserEndpoint();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: mutation,
            variables,
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message || 'GraphQL mutation failed');
        }

        setData(result.data);
        return result.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [mutation, options.endpoint]
  );

  return {
    data,
    loading,
    error,
    mutate,
  };
}

// ============================================================================
// Typed Hooks (to be expanded)
// ============================================================================

/**
 * Hook for fetching user balance
 */
export function useUserBalance() {
  return useGraphQLQuery<{ balance: string }>(
    '{ balance }',
    {},
    { endpoint: getUserEndpoint() }
  );
}

/**
 * Hook for fetching all markets
 */
export function useAllMarkets() {
  return useGraphQLQuery<{ allMarkets: string[] }>(
    '{ allMarkets }',
    {},
    { endpoint: getMarketEndpoint() }
  );
}

/**
 * Hook for placing a bet
 */
export function usePlaceBet() {
  return useGraphQLMutation(
    `mutation PlaceBet($marketChain: String!, $eventId: String!, $outcome: String!, $amount: String!) {
      placeBet(marketChain: $marketChain, eventId: $eventId, outcome: $outcome, amount: $amount)
    }`,
    { endpoint: getUserEndpoint() }
  );
}
