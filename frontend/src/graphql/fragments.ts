import { gql } from '@apollo/client';

/**
 * Market Field Fragment
 * Used in queries to fetch individual market fields via parameterized queries
 */
export const MARKET_FIELDS_FRAGMENT = gql`
  fragment MarketFields on Query {
    eventId(eventId: $eventId)
    description(eventId: $eventId)
    homeTeam(eventId: $eventId)
    awayTeam(eventId: $eventId)
    eventTime(eventId: $eventId)
    status(eventId: $eventId)
    isResolved(eventId: $eventId)
    isOpen(eventId: $eventId)
    totalPool(eventId: $eventId)
    homePool(eventId: $eventId)
    awayPool(eventId: $eventId)
    drawPool(eventId: $eventId)
    betCount(eventId: $eventId)
    homeOdds(eventId: $eventId)
    awayOdds(eventId: $eventId)
    drawOdds(eventId: $eventId)
  }
`;

/**
 * Oracle Result Fragment
 * Fields for oracle results
 */
export const ORACLE_RESULT_FRAGMENT = gql`
  fragment OracleResultFields on OracleResult {
    eventId
    outcome
    timestamp
    score
  }
`;
