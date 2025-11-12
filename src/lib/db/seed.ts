/**
 * Seed Database with CSV Data
 * Imports profiles from CSV file into Supabase
 *
 * Usage: npm run seed
 */

import { parseCSVFile, validateProfile } from '../data/csv-parser';
import { supabaseAdmin } from './supabase';
import path from 'path';

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Path to CSV file
    const csvPath = path.join(
      process.cwd(),
      'data',
      'InterTalent-Top-Talent-11102025.csv'
    );

    console.log(`📂 CSV file path: ${csvPath}`);

    // Parse CSV
    console.log('\n📊 Parsing CSV file...');
    const profiles = parseCSVFile(csvPath);
    console.log(`✅ Parsed ${profiles.length} profiles\n`);

    // Validate all profiles
    console.log('🔍 Validating profiles...');
    let validCount = 0;
    let invalidCount = 0;

    const validProfiles = profiles.filter((profile) => {
      const validation = validateProfile(profile);
      if (validation.valid) {
        validCount++;
        return true;
      } else {
        invalidCount++;
        console.error(
          `❌ Invalid profile: ${profile.first_name} ${profile.last_initial}`
        );
        console.error(`   Errors: ${validation.errors.join(', ')}`);
        return false;
      }
    });

    console.log(`✅ Valid profiles: ${validCount}`);
    console.log(`❌ Invalid profiles: ${invalidCount}\n`);

    if (validProfiles.length === 0) {
      console.error('❌ No valid profiles to import!');
      return;
    }

    // Check if table is empty
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log(`⚠️  Warning: Database already has ${count} profiles`);
      console.log(
        '💡 Delete existing data? (This script will replace all data)'
      );

      // Clear existing data
      console.log('🗑️  Clearing existing profiles...');
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('❌ Error deleting existing data:', deleteError);
        return;
      }
      console.log('✅ Existing data cleared\n');
    }

    // Insert profiles in batches
    console.log('💾 Inserting profiles into database...');
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < validProfiles.length; i += BATCH_SIZE) {
      const batch = validProfiles.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
        console.log(
          `  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Inserted ${data?.length} profiles`
        );
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   Total in CSV: ${profiles.length}`);
    console.log(`   Valid: ${validCount}`);
    console.log(`   Invalid: ${invalidCount}`);
    console.log(`   ✅ Successfully inserted: ${inserted}`);
    console.log(`   ❌ Failed to insert: ${errors}`);

    // Verify final count
    const { count: finalCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n🎉 Database now has ${finalCount} profiles!`);

    // Show sample data
    console.log('\n📋 Sample profiles:');
    const { data: samples } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_initial, city, state, profession_type')
      .limit(5);

    samples?.forEach((profile, idx) => {
      console.log(
        `   ${idx + 1}. ${profile.first_name} ${profile.last_initial} - ${profile.city}, ${profile.state} (${profile.profession_type})`
      );
    });

    console.log('\n✅ Seed complete!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
