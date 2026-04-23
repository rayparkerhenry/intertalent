/**
 * Test Database Helper Functions
 * Run this to verify all CRUD operations work
 *
 * Usage: npm run test:helpers
 */

import { db } from './index';

async function testHelpers() {
  console.log('🧪 Testing database helper functions...\n');

  try {
    // Test 1: Get all profiles (first page)
    console.log('Test 1: Get all profiles (page 1, limit 5)');
    const allProfiles = await db.getAllProfiles(1, 5);
    console.log(`✅ Retrieved ${allProfiles.profiles.length} profiles`);
    console.log(
      `   Total: ${allProfiles.total}, Pages: ${allProfiles.totalPages}\n`
    );

    // Test 2: Get profession types
    console.log('Test 2: Get unique profession types');
    const professionTypes = await db.getProfessionTypes();
    console.log(`✅ Found ${professionTypes.length} profession types:`);
    console.log(`   ${professionTypes.slice(0, 5).join(', ')}...\n`);

    // Test 3: Get states
    console.log('Test 3: Get unique states');
    const states = await db.getStates();
    console.log(`✅ Found ${states.length} states:`);
    console.log(`   ${states.map((s) => s.code).slice(0, 10).join(', ')}...\n`);

    // Test 4: Get offices
    console.log('Test 4: Get unique offices');
    const offices = await db.getOffices();
    console.log(`✅ Found ${offices.length} offices:`);
    console.log(`   ${offices.slice(0, 5).map((o) => o.name).join(', ')}...\n`);

    // Test 5: Search by profession type
    console.log('Test 5: Search by profession type (first available type)');
    if (professionTypes.length > 0) {
      const searchResults = await db.searchProfiles({
        professionTypes: [professionTypes[0]],
        limit: 3,
      });
      console.log(
        `✅ Found ${searchResults.total} profiles with profession: ${professionTypes[0]}`
      );
      searchResults.profiles.forEach((p, idx) => {
        console.log(
          `   ${idx + 1}. ${p.first_name} ${p.last_initial} - ${p.city}, ${p.state}`
        );
      });
      console.log();
    }

    // Test 6: Search by state
    console.log('Test 6: Search by state (first available state)');
    if (states.length > 0) {
      const stateResults = await db.searchProfiles({
        state: states[0].code,
        limit: 3,
      });
      console.log(`✅ Found ${stateResults.total} profiles in ${states[0].code}`);
      stateResults.profiles.forEach((p, idx) => {
        console.log(
          `   ${idx + 1}. ${p.first_name} ${p.last_initial} - ${p.city}, ${p.profession_type}`
        );
      });
      console.log();
    }

    // Test 7: Get specific profile by ID
    console.log('Test 7: Get profile by ID (first profile)');
    if (allProfiles.profiles.length > 0) {
      const firstProfile = allProfiles.profiles[0];
      const profile = await db.getProfileById(firstProfile.id);
      if (profile) {
        console.log(
          `✅ Retrieved profile: ${profile.first_name} ${profile.last_initial}`
        );
        console.log(
          `   Location: ${profile.city}, ${profile.state} ${profile.zip_code}`
        );
        console.log(`   Office: ${profile.office}`);
        console.log(`   Profession: ${profile.profession_type}`);
        console.log(
          `   Summary: ${profile.professional_summary.substring(0, 100)}...`
        );
      }
      console.log();
    }

    // Test 8: Keyword search
    console.log('Test 8: Keyword search (searching for "manager")');
    const keywordResults = await db.searchProfiles({
      keywords: ['manager'],
      limit: 3,
    });
    console.log(`✅ Found ${keywordResults.total} profiles matching "manager"`);
    keywordResults.profiles.forEach((p, idx) => {
      console.log(
        `   ${idx + 1}. ${p.first_name} ${p.last_initial} - ${p.profession_type}`
      );
    });
    console.log();

    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testHelpers();
