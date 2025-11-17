#!/usr/bin/env node
/**
 * Start Cron Service
 * Starts the automated sync service
 *
 * Usage:
 *   npm run cron:start         # Production mode (every 2 hours)
 *   npm run cron:start testing # Testing mode (every 2 minutes)
 */

import { startCronService } from './sync-service';

const args = process.argv.slice(2);
const testing = args.includes('testing');

console.log('🚀 Starting Cron Service...');
console.log(
  `📅 Mode: ${testing ? 'TESTING (every 2 minutes)' : 'PRODUCTION (every 2 hours)'}\n`
);

const task = startCronService(testing);

console.log('✅ Cron service started successfully!');
console.log('Press Ctrl+C to stop.\n');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping cron service...');
  task.stop();
  console.log('✅ Cron service stopped.');
  process.exit(0);
});
