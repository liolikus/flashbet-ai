import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { formatAmount, parseAmount } from '../utils/helpers';
import { APP_IDS } from '../config/apollo';

const GET_BALANCE = gql`
  query GetBalance($chainId: ID!) {
    chain(chainId: $chainId) {
      executionState {
        system {
          balance
        }
      }
    }
  }
`;

const DEPOSIT_MUTATION = gql`
  mutation Deposit($chainId: ID!, $amount: String!) {
    executeOperation(
      chainId: $chainId
      operation: {
        Deposit: { amount: $amount }
      }
    ) {
      hash
    }
  }
`;

export default function UserBalance() {
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const { data, loading, refetch } = useQuery(GET_BALANCE, {
    variables: { chainId: APP_IDS.CHAIN },
    pollInterval: 3000, // Poll every 3 seconds
  });

  const [deposit, { loading: depositing }] = useMutation(DEPOSIT_MUTATION, {
    onCompleted: () => {
      setDepositAmount('');
      setIsDepositOpen(false);
      refetch();
    },
  });

  const balance = (data as any)?.chain?.executionState?.system?.balance || '0';

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      await deposit({
        variables: {
          chainId: APP_IDS.CHAIN,
          amount: parseAmount(depositAmount),
        },
      });
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Balance</h2>
          <p className="text-sm text-gray-500">Chain: {APP_IDS.CHAIN.slice(0, 8)}...</p>
        </div>
        <button
          onClick={() => setIsDepositOpen(!isDepositOpen)}
          className="btn-secondary text-sm"
        >
          {isDepositOpen ? 'Cancel' : 'Deposit'}
        </button>
      </div>

      {/* Balance Display */}
      <div className="mb-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-4xl font-bold text-blue-600">
              {formatAmount(balance)}
            </div>
            <div className="text-sm text-gray-600 mt-1">tokens</div>
          </div>
        )}
      </div>

      {/* Deposit Form */}
      {isDepositOpen && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deposit Amount
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositing ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: This will add tokens to your User Chain balance
          </p>
        </div>
      )}
    </div>
  );
}
