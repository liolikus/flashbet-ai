/**
 * Market Generator - Automatic Market Creation
 * Creates prediction markets on the Market Chain for upcoming games
 */

import axios from 'axios';
import { config } from '../config';
import type { UpcomingGame } from '../api/upcomingGames';
import { generateEventId, generateDescription, markMarketCreated } from '../api/upcomingGames';

interface CreateMarketInput {
  eventId: string;
  description: string;
  eventTime: number;
  marketType: 'MATCH_WINNER';
  homeTeam: string;
  awayTeam: string;
}

/**
 * Create a market on the Market Chain for an upcoming game
 */
export async function createMarketForGame(game: UpcomingGame): Promise<boolean> {
  try {
    const eventId = generateEventId(game);
    const description = generateDescription(game);
    const eventTime = Date.parse(game.commence_time) * 1000; // Convert ms to microseconds

    const input: CreateMarketInput = {
      eventId,
      description,
      eventTime,
      marketType: 'MATCH_WINNER',
      homeTeam: game.home_team,
      awayTeam: game.away_team,
    };

    console.log(`\n📊 Creating market: ${description}`);
    console.log(`  Event: ${game.home_team} vs ${game.away_team}`);
    console.log(`  Start Time: ${new Date(game.commence_time).toISOString()}`);
    console.log(`  Event ID: ${eventId}`);

    const endpoint = `${config.lineraGraphqlUrl}/chains/${config.marketChainId}/applications/${config.marketAppId}`;

    const mutation = `
      mutation {
        createMarket(
          input: {
            eventId: "${input.eventId}"
            description: "${input.description}"
            eventTime: ${input.eventTime}
            marketType: ${input.marketType}
            homeTeam: "${input.homeTeam}"
            awayTeam: "${input.awayTeam}"
          }
        )
      }
    `;

    const response = await axios.post(endpoint, {
      query: mutation,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.errors) {
      console.error('❌ Market creation failed:', response.data.errors);
      return false;
    }

    console.log(`✅ Market created: ${eventId}`);
    markMarketCreated(eventId);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to create market:', error.message);
    if (error.response?.data) {
      console.error('  Response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Process multiple games and create markets for each
 */
export async function createMarketsForGames(games: UpcomingGame[]): Promise<number> {
  if (games.length === 0) {
    return 0;
  }

  console.log(`\n🎯 Creating markets for ${games.length} upcoming game(s)...`);

  let successCount = 0;
  for (const game of games) {
    const success = await createMarketForGame(game);
    if (success) {
      successCount++;
    }
    // Small delay between creations to avoid overwhelming the chain
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`✅ Created ${successCount}/${games.length} markets\n`);
  return successCount;
}
