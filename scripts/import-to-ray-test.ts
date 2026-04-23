/**
 * Import CSV data into Ray's Test Table with Geospatial Support
 * Run with: npm run import:ray-test
 *
 * This creates a test table with GEOGRAPHY column for fast radius searches
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

// Approximate zip code to lat/lng lookup based on prefix ranges
// Source: USPS zip code allocation patterns
const ZIP_RANGES: { [key: string]: { lat: number; lng: number } } = {
  // Northeast
  '010-027': { lat: 42.0, lng: -71.0 }, // MA
  '028-029': { lat: 41.8, lng: -71.4 }, // RI
  '030-038': { lat: 43.0, lng: -71.5 }, // NH
  '039-049': { lat: 44.5, lng: -69.0 }, // ME
  '050-059': { lat: 44.0, lng: -72.7 }, // VT
  '060-069': { lat: 41.6, lng: -72.7 }, // CT
  '070-089': { lat: 40.7, lng: -74.2 }, // NJ
  '100-149': { lat: 40.7, lng: -74.0 }, // NY
  '150-196': { lat: 39.9, lng: -75.2 }, // PA
  '197-199': { lat: 39.3, lng: -76.6 }, // DE, MD
  // Southeast
  '200-205': { lat: 38.9, lng: -77.0 }, // DC, VA
  '220-246': { lat: 37.5, lng: -77.5 }, // VA
  '247-268': { lat: 35.8, lng: -78.6 }, // WV, NC
  '270-289': { lat: 33.7, lng: -84.4 }, // SC, GA
  '290-299': { lat: 33.5, lng: -86.8 }, // SC
  '300-319': { lat: 33.75, lng: -84.39 }, // GA (Atlanta area)
  '320-339': { lat: 28.5, lng: -81.4 }, // FL
  '340-349': { lat: 33.5, lng: -86.8 }, // AL
  '350-369': { lat: 32.3, lng: -86.3 }, // AL
  '370-385': { lat: 36.17, lng: -86.78 }, // TN (Nashville)
  '386-397': { lat: 35.15, lng: -90.05 }, // TN (Memphis), MS
  '398-399': { lat: 38.2, lng: -85.7 }, // KY
  // Midwest
  '400-427': { lat: 38.2, lng: -85.7 }, // KY
  '430-432': { lat: 39.96, lng: -82.99 }, // OH (Columbus)
  '433-436': { lat: 39.76, lng: -84.19 }, // OH (Dayton)
  '437-438': { lat: 41.08, lng: -81.52 }, // OH (Akron)
  '440-449': { lat: 41.5, lng: -81.7 }, // OH (Cleveland/NE Ohio)
  '450-458': { lat: 39.76, lng: -86.16 }, // IN (Indianapolis)
  '460-469': { lat: 39.76, lng: -86.16 }, // IN
  '470-479': { lat: 41.9, lng: -87.6 }, // IL (Chicago area)
  '480-499': { lat: 42.3, lng: -83.0 }, // MI
  '500-528': { lat: 41.6, lng: -93.6 }, // IA
  '530-549': { lat: 43.1, lng: -89.4 }, // WI
  '550-567': { lat: 44.9, lng: -93.3 }, // MN
  '570-577': { lat: 43.5, lng: -96.7 }, // SD
  '580-588': { lat: 46.8, lng: -100.8 }, // ND
  '590-599': { lat: 46.6, lng: -112.0 }, // MT
  // South Central
  '600-629': { lat: 39.8, lng: -89.6 }, // IL
  '630-658': { lat: 38.6, lng: -90.2 }, // MO (St. Louis)
  '660-679': { lat: 39.1, lng: -94.6 }, // KS
  '680-699': { lat: 41.3, lng: -96.0 }, // NE
  '700-714': { lat: 29.95, lng: -90.07 }, // LA (New Orleans)
  '715-729': { lat: 30.45, lng: -91.15 }, // LA (Baton Rouge)
  '730-749': { lat: 35.5, lng: -97.5 }, // OK
  '750-759': { lat: 32.78, lng: -96.8 }, // TX (Dallas)
  '760-769': { lat: 32.75, lng: -97.33 }, // TX (Fort Worth)
  '770-779': { lat: 29.76, lng: -95.37 }, // TX (Houston)
  '780-789': { lat: 29.42, lng: -98.49 }, // TX (San Antonio)
  '790-799': { lat: 31.76, lng: -106.49 }, // TX (El Paso)
  '800-816': { lat: 39.7, lng: -104.9 }, // CO (Denver)
  '820-831': { lat: 42.9, lng: -106.3 }, // WY
  '832-838': { lat: 43.5, lng: -112.0 }, // ID
  '840-847': { lat: 40.8, lng: -111.9 }, // UT
  // Southwest / West
  '850-865': { lat: 33.45, lng: -112.07 }, // AZ (Phoenix)
  '870-884': { lat: 35.08, lng: -106.65 }, // NM (Albuquerque)
  '885-895': { lat: 36.17, lng: -115.14 }, // NV (Las Vegas)
  '900-918': { lat: 34.05, lng: -118.24 }, // CA (Los Angeles)
  '919-921': { lat: 32.72, lng: -117.16 }, // CA (San Diego)
  '922-928': { lat: 33.45, lng: -117.0 }, // CA (Inland Empire)
  '930-935': { lat: 35.37, lng: -119.02 }, // CA (Bakersfield)
  '936-966': { lat: 37.77, lng: -122.42 }, // CA (San Francisco Bay)
  '967-968': { lat: 21.31, lng: -157.86 }, // HI
  '970-979': { lat: 45.52, lng: -122.68 }, // OR (Portland)
  '980-994': { lat: 47.61, lng: -122.33 }, // WA (Seattle)
  '995-999': { lat: 61.22, lng: -149.9 }, // AK
};

/**
 * Get approximate lat/lng for a zip code based on prefix
 */
function getApproximateLocation(
  zipCode: string
): { lat: number; lng: number } | null {
  if (!zipCode || zipCode.length < 3) return null;

  const prefix = parseInt(zipCode.substring(0, 3));
  if (isNaN(prefix)) return null;

  for (const [range, coords] of Object.entries(ZIP_RANGES)) {
    const [start, end] = range.split('-').map(Number);
    if (prefix >= start && prefix <= end) {
      return coords;
    }
  }

  return null;
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

async function createTableIfNotExists(pool: sql.ConnectionPool): Promise<void> {
  console.log('2️⃣ Checking/Creating table...');

  // Check if table exists
  const tableCheck = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = '${TABLE_NAME}'
  `);

  if (tableCheck.recordset[0].cnt === 0) {
    console.log(`   Creating table ${TABLE_NAME}...`);

    await pool.request().query(`
      CREATE TABLE dbo.${TABLE_NAME} (
        Office NVARCHAR(50),
        ProfessionType NVARCHAR(50),
        Status NVARCHAR(50),
        PersonID BIGINT PRIMARY KEY,
        Name NVARCHAR(50),
        PhoneNumber NVARCHAR(50),
        EmailAddress NVARCHAR(100),
        OnAssignment BIT,
        AssignmnetID BIGINT,
        HireDate DATETIME,
        Address NVARCHAR(50),
        City NVARCHAR(50),
        State NVARCHAR(2),
        ZipCode VARCHAR(10),
        ProfessionalSummary NVARCHAR(3000),
        Skill NVARCHAR(500),
        RunDate DATE,
        RunTime DATETIME2,
        GeoLocation GEOGRAPHY NULL
      )
    `);

    // Create spatial index
    console.log('   Creating spatial index...');
    await pool.request().query(`
      CREATE SPATIAL INDEX IX_${TABLE_NAME}_GeoLocation
      ON dbo.${TABLE_NAME}(GeoLocation)
      USING GEOGRAPHY_AUTO_GRID
    `);

    // Create zip code index
    await pool.request().query(`
      CREATE INDEX IX_${TABLE_NAME}_ZipCode ON dbo.${TABLE_NAME}(ZipCode)
    `);

    console.log(`   ✅ Table ${TABLE_NAME} created with spatial index!\n`);
  } else {
    console.log(`   ✅ Table ${TABLE_NAME} already exists\n`);

    // Clear existing data for fresh import
    console.log('   🗑️ Clearing existing data...');
    await pool.request().query(`DELETE FROM dbo.${TABLE_NAME}`);
    console.log('   ✅ Table cleared\n');
  }
}

async function importData() {
  console.log('📊 Ray Test Table Import with Geospatial Support\n');
  console.log(`CSV File: ${CSV_FILE}`);
  console.log(`Target Table: dbo.${TABLE_NAME}`);
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log('');

  // Read CSV
  console.log('1️⃣ Reading CSV file...');
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`   ❌ CSV file not found: ${CSV_FILE}`);
    console.log(
      '\n💡 Make sure you have the Excel file exported to CSV first.'
    );
    console.log('   Run: npm run analyze:excel');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`   Found ${records.length} records\n`);

  // Connect to Azure SQL
  console.log('2️⃣ Connecting to Azure SQL...');
  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(config);
    console.log('   ✅ Connected!\n');
  } catch (error) {
    console.error('   ❌ Connection failed:', (error as Error).message);
    console.error('\n💡 Make sure your IP is in the Azure SQL firewall rules!');
    process.exit(1);
  }

  // Create table if needed
  await createTableIfNotExists(pool);

  // Import in batches
  console.log(
    `3️⃣ Importing ${records.length} records in batches of ${BATCH_SIZE}...`
  );

  let inserted = 0;
  let errors = 0;
  let withGeo = 0;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const hireDate = parseDate(row.HireDate);
        const onAssignment = row.OnAssignment?.toLowerCase() === 'yes';
        const zipCode = row.ZipCode?.toString().substring(0, 10) || null;

        // Get approximate coordinates for this zip code using prefix ranges
        const coords = zipCode ? getApproximateLocation(zipCode) : null;

        // Build the geography point if we have coordinates
        // Format: geography::Point(latitude, longitude, 4326)
        // 4326 is the SRID for WGS84 (GPS coordinates)
        let geoQuery = '';
        if (coords) {
          geoQuery = `geography::Point(${coords.lat}, ${coords.lng}, 4326)`;
          withGeo++;
        } else {
          geoQuery = 'NULL';
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
          console.error(
            `   ⚠️ Error inserting PersonId ${row.PersonId}: ${(error as Error).message}`
          );
        }
      }
    }

    const progress = Math.round(((i + batch.length) / records.length) * 100);
    process.stdout.write(
      `\r   Progress: ${progress}% (${inserted} inserted, ${withGeo} with geo, ${errors} errors)`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n4️⃣ Import complete!`);
  console.log(`   ✅ Inserted: ${inserted} records`);
  console.log(`   🌍 With GeoLocation: ${withGeo} records`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️ Time: ${elapsed}s`);

  // Verify
  const countAfter = await pool
    .request()
    .query(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
  const geoCount = await pool
    .request()
    .query(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE GeoLocation IS NOT NULL`
    );

  console.log(`\n📊 Table Status:`);
  console.log(`   Total records: ${countAfter.recordset[0].count}`);
  console.log(`   With GeoLocation: ${geoCount.recordset[0].count}`);

  await pool.close();
  console.log('\n✅ Done! Table ready for geospatial testing.');
}

importData().catch(console.error);
