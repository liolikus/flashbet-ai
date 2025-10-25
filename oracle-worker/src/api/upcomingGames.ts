/**
 * Upcoming Games Provider - The Odds API Integration
 * Fetches upcoming featured games for automatic market creation
 */

import axios from 'axios';
import { config } from '../config';

export interface UpcomingGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: any[];
}

// Track which games have had markets created
const marketsCreated = new Set<string>();

/**
 * Fetch upcoming games from The Odds API
 */
export async function getUpcomingGames(): Promise<UpcomingGame[]> {
  try {
    if (!config.theOddsApiKey) {
      console.warn('⚠️  No API key configured, cannot fetch upcoming games');
      return [];
    }

    const url = `https://api.the-odds-api.com/v4/sports/${config.sportKey}/odds/`;
    const params = {
      apiKey: config.theOddsApiKey,
      regions: 'us',
      markets: 'h2h',
      dateFormat: 'iso',
    };

    console.log(`🎯 Fetching upcoming games from The Odds API (${config.sportKey})...`);

    const response = await axios.get<UpcomingGame[]>(url, { params });

    console.log(`  ℹ️  Found ${response.data.length} upcoming game(s)`);

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('❌ Invalid API key for upcoming games');
    } else if (error.response?.status === 429) {
      console.error('❌ Rate limit exceeded');
    } else {
      console.error('❌ Error fetching upcoming games:', error.message);
    }
    return [];
  }
}

/**
 * Filter games that start within the specified lead time (default 24 hours)
 */
export function filterGamesInLeadTime(games: UpcomingGame[], leadTimeMs: number = 86400000): UpcomingGame[] {
  const now = Date.now();
  const cutoff = now + leadTimeMs;

  const filtered = games.filter((game) => {
    const commenceTime = Date.parse(game.commence_time);
    // Game starts between now and cutoff time
    return commenceTime > now && commenceTime <= cutoff;
  });

  console.log(`  📅 Filtered to ${filtered.length} game(s) starting in next ${leadTimeMs / 3600000}h`);
  return filtered;
}

/**
 * Determine if a game is "featured" (playoff, championship, rivalry)
 */
export function isFeaturedGame(game: UpcomingGame): boolean {
  const commenceDate = new Date(game.commence_time);
  const month = commenceDate.getMonth(); // 0 = January, 9 = October, 10 = November

  // MLB: October/November = Playoffs and World Series
  if (config.sportKey === 'baseball_mlb') {
    // Playoff season (October-November)
    if (month === 9 || month === 10) {
      return true;
    }

    // Regular season: Check for notable rivalries
    const mlbRivalries = [
      ['Yankees', 'Red Sox'],
      ['Dodgers', 'Giants'],
      ['Cubs', 'Cardinals'],
      ['Yankees', 'Mets'],
      ['Dodgers', 'Padres'],
      ['Giants', 'Padres'],
    ];

    return mlbRivalries.some(([team1, team2]) =>
      (game.home_team.includes(team1) && game.away_team.includes(team2)) ||
      (game.home_team.includes(team2) && game.away_team.includes(team1))
    );
  }

  // NBA: Playoffs (April-June) and notable matchups
  if (config.sportKey === 'basketball_nba') {
    // Playoff season (April-June)
    if (month >= 3 && month <= 5) {
      return true;
    }

    const nbaRivalries = [
      ['Lakers', 'Celtics'],
      ['Lakers', 'Clippers'],
      ['Knicks', 'Nets'],
      ['Warriors', 'Lakers'],
    ];

    return nbaRivalries.some(([team1, team2]) =>
      (game.home_team.includes(team1) && game.away_team.includes(team2)) ||
      (game.home_team.includes(team2) && game.away_team.includes(team1))
    );
  }

  // NFL: Playoffs (January-February) and primetime games
  if (config.sportKey === 'americanfootball_nfl') {
    // Playoff/Super Bowl season
    if (month === 0 || month === 1) {
      return true;
    }

    // Regular season: All games are relatively important in NFL
    return true; // NFL has fewer games, most are significant
  }

  // NHL: Playoffs (April-June) and rivalries
  if (config.sportKey === 'icehockey_nhl') {
    // Playoff season
    if (month >= 3 && month <= 5) {
      return true;
    }

    const nhlRivalries = [
      ['Bruins', 'Canadiens'],
      ['Rangers', 'Islanders'],
      ['Penguins', 'Flyers'],
      ['Blackhawks', 'Red Wings'],
    ];

    return nhlRivalries.some(([team1, team2]) =>
      (game.home_team.includes(team1) && game.away_team.includes(team2)) ||
      (game.home_team.includes(team2) && game.away_team.includes(team1))
    );
  }

  // Default: not featured
  return false;
}

/**
 * Generate a unique event ID from upcoming game data
 */
export function generateEventId(game: UpcomingGame): string {
  const date = new Date(game.commence_time);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  return `${game.sport_key}_${game.id}_${dateStr}`;
}

/**
 * Generate a human-readable description for the game
 */
export function generateDescription(game: UpcomingGame): string {
  const date = new Date(game.commence_time);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();

  // Check if it's a playoff game
  const monthNum = date.getMonth();

  if (config.sportKey === 'baseball_mlb' && (monthNum === 9 || monthNum === 10)) {
    // World Series or Playoffs
    if (monthNum === 10 || (monthNum === 9 && day >= 25)) {
      return `World Series 2025 - ${game.home_team} vs ${game.away_team}`;
    }
    return `MLB Playoffs - ${game.home_team} vs ${game.away_team}`;
  }

  // Regular season game
  return `${game.home_team} vs ${game.away_team} - ${month} ${day}`;
}

/**
 * Check if a market has already been created for this game
 */
export function hasMarketBeenCreated(eventId: string): boolean {
  return marketsCreated.has(eventId);
}

/**
 * Mark a game as having had a market created
 */
export function markMarketCreated(eventId: string): void {
  marketsCreated.add(eventId);
  console.log(`  ✓ Marked market created for ${eventId}`);
}

/**
 * Get all games that need markets created (featured games in lead time without markets)
 */
export async function getGamesNeedingMarkets(): Promise<UpcomingGame[]> {
  const allGames = await getUpcomingGames();
  const gamesInLeadTime = filterGamesInLeadTime(allGames, config.marketCreationLeadTime);
  const featuredGames = gamesInLeadTime.filter(isFeaturedGame);

  const needingMarkets = featuredGames.filter((game) => {
    const eventId = generateEventId(game);
    return !hasMarketBeenCreated(eventId);
  });

  if (featuredGames.length > 0) {
    console.log(`  🎖️  Found ${featuredGames.length} featured game(s)`);
    console.log(`  📊 ${needingMarkets.length} need market creation`);
  }

  return needingMarkets;
}
