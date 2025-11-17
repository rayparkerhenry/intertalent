/**
 * Profile Sync Service
 * Handles synchronization of profiles from CSV files to database
 */

import { parseCSVFile } from '../data/csv-parser';
import { supabaseAdmin, type Profile } from '../db/supabase';
import { sanitizeProfile, validateProfile } from '../../utils/validator';
import type { ParsedProfile } from '../data/csv-parser';

export interface SyncResult {
  timestamp: Date;
  success: boolean;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Sync profiles from CSV file to database
 */
export async function syncProfiles(csvFilePath: string): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    timestamp: new Date(),
    success: false,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    errors: [],
    duration_ms: 0,
  };

  try {
    console.log(`🔄 Starting sync from: ${csvFilePath}`);
    console.log(`⏰ Started at: ${result.timestamp.toISOString()}\n`);

    // Step 1: Parse CSV file
    console.log('📄 Step 1: Parsing CSV file...');
    const parsedProfiles = parseCSVFile(csvFilePath);
    console.log(`✅ Parsed ${parsedProfiles.length} profiles from CSV\n`);

    // Step 2: Validate all profiles
    console.log('🔍 Step 2: Validating profiles...');
    const validProfiles: ParsedProfile[] = [];
    parsedProfiles.forEach((profile, index) => {
      const validation = validateProfile(profile);
      if (validation.valid) {
        validProfiles.push(sanitizeProfile(profile));
      } else {
        result.errors.push(`Row ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });
    console.log(
      `✅ Valid: ${validProfiles.length}, Invalid: ${result.errors.length}\n`
    );

    if (validProfiles.length === 0) {
      result.errors.push('No valid profiles to sync');
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    // Step 3: Get existing profiles from database
    console.log('📊 Step 3: Fetching existing profiles from database...');
    const { data: existingProfiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (fetchError) {
      result.errors.push(`Database fetch error: ${fetchError.message}`);
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    console.log(
      `✅ Found ${existingProfiles?.length || 0} existing profiles\n`
    );

    // Step 4: Compare and determine operations
    console.log('🔍 Step 4: Comparing profiles...');
    const comparison = compareProfiles(validProfiles, existingProfiles || []);
    console.log(`  • To Insert: ${comparison.toInsert.length}`);
    console.log(`  • To Update: ${comparison.toUpdate.length}`);
    console.log(`  • To Delete: ${comparison.toDelete.length}`);
    console.log(`  • Unchanged: ${comparison.unchanged.length}\n`);

    // Step 5: Execute database operations
    console.log('💾 Step 5: Executing database operations...\n');

    // Insert new profiles
    if (comparison.toInsert.length > 0) {
      console.log(
        `  📥 Inserting ${comparison.toInsert.length} new profiles...`
      );
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(comparison.toInsert)
        .select('id');

      if (insertError) {
        result.errors.push(`Insert error: ${insertError.message}`);
      } else {
        result.inserted = inserted?.length || 0;
        console.log(`  ✅ Inserted ${result.inserted} profiles`);
      }
    }

    // Update existing profiles
    if (comparison.toUpdate.length > 0) {
      console.log(`  ♻️  Updating ${comparison.toUpdate.length} profiles...`);
      let updated = 0;

      for (const update of comparison.toUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            ...update.newData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id);

        if (updateError) {
          result.errors.push(
            `Update error for ID ${update.id}: ${updateError.message}`
          );
        } else {
          updated++;
        }
      }

      result.updated = updated;
      console.log(`  ✅ Updated ${result.updated} profiles`);
    }

    // Soft delete profiles not in CSV
    if (comparison.toDelete.length > 0) {
      console.log(
        `  🗑️  Deactivating ${comparison.toDelete.length} profiles...`
      );
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in('id', comparison.toDelete);

      if (deleteError) {
        result.errors.push(`Delete error: ${deleteError.message}`);
      } else {
        result.deleted = comparison.toDelete.length;
        console.log(`  ✅ Deactivated ${result.deleted} profiles`);
      }
    }

    result.unchanged = comparison.unchanged.length;
    result.success = result.errors.length === 0;
    result.duration_ms = Date.now() - startTime;

    console.log(`\n✅ Sync completed in ${result.duration_ms}ms`);
    console.log(
      `📊 Summary: +${result.inserted} ~${result.updated} -${result.deleted} =${result.unchanged}`
    );

    if (result.errors.length > 0) {
      console.log(`⚠️  Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.duration_ms = Date.now() - startTime;
    console.error('❌ Sync failed:', error);
    return result;
  }
}

/**
 * Compare CSV profiles with database profiles
 */
function compareProfiles(
  csvProfiles: ParsedProfile[],
  dbProfiles: Profile[]
): {
  toInsert: ParsedProfile[];
  toUpdate: Array<{ id: string; newData: Partial<Profile> }>;
  toDelete: string[];
  unchanged: string[];
} {
  const toInsert: ParsedProfile[] = [];
  const toUpdate: Array<{ id: string; newData: Partial<Profile> }> = [];
  const toDelete: string[] = [];
  const unchanged: string[] = [];

  // Create lookup map for CSV profiles
  const csvMap = new Map<string, ParsedProfile>();
  csvProfiles.forEach((profile) => {
    const key = createProfileKey(profile);
    csvMap.set(key, profile);
  });

  // Create lookup map for DB profiles
  const dbMap = new Map<string, Profile>();
  dbProfiles.forEach((profile) => {
    const key =
      `${profile.first_name}|${profile.last_initial}|${profile.city}|${profile.state}`.toLowerCase();
    dbMap.set(key, profile);
  });

  // Find profiles to insert or update
  csvProfiles.forEach((csvProfile) => {
    const key = createProfileKey(csvProfile);
    const dbProfile = dbMap.get(key);

    if (!dbProfile) {
      // New profile - insert
      toInsert.push(csvProfile);
    } else {
      // Existing profile - check if needs update
      if (hasChanges(csvProfile, dbProfile)) {
        toUpdate.push({
          id: dbProfile.id,
          newData: csvProfile,
        });
      } else {
        unchanged.push(dbProfile.id);
      }
    }
  });

  // Find profiles to delete (in DB but not in CSV)
  dbProfiles.forEach((dbProfile) => {
    if (!dbProfile.is_active) return; // Skip already inactive

    const key =
      `${dbProfile.first_name}|${dbProfile.last_initial}|${dbProfile.city}|${dbProfile.state}`.toLowerCase();
    if (!csvMap.has(key)) {
      toDelete.push(dbProfile.id);
    }
  });

  return { toInsert, toUpdate, toDelete, unchanged };
}

/**
 * Create unique key for profile matching
 */
function createProfileKey(profile: ParsedProfile | Profile): string {
  if ('first_name' in profile) {
    return `${profile.first_name}|${profile.last_initial}|${profile.city}|${profile.state}`.toLowerCase();
  }
  return '';
}

/**
 * Check if profile has changes
 */
function hasChanges(csvProfile: ParsedProfile, dbProfile: Profile): boolean {
  // Check fields that might change
  if (csvProfile.professional_summary !== dbProfile.professional_summary)
    return true;
  if (csvProfile.office !== dbProfile.office) return true;
  if (csvProfile.profession_type !== dbProfile.profession_type) return true;
  if (csvProfile.zip_code !== dbProfile.zip_code) return true;

  return false;
}
