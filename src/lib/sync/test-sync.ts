/**
 * Test Sync Service
 * Run this to test the sync function manually
 *
 * Usage: npm run test:sync
 */

import { syncProfiles } from '../sync/sync-profiles';
import path from 'path';

async function testSync() {
  console.log('🧪 Testing Sync Service\n');

  try {
    // Path to CSV file
    const csvPath = path.join(
      process.cwd(),
      'data',
      'InterTalent-Top-Talent-11102025.csv'
    );

    console.log(`📂 CSV file: ${csvPath}\n`);

    // Run sync
    const result = await syncProfiles(csvPath);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(60));

    if (result.success) {
      console.log('\n✅ Sync test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Sync test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSync();
