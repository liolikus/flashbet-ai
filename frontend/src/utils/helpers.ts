import type { Amount, OddsCalculation } from '../types';
import { Outcome } from '../types';

/**
 * Safely convert Amount to BigInt, handling edge cases
 */
function toBigInt(amount: Amount): bigint {
  if (!amount || amount === '0' || amount === '0.') {
    return BigInt(0);
  }
  // Remove trailing decimal point and any existing decimals
  const cleanAmount = amount.replace(/\.$/, '').split('.')[0];
  return BigInt(cleanAmount || '0');
}

/**
 * Convert Amount (string representing u128) to human-readable number
 */
export function formatAmount(amount: Amount): string {
  // Handle empty or invalid amounts
  if (!amount || amount === '0' || amount === '0.') {
    return '0';
  }

  // Remove trailing decimal point if present
  const cleanAmount = amount.replace(/\.$/, '');

  // If it's already a decimal number, just return it
  if (cleanAmount.includes('.')) {
    return parseFloat(cleanAmount).toString();
  }

  try {
    const value = BigInt(cleanAmount);
    // Assuming 18 decimals (like ETH)
    const divisor = BigInt(10 ** 18);
    const whole = value / divisor;
    const fraction = value % divisor;

    if (fraction === BigInt(0)) {
      return whole.toString();
    }

    // Show up to 4 decimal places
    const fractionStr = fraction.toString().padStart(18, '0');
    const trimmedFraction = fractionStr.slice(0, 4).replace(/0+$/, '');

    if (trimmedFraction === '') {
      return whole.toString();
    }

    return `${whole}.${trimmedFraction}`;
  } catch (error) {
    console.error('Failed to format amount:', amount, error);
    return cleanAmount;
  }
}

/**
 * Convert human-readable number to Amount (u128 string)
 */
export function parseAmount(value: string): Amount {
  const [whole, fraction = '0'] = value.split('.');
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  // Use BigInt literal to avoid precision loss with large numbers
  const amount = BigInt(whole) * BigInt("1000000000000000000") + BigInt(paddedFraction);
  return amount.toString();
}

/**
 * Calculate odds for each outcome based on pool sizes
 * Odds = Total Pool / Outcome Pool
 */
export function calculateOdds(
  pools: Record<Outcome, Amount>,
  totalPool: Amount
): Record<Outcome, number> {
  const total = toBigInt(totalPool);

  if (total === BigInt(0)) {
    return {
      [Outcome.Home]: 2.0,
      [Outcome.Away]: 2.0,
      [Outcome.Draw]: 3.0,
    };
  }

  const odds: Record<Outcome, number> = {} as Record<Outcome, number>;

  for (const outcome of Object.values(Outcome)) {
    const pool = toBigInt(pools[outcome] || '0');

    if (pool === BigInt(0)) {
      odds[outcome] = parseFloat(formatAmount(totalPool)) + 1;
    } else {
      const oddsValue = Number(total * BigInt(100) / pool) / 100;
      odds[outcome] = Math.max(1.01, oddsValue);
    }
  }

  return odds;
}

/**
 * Calculate potential payout for a bet
 */
export function calculatePayout(
  betAmount: Amount,
  outcomePool: Amount,
  totalPool: Amount
): OddsCalculation {
  const bet = toBigInt(betAmount);
  const pool = toBigInt(outcomePool);
  const total = toBigInt(totalPool);

  if (pool === BigInt(0) || total === BigInt(0)) {
    return {
      outcome: Outcome.Home,
      odds: 1.0,
      payout: betAmount,
    };
  }

  const odds = Number(total * BigInt(100) / pool) / 100;
  const payout = bet * total / pool;

  return {
    outcome: Outcome.Home,
    odds: Math.max(1.01, odds),
    payout: payout.toString(),
  };
}

/**
 * Format timestamp to human-readable date
 */
export function formatTimestamp(timestamp: number): string {
  // Linera timestamps are in microseconds
  const date = new Date(timestamp / 1000);
  return date.toLocaleString();
}

/**
 * Format timestamp to relative time (e.g., "2 hours from now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now() * 1000; // Convert to microseconds
  const diff = timestamp - now;

  if (diff < 0) {
    return 'Ended';
  }

  const seconds = Math.floor(diff / 1_000_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Get outcome display name (Polymarket-style: show team names instead of "Home/Away Win")
 */
export function getOutcomeDisplay(
  outcome: Outcome,
  homeTeam?: string,
  awayTeam?: string
): string {
  switch (outcome) {
    case Outcome.Home:
      return homeTeam || '🏠 Home Win';
    case Outcome.Away:
      return awayTeam || '✈️ Away Win';
    case Outcome.Draw:
      return 'Draw';
    default:
      return outcome;
  }
}

/**
 * Get status display with color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Open':
      return 'text-green-600';
    case 'Locked':
      return 'text-yellow-600';
    case 'Resolved':
      return 'text-blue-600';
    case 'Cancelled':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}
