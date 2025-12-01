/**
 * Test Azure SQL Connection
 * Run with: npm run test:azure
 */

import sql from 'mssql';

async function testAzureSqlConnection() {
  console.log('🔄 Testing Azure SQL Connection...\n');

  const config: sql.config = {
    server: process.env.AZURE_SQL_SERVER || 'ipsql2025.database.windows.net',
    database: process.env.AZURE_SQL_DATABASE || 'intertalent_DB',
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: {
      encrypt: true,
      enableArithAbort: true,
      trustServerCertificate: false,
    },
  };

  console.log('📋 Connection Config:');
  console.log(`   Server: ${config.server}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${'*'.repeat(config.password?.length || 0)}`);
  console.log('');

  try {
    // Test 1: Basic Connection
    console.log('1️⃣ Connecting to Azure SQL...');
    const pool = await sql.connect(config);
    console.log('   ✅ Connected successfully!\n');

    // Test 2: Check Tables
    console.log('2️⃣ Listing tables in database...');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('   Tables found:');
    tablesResult.recordset.forEach((row) => {
      console.log(`   - ${row.TABLE_NAME}`);
    });
    console.log('');

    // Test 3: Check InterTalentShowcase schema
    console.log('3️⃣ Checking InterTalentShowcase table structure...');
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'InterTalentShowcase'
      ORDER BY ORDINAL_POSITION
    `);

    if (columnsResult.recordset.length === 0) {
      console.log('   ⚠️ InterTalentShowcase table not found!');
    } else {
      console.log('   Columns:');
      columnsResult.recordset.forEach((col) => {
        const length = col.CHARACTER_MAXIMUM_LENGTH
          ? `(${col.CHARACTER_MAXIMUM_LENGTH})`
          : '';
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length}`);
      });
    }
    console.log('');

    // Test 4: Count records
    console.log('4️⃣ Counting records in InterTalentShowcase...');
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM InterTalentShowcase
    `);
    const total = countResult.recordset[0].total;
    console.log(`   Total records: ${total}`);

    if (total === 0) {
      console.log('   ℹ️ Table is empty - waiting for client to populate data');
    } else {
      // Test 5: Sample data
      console.log('\n5️⃣ Sample data (first 3 records):');
      const sampleResult = await pool.request().query(`
        SELECT TOP 3 PersonID, Name, ProfessionType, City, State
        FROM InterTalentShowcase
      `);
      sampleResult.recordset.forEach((row, i) => {
        console.log(
          `   ${i + 1}. ${row.Name} - ${row.ProfessionType} (${row.City}, ${row.State})`
        );
      });
    }

    // Close connection
    await pool.close();
    console.log('\n✅ All tests passed! Azure SQL connection is working.');
  } catch (error) {
    console.error('\n❌ Connection failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);

      if (error.message.includes('Login failed')) {
        console.error('\n💡 Possible solutions:');
        console.error(
          '   1. Check AZURE_SQL_USER and AZURE_SQL_PASSWORD in .env.local'
        );
        console.error('   2. Verify the user has access to the database');
      } else if (error.message.includes('Cannot open server')) {
        console.error('\n💡 Possible solutions:');
        console.error('   1. Check AZURE_SQL_SERVER in .env.local');
        console.error(
          '   2. Verify your IP is in the Azure SQL firewall rules'
        );
      } else if (error.message.includes('network')) {
        console.error('\n💡 Possible solutions:');
        console.error('   1. Check your internet connection');
        console.error('   2. Verify the server name is correct');
      }
    }
    process.exit(1);
  }
}

testAzureSqlConnection();
