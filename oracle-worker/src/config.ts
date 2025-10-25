import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Linera Configuration
  lineraGraphqlUrl: process.env.LINERA_GRAPHQL_URL || 'http://localhost:8080',
  oracleChainId: process.env.ORACLE_CHAIN_ID || '',
  oracleAppId: process.env.ORACLE_APP_ID || '',
  marketChainId: process.env.MARKET_CHAIN_ID || '',
  marketAppId: process.env.MARKET_APP_ID || '',
  userChainId: process.env.USER_CHAIN_ID || '',
  userAppId: process.env.USER_APP_ID || '',

  // Oracle Account Owner
  oracleAccountOwner: process.env.ORACLE_ACCOUNT_OWNER || '',

  // Sports API
  theOddsApiKey: process.env.THE_ODDS_API_KEY,

  // Worker Configuration
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '60000', 10),
  dataMode: (process.env.DATA_MODE || 'mock') as 'mock' | 'live',
};

// Validate required configuration
function validateConfig() {
  const required = [
    'oracleChainId',
    'oracleAppId',
    'marketChainId',
    'marketAppId',
  ];

  for (const key of required) {
    if (!config[key as keyof typeof config]) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }

  if (config.dataMode === 'live' && !config.theOddsApiKey) {
    console.warn('⚠️  THE_ODDS_API_KEY not set, using mock data');
    config.dataMode = 'mock';
  }
}

validateConfig();

console.log('📋 Oracle Worker Configuration:');
console.log(`  - Mode: ${config.dataMode}`);
console.log(`  - Poll Interval: ${config.pollIntervalMs}ms`);
console.log(`  - Oracle Chain: ${config.oracleChainId}`);
console.log(`  - Market Chain: ${config.marketChainId}`);
