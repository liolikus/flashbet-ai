import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import MarketCard from './MarketCard';
import type { MarketState, Outcome } from '../types';
import { parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const GET_MARKET_STATE = gql`
  query GetMarketState($chainId: ID!, $appId: ID!) {
    applications(chainId: $chainId) {
      entry(key: $appId) {
        value
      }
    }
  }
`;

const PLACE_BET_MUTATION = gql`
  mutation PlaceBet(
    $chainId: ID!
    $marketChain: String!
    $marketId: String!
    $outcome: String!
    $amount: String!
  ) {
    executeOperation(
      chainId: $chainId
      operation: {
        PlaceBet: {
          marketChain: $marketChain
          marketId: $marketId
          outcome: $outcome
          amount: $amount
        }
      }
    ) {
      hash
    }
  }
`;

export default function MarketsList() {
  const { data, loading, error, refetch } = useQuery(GET_MARKET_STATE, {
    variables: {
      chainId: APP_IDS.CHAIN,
      appId: APP_IDS.MARKET,
    },
    pollInterval: 3000, // Poll every 3 seconds
  });

  const [placeBet] = useMutation(PLACE_BET_MUTATION, {
    onCompleted: () => {
      refetch();
    },
  });

  const handlePlaceBet = async (
    marketId: string,
    outcome: Outcome,
    amount: string
  ) => {
    try {
      await placeBet({
        variables: {
          chainId: APP_IDS.CHAIN,
          marketChain: APP_IDS.CHAIN,
          marketId,
          outcome,
          amount: parseAmount(amount),
        },
      });
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load markets: {error.message}</p>
        <button onClick={() => refetch()} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const marketData = (data as any)?.applications?.entry?.value;

  if (!marketData) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-600 mb-4">No markets available yet</p>
        <p className="text-sm text-gray-500">
          Markets will appear here once created
        </p>
      </div>
    );
  }

  // Convert to MarketState type
  const market: MarketState = {
    info: marketData.info,
    status: marketData.status,
    pools: marketData.pools,
    totalPool: marketData.totalPool,
    betCount: marketData.betCount,
    winningOutcome: marketData.winningOutcome,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Active Markets</h2>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>

      <MarketCard market={market} onPlaceBet={handlePlaceBet} />
    </div>
  );
}
