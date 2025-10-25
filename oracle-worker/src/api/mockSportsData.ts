/**
 * Mock Sports Data Provider
 * Simulates finished games for testing automation
 */

export interface GameResult {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed';
  timestamp: number;
}

// Simulated games database (in production, this would come from an API)
const MOCK_GAMES: GameResult[] = [
  {
    eventId: 'mlb_2025_finals',
    homeTeam: 'Yankees',
    awayTeam: 'Dodgers',
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    timestamp: Date.now() + 300000, // 5 minutes from now
  },
];

// Track which games have been processed
const processedGames = new Set<string>();

/**
 * Fetch games that have finished
 * In production, this would call The Odds API or ESPN API
 */
export async function getFinishedGames(): Promise<GameResult[]> {
  const now = Date.now();

  // Simulate games finishing after their scheduled time
  return MOCK_GAMES.map((game) => {
    if (game.status === 'scheduled' && now > game.timestamp) {
      // Simulate game finishing with random score
      const homeScore = Math.floor(Math.random() * 5) + 1;
      const awayScore = Math.floor(Math.random() * 5) + 1;

      return {
        ...game,
        homeScore,
        awayScore,
        status: 'completed' as const,
      };
    }
    return game;
  }).filter((game) => {
    // Only return completed games that haven't been processed
    return game.status === 'completed' && !processedGames.has(game.eventId);
  });
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
