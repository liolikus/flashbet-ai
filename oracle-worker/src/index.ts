import { config } from './config';
import * as mockSportsData from './api/mockSportsData';
import * as liveOddsData from './api/liveOddsData';
import { handleGameResult } from './oracle/publisher';

// Select data provider based on configuration
const dataProvider = config.dataMode === 'live' ? liveOddsData : mockSportsData;

/**
 * Main Oracle Worker Loop
 * Continuously polls for finished games and publishes results
 */
class OracleWorker {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Oracle Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('\n🚀 FlashBet Oracle Worker Starting...');
    console.log(`📊 Mode: ${config.dataMode}`);
    console.log(`⏱️  Poll Interval: ${config.pollIntervalMs}ms\n`);

    // Initial poll
    await this.poll();

    // Set up recurring polls
    this.pollInterval = setInterval(async () => {
      await this.poll();
    }, config.pollIntervalMs);

    console.log('✅ Oracle Worker started successfully\n');
  }

  async poll(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔍 Polling for finished games...`);

      // Fetch finished games using selected data provider
      const finishedGames = await dataProvider.getFinishedGames();

      if (finishedGames.length === 0) {
        console.log('  ℹ️  No new finished games');
        return;
      }

      console.log(`  📋 Found ${finishedGames.length} finished game(s)`);

      // Process each finished game
      for (const game of finishedGames) {
        await handleGameResult(game);
        dataProvider.markGameProcessed(game.eventId);
      }
    } catch (error) {
      console.error('❌ Error during poll:', error);
    }
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Oracle Worker is not running');
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
    console.log('\n🛑 Oracle Worker stopped\n');
  }
}

// Create and start worker
const worker = new OracleWorker();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT signal');
  worker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM signal');
  worker.stop();
  process.exit(0);
});

// Start the worker
worker.start().catch((error: any) => {
  console.error('❌ Fatal error starting Oracle Worker:', error);
  process.exit(1);
});
