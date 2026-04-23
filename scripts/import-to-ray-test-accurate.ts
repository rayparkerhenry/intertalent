/**
 * Import CSV data into Ray's Test Table with ACCURATE Geospatial Data
 * Uses Zippopotam.us API to get real zip code coordinates
 *
 * Run with: npm run import:ray-test-accurate
 */

import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { getMssqlBaseConfig } from '../src/lib/db/sql-config';

const CSV_FILE = path.join(
  __dirname,
  '../data/InterSolutionsEmployeeReportwB.csv'
);
const BATCH_SIZE = 100;
const TABLE_NAME = 'RayTestShowcase';

// Cache file for zip code coordinates (so we don't re-fetch)
const ZIP_CACHE_FILE = path.join(
  __dirname,
  '../data/zip-coordinates-cache.json'
);

const config: sql.config = getMssqlBaseConfig();

interface CSVRow {
  Office: string;
  ProfessionType: string;
  Status: string;
  PersonId: string;
  Name: string;
  PhoneNumber: string;
  EmailAddress: string;
  OnAssignment: string;
  AssignmnetId: string;
  HireDate: string;
  Address: string;
  City: string;
  State: string;
  ZipCode: string;
  ProfessionalSummary: string;
  Skill: string;
}

interface ZipCoordinates {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

// In-memory cache for zip coordinates
const zipCache: Map<string, ZipCoordinates | null> = new Map();

/**
 * Load zip cache from file
 */
function loadZipCache(): void {
  if (fs.existsSync(ZIP_CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ZIP_CACHE_FILE, 'utf-8'));
      for (const [zip, coords] of Object.entries(data)) {
        zipCache.set(zip, coords as ZipCoordinates | null);
      }
      console.log(`   Loaded ${zipCache.size} cached zip coordinates`);
    } catch (e) {
      console.log('   Could not load zip cache, starting fresh');
    }
  }
}

/**
 * Save zip cache to file
 */
function saveZipCache(): void {
  const data: Record<string, ZipCoordinates | null> = {};
  for (const [zip, coords] of zipCache.entries()) {
    data[zip] = coords;
  }
  fs.writeFileSync(ZIP_CACHE_FILE, JSON.stringify(data, null, 2));
  console.log(`   Saved ${zipCache.size} zip coordinates to cache`);
}

/**
 * Get coordinates for a zip code using Zippopotam.us API
 * Rate-limited to avoid overwhelming the free API
 */
async function getZipCoordinates(
  zipCode: string
): Promise<ZipCoordinates | null> {
  // Normalize zip code (first 5 digits)
  const zip5 = zipCode.substring(0, 5);

  // Check cache first
  if (zipCache.has(zip5)) {
    return zipCache.get(zip5) || null;
  }

  try {
    // Add small delay to respect rate limits (100ms between calls)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://api.zippopotam.us/us/${zip5}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.places && data.places[0]) {
        const coords: ZipCoordinates = {
          lat: parseFloat(data.places[0].latitude),
          lng: parseFloat(data.places[0].longitude),
          city: data.places[0]['place name'],
          state: data.places[0]['state abbreviation'],
        };
        zipCache.set(zip5, coords);
        return coords;
      }
    }

    // Invalid zip code
    zipCache.set(zip5, null);
    return null;
  } catch (error) {
    // API error - don't cache, might be temporary
    console.warn(`   API error for ${zip5}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Parse date from M/D/YYYY or YYYY-MM-DD format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

async function importData() {
  console.log('📊 Ray Test Table Import with ACCURATE Geospatial Data\n');
  console.log(`CSV File: ${CSV_FILE}`);
  console.log(`Target Table: dbo.${TABLE_NAME}`);
  console.log(`Server: ${config.server}`);
  console.log('');

  // Load existing zip cache
  console.log('1️⃣ Loading zip coordinate cache...');
  loadZipCache();
  console.log('');

  // Read CSV
  console.log('2️⃣ Reading CSV file...');
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`   ❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`   Found ${records.length} records\n`);

  // Get unique zip codes to minimize API calls
  console.log('3️⃣ Pre-fetching unique zip code coordinates...');
  const uniqueZips = new Set<string>();
  for (const row of records) {
    if (row.ZipCode) {
      uniqueZips.add(row.ZipCode.substring(0, 5));
    }
  }
  console.log(`   Found ${uniqueZips.size} unique zip codes`);

  // Fetch coordinates for zips not in cache
  const uncachedZips = Array.from(uniqueZips).filter((z) => !zipCache.has(z));
  console.log(`   Need to fetch ${uncachedZips.length} new zip codes from API`);

  if (uncachedZips.length > 0) {
    console.log(`   Fetching coordinates (this may take a few minutes)...`);
    let fetched = 0;
    let failed = 0;

    for (const zip of uncachedZips) {
      const coords = await getZipCoordinates(zip);
      if (coords) {
        fetched++;
      } else {
        failed++;
      }

      // Progress update every 50 zips
      if ((fetched + failed) % 50 === 0) {
        process.stdout.write(
          `\r   Progress: ${fetched + failed}/${uncachedZips.length} (${fetched} found, ${failed} invalid)`
        );
      }
    }
    console.log(
      `\n   ✅ Fetched ${fetched} coordinates, ${failed} invalid zips`
    );

    // Save cache
    saveZipCache();
  }
  console.log('');

  // Connect to Azure SQL
  console.log('4️⃣ Connecting to Azure SQL...');
  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(config);
    console.log('   ✅ Connected!\n');
  } catch (error) {
    console.error('   ❌ Connection failed:', (error as Error).message);
    process.exit(1);
  }

  // Check if table exists
  const tableCheck = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = '${TABLE_NAME}'
  `);

  if (tableCheck.recordset[0].cnt === 0) {
    console.error(`   ❌ Table ${TABLE_NAME} does not exist!`);
    console.log('   Run the CREATE TABLE script in Azure Query Editor first.');
    process.exit(1);
  }

  // Clear existing data
  console.log('   🗑️ Clearing existing data...');
  await pool.request().query(`DELETE FROM dbo.${TABLE_NAME}`);
  console.log('   ✅ Table cleared\n');

  // Import in batches
  console.log(`5️⃣ Importing ${records.length} records...`);

  let inserted = 0;
  let errors = 0;
  let withGeo = 0;
  let withoutGeo = 0;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const hireDate = parseDate(row.HireDate);
        const onAssignment = row.OnAssignment?.toLowerCase() === 'yes';
        const zipCode = row.ZipCode?.toString().substring(0, 10) || null;
        const zip5 = zipCode ? zipCode.substring(0, 5) : null;

        // Get ACCURATE coordinates from cache
        const coords = zip5 ? zipCache.get(zip5) : null;

        // Build the geography point
        let geoQuery = 'NULL';
        if (coords) {
          geoQuery = `geography::Point(${coords.lat}, ${coords.lng}, 4326)`;
          withGeo++;
        } else {
          withoutGeo++;
        }

        await pool
          .request()
          .input('office', sql.NVarChar(50), row.Office || null)
          .input('professionType', sql.NVarChar(50), row.ProfessionType || null)
          .input('status', sql.NVarChar(50), row.Status || null)
          .input(
            'personId',
            sql.BigInt,
            row.PersonId ? parseInt(row.PersonId) : null
          )
          .input('name', sql.NVarChar(50), row.Name || null)
          .input('phoneNumber', sql.NVarChar(50), row.PhoneNumber || null)
          .input('emailAddress', sql.NVarChar(100), row.EmailAddress || null)
          .input('onAssignment', sql.Bit, onAssignment)
          .input(
            'assignmentId',
            sql.BigInt,
            row.AssignmnetId ? parseInt(row.AssignmnetId) : null
          )
          .input('hireDate', sql.DateTime, hireDate)
          .input(
            'address',
            sql.NVarChar(50),
            row.Address?.substring(0, 50) || null
          )
          .input('city', sql.NVarChar(50), row.City || null)
          .input('state', sql.NVarChar(2), row.State?.substring(0, 2) || null)
          .input('zipCode', sql.VarChar(10), zipCode)
          .input(
            'professionalSummary',
            sql.NVarChar(3000),
            row.ProfessionalSummary?.substring(0, 3000) || null
          )
          .input(
            'skill',
            sql.NVarChar(500),
            row.Skill?.substring(0, 500) || null
          )
          .input('runDate', sql.Date, new Date())
          .input('runTime', sql.DateTime2, new Date()).query(`
            INSERT INTO ${TABLE_NAME} (
              Office, ProfessionType, Status, PersonID, Name,
              PhoneNumber, EmailAddress, OnAssignment, AssignmnetID, HireDate,
              Address, City, State, ZipCode, ProfessionalSummary,
              Skill, RunDate, RunTime, GeoLocation
            ) VALUES (
              @office, @professionType, @status, @personId, @name,
              @phoneNumber, @emailAddress, @onAssignment, @assignmentId, @hireDate,
              @address, @city, @state, @zipCode, @professionalSummary,
              @skill, @runDate, @runTime, ${geoQuery}
            )
          `);

        inserted++;
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`   ⚠️ Error: ${(error as Error).message}`);
        }
      }
    }

    const progress = Math.round(((i + batch.length) / records.length) * 100);
    process.stdout.write(
      `\r   Progress: ${progress}% (${inserted} inserted, ${withGeo} with geo)`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n6️⃣ Import complete!`);
  console.log(`   ✅ Inserted: ${inserted} records`);
  console.log(`   🌍 With ACCURATE GeoLocation: ${withGeo} records`);
  console.log(
    `   ⚠️ Without GeoLocation: ${withoutGeo} records (invalid zips)`
  );
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️ Time: ${elapsed}s`);

  // Verify with sample data
  console.log('\n📊 Sample Data Verification:');
  const samples = await pool.request().query(`
    SELECT TOP 5 
      ZipCode, 
      City, 
      State,
      GeoLocation.Lat as Latitude,
      GeoLocation.Long as Longitude
    FROM ${TABLE_NAME}
    WHERE GeoLocation IS NOT NULL
    ORDER BY ZipCode
  `);

  console.log('   | Zip Code | City | State | Lat | Lng |');
  console.log('   |----------|------|-------|-----|-----|');
  for (const row of samples.recordset) {
    console.log(
      `   | ${row.ZipCode} | ${row.City?.substring(0, 15)} | ${row.State} | ${row.Latitude?.toFixed(4)} | ${row.Longitude?.toFixed(4)} |`
    );
  }

  await pool.close();
  console.log('\n✅ Done! Table ready with ACCURATE geospatial data.');
  console.log('\n💡 Next: Run npm run test:geo to compare performance!');
}

importData().catch(console.error);
