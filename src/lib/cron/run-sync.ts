#!/usr/bin/env node
/**
 * Manual Sync Runner
 * Run this to trigger a sync manually
 *
 * Usage: npm run sync:now
 */

import { runSyncNow } from './sync-service';

async function main() {
  console.log('🚀 Running manual sync...\n');

  try {
    const result = await runSyncNow();

    if (result.success) {
      console.log('\n✅ Manual sync completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Manual sync failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error running sync:', error);
    process.exit(1);
  }
}

main();
