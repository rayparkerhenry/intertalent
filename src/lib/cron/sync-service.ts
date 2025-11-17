/**
 * Cron Service for Automated Profile Sync
 * Runs sync every 2 hours
 */

import cron, { type ScheduledTask } from 'node-cron';
import { syncProfiles, type SyncResult } from '../sync/sync-profiles';
import path from 'path';
import fs from 'fs';

// Cron expressions
const EVERY_2_MINUTES = '*/2 * * * *'; // For testing
const EVERY_2_HOURS = '0 */2 * * *'; // For production

/**
 * Start the cron service
 */
export function startCronService(testing: boolean = false) {
  const schedule = testing ? EVERY_2_MINUTES : EVERY_2_HOURS;

  console.log('⏰ Starting Cron Service');
  console.log(
    `📅 Schedule: ${testing ? 'Every 2 minutes (TESTING)' : 'Every 2 hours (PRODUCTION)'}`
  );
  console.log(`🔄 Sync will run automatically\n`);

  // Schedule the sync task
  const task = cron.schedule(schedule, async () => {
    console.log('\n' + '='.repeat(60));
    console.log(
      `🔄 Automated Sync Triggered at ${new Date().toLocaleString()}`
    );
    console.log('='.repeat(60) + '\n');

    try {
      // Get the latest CSV file
      const csvPath = getLatestCSVFile();

      if (!csvPath) {
        console.error('❌ No CSV file found to sync');
        return;
      }

      // Run sync
      const result = await syncProfiles(csvPath);

      // Log results
      logSyncResult(result);
    } catch (error) {
      console.error('❌ Cron task failed:', error);
    }
  });

  console.log('✅ Cron service started successfully!\n');

  // Optional: Run once immediately on startup
  if (testing) {
    console.log('🚀 Running initial sync...\n');
    runSyncNow();
  }

  return task;
}

/**
 * Run sync immediately (for testing or manual triggers)
 */
export async function runSyncNow(): Promise<SyncResult> {
  const csvFile = getLatestCSVFile();

  if (!csvFile) {
    console.error('❌ No CSV file available for sync');
    return {
      success: false,
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      errors: ['No CSV file found'],
      timestamp: new Date(),
      duration_ms: 0,
    };
  }

  try {
    const result = await syncProfiles(csvFile);
    logSyncResult(result);
    return result;
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    return {
      success: false,
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      timestamp: new Date(),
      duration_ms: 0,
    };
  }
}

/**
 * Get the latest CSV file from data directory
 */
function getLatestCSVFile(): string | null {
  const dataDir = path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    return null;
  }

  // Get all CSV files
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.endsWith('.csv'))
    .map((file) => ({
      name: file,
      path: path.join(dataDir, file),
      time: fs.statSync(path.join(dataDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time); // Sort by modified time, newest first

  if (files.length === 0) {
    console.error('❌ No CSV files found in data directory');
    return null;
  }

  console.log(`📄 Using CSV file: ${files[0].name}`);
  return files[0].path;
}

/**
 * Log sync result
 */
function logSyncResult(result: SyncResult): void {
  console.log('\n' + '-'.repeat(60));
  console.log('📊 SYNC RESULT');
  console.log('-'.repeat(60));
  console.log(`Status:    ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Duration:  ${result.duration_ms}ms`);
  console.log(`Inserted:  +${result.inserted}`);
  console.log(`Updated:   ~${result.updated}`);
  console.log(`Deleted:   -${result.deleted}`);
  console.log(`Unchanged: =${result.unchanged}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    result.errors.forEach((error: string, index: number) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  console.log('-'.repeat(60) + '\n');
}

/**
 * Stop the cron service
 */
export function stopCronService(task: ScheduledTask): void {
  task.stop();
  console.log('⏹️  Cron service stopped');
}
