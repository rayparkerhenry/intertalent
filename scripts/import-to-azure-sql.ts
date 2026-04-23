/**
 * Import CSV data into Azure SQL InterTalentShowcase table
 * Run with: npm run import:azure
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
  AssignmnetId: string; // Note: typo in Excel
  HireDate: string;
  Address: string;
  City: string;
  State: string;
  ZipCode: string;
  ProfessionalSummary: string;
  Skill: string;
}

/**
 * Parse date from M/D/YYYY or YYYY-MM-DD format
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Try M/D/YYYY format first
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try YYYY-MM-DD format
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try to parse as generic date
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

async function importData() {
  console.log('📊 Azure SQL Data Import\n');
  console.log(`CSV File: ${CSV_FILE}`);
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log('');

  // Read CSV
  console.log('1️⃣ Reading CSV file...');
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

  // Check current record count
  const countBefore = await pool
    .request()
    .query('SELECT COUNT(*) as count FROM InterTalentShowcase');
  console.log(
    `   Current records in table: ${countBefore.recordset[0].count}\n`
  );

  // Import in batches
  console.log(
    `3️⃣ Importing ${records.length} records in batches of ${BATCH_SIZE}...`
  );

  let inserted = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const hireDate = parseDate(row.HireDate);
        const onAssignment =
          row.OnAssignment?.toLowerCase() === 'yes' ? true : false;

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
          .input(
            'zipCode',
            sql.VarChar(10),
            row.ZipCode?.toString().substring(0, 10) || null
          )
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
            INSERT INTO InterTalentShowcase (
              Office, ProfessionType, Status, PersonID, Name,
              PhoneNumber, EmailAddress, OnAssignment, AssignmentID, HireDate,
              Address, City, State, ZipCode, ProfessionalSummary,
              Skill, RunDate, RunTime
            ) VALUES (
              @office, @professionType, @status, @personId, @name,
              @phoneNumber, @emailAddress, @onAssignment, @assignmentId, @hireDate,
              @address, @city, @state, @zipCode, @professionalSummary,
              @skill, @runDate, @runTime
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

    // Progress update
    const progress = Math.round(((i + batch.length) / records.length) * 100);
    process.stdout.write(
      `\r   Progress: ${progress}% (${inserted} inserted, ${errors} errors)`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n4️⃣ Import complete!`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️ Time: ${elapsed}s`);

  // Verify final count
  const countAfter = await pool
    .request()
    .query('SELECT COUNT(*) as count FROM InterTalentShowcase');
  console.log(`\n   Total records now: ${countAfter.recordset[0].count}`);

  // Show sample
  console.log('\n5️⃣ Sample data:');
  const sample = await pool.request().query(`
    SELECT TOP 3 PersonID, Name, ProfessionType, City, State, HireDate
    FROM InterTalentShowcase
    ORDER BY PersonID
  `);
  sample.recordset.forEach((row, i) => {
    const hireDate = row.HireDate
      ? new Date(row.HireDate).toLocaleDateString()
      : 'N/A';
    console.log(
      `   ${i + 1}. ${row.Name} - ${row.ProfessionType} (${row.City}, ${row.State}) - Hired: ${hireDate}`
    );
  });

  await pool.close();
  console.log('\n✅ Done!');
}

importData().catch(console.error);
