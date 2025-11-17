/**
 * Test Database Abstraction Layer
 * Verifies the abstraction works correctly with PostgreSQL
 */

import { db } from './index';

async function testAbstraction() {
  console.log('🧪 Testing Database Abstraction Layer\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Get all profiles with pagination
    console.log('\n📊 Test 1: Get All Profiles (paginated)');
    const result = await db.getAllProfiles(1, 10);
    console.log(`✅ Success: ${result.profiles.length} profiles`);
    console.log(
      `   Total: ${result.total}, Page: ${result.page}/${result.totalPages}`
    );

    // Test 2: Get single profile by ID
    if (result.profiles.length > 0) {
      console.log('\n👤 Test 2: Get Profile By ID');
      const firstProfile = result.profiles[0];
      const profile = await db.getProfileById(firstProfile.id);
      console.log(
        `✅ Success: ${profile?.first_name} ${profile?.last_initial}`
      );
      console.log(`   City: ${profile?.city}, ${profile?.state}`);
    }

    // Test 3: Get profession types
    console.log('\n💼 Test 3: Get Profession Types');
    const professions = await db.getProfessionTypes();
    console.log(`✅ Success: ${professions.length} profession types`);
    console.log(`   Types: ${professions.slice(0, 5).join(', ')}...`);

    // Test 4: Get states
    console.log('\n🗺️  Test 4: Get States');
    const states = await db.getStates();
    console.log(`✅ Success: ${states.length} states`);
    console.log(
      `   Sample: ${states
        .slice(0, 5)
        .map((s) => s.code)
        .join(', ')}...`
    );

    // Test 5: Get offices
    console.log('\n🏢 Test 5: Get Offices');
    const offices = await db.getOffices();
    console.log(`✅ Success: ${offices.length} offices`);
    console.log(
      `   Sample: ${offices
        .slice(0, 3)
        .map((o) => o.name)
        .join(', ')}...`
    );

    // Test 6: Search profiles
    console.log('\n🔍 Test 6: Search Profiles');
    const searchResult = await db.searchProfiles({
      state: 'FL',
      page: 1,
      limit: 5,
    });
    console.log(`✅ Success: ${searchResult.total} profiles in Florida`);
    console.log(`   Returned: ${searchResult.profiles.length} profiles`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📝 Database abstraction layer is working correctly!');
    console.log('   You can now use: import { db } from "@/lib/db"');
    console.log('   Ready to create API routes!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testAbstraction();
