/**
 * Live Sports Data Provider - The Odds API Integration
 * Fetches real game results from The Odds API
 */

import axios from 'axios';
import { config } from '../config';

export interface GameResult {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed';
  timestamp: number;
}

interface OddsApiScore {
  name: string;
  score: string;
}

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores?: OddsApiScore[];
  last_update?: string;
}

interface OddsApiResponse {
  data?: OddsApiGame[];
  message?: string;
}

// Track which games have been processed
const processedGames = new Set<string>();

// API quota tracking
let lastQuotaCheck = {
  remaining: -1,
  used: -1,
  timestamp: 0,
};

/**
 * Fetch games that have finished from The Odds API
 */
export async function getFinishedGames(): Promise<GameResult[]> {
  try {
    if (!config.theOddsApiKey) {
      console.warn('⚠️  No API key configured, cannot fetch live data');
      return [];
    }

    const url = `https://api.the-odds-api.com/v4/sports/${config.sportKey}/scores/`;
    const params = {
      apiKey: config.theOddsApiKey,
      daysFrom: config.daysFrom,
      dateFormat: 'iso',
    };

    console.log(`🔍 Fetching from The Odds API (${config.sportKey})...`);

    const response = await axios.get<OddsApiGame[]>(url, { params });

    // Track API quota
    const quotaRemaining = response.headers['x-requests-remaining'];
    const quotaUsed = response.headers['x-requests-used'];

    if (quotaRemaining) {
      lastQuotaCheck = {
        remaining: parseInt(quotaRemaining, 10),
        used: parseInt(quotaUsed, 10),
        timestamp: Date.now(),
      };

      if (lastQuotaCheck.remaining < 100) {
        console.warn(`⚠️  API quota low: ${lastQuotaCheck.remaining} requests remaining`);
      }
    }

    // Filter for completed games only
    const completedGames = response.data.filter(
      (game) => game.completed && game.scores && game.scores.length >= 2
    );

    console.log(`  ℹ️  Found ${completedGames.length} completed game(s)`);
    if (quotaRemaining) {
      console.log(`  📊 API Quota: ${lastQuotaCheck.remaining} requests remaining`);
    }

    // Map to our GameResult format
    const results: GameResult[] = [];
    for (const game of completedGames) {
      const eventId = generateEventId(game);

      // Skip if already processed
      if (processedGames.has(eventId)) {
        continue;
      }

      const gameResult = mapOddsApiToGameResult(game);
      if (gameResult) {
        results.push(gameResult);
      }
    }

    return results;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('❌ Invalid API key. Please check THE_ODDS_API_KEY in .env');
    } else if (error.response?.status === 429) {
      console.error('❌ Rate limit exceeded. Consider increasing POLL_INTERVAL_MS');
    } else {
      console.error('❌ Error fetching from The Odds API:', error.message);
    }
    return [];
  }
}

/**
 * Map Odds API game to our GameResult format
 */
function mapOddsApiToGameResult(game: OddsApiGame): GameResult | null {
  if (!game.scores || game.scores.length < 2) {
    return null;
  }

  // Find home and away scores
  const homeScore = game.scores.find((s) => s.name === game.home_team);
  const awayScore = game.scores.find((s) => s.name === game.away_team);

  if (!homeScore || !awayScore) {
    console.warn(`⚠️  Could not find scores for ${game.home_team} vs ${game.away_team}`);
    return null;
  }

  const homeScoreNum = parseInt(homeScore.score, 10);
  const awayScoreNum = parseInt(awayScore.score, 10);

  if (isNaN(homeScoreNum) || isNaN(awayScoreNum)) {
    console.warn(`⚠️  Invalid scores for ${game.home_team} vs ${game.away_team}`);
    return null;
  }

  return {
    eventId: generateEventId(game),
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    homeScore: homeScoreNum,
    awayScore: awayScoreNum,
    status: 'completed',
    timestamp: Date.parse(game.commence_time),
  };
}

/**
 * Generate a unique event ID from Odds API game data
 */
function generateEventId(game: OddsApiGame): string {
  const date = new Date(game.commence_time);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  return `${game.sport_key}_${game.id}_${dateStr}`;
}

/**
 * Mark a game as processed to avoid duplicate publications
 */
export function markGameProcessed(eventId: string): void {
  processedGames.add(eventId);
  console.log(`✓ Marked game ${eventId} as processed`);
}

/**
 * Determine winning outcome from scores
 */
export function determineOutcome(game: GameResult): 'HOME' | 'AWAY' | 'DRAW' {
  if (game.homeScore > game.awayScore) return 'HOME';
  if (game.awayScore > game.homeScore) return 'AWAY';
  return 'DRAW';
}

/**
 * Get current API quota status
 */
export function getQuotaStatus() {
  return lastQuotaCheck;
}
