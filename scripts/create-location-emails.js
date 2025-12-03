/**
 * Create Location Emails Table Script
 * =====================================
 *
 * This script creates the location_emails table in Azure SQL
 * and populates it with all 77 office-email mappings.
 *
 * Usage:
 *   node scripts/create-location-emails.js
 *
 * Environment Variables Required:
 *   AZURE_SQL_SERVER=ipsql2025.database.windows.net
 *   AZURE_SQL_DATABASE=intertalent_DB
 *   AZURE_SQL_USER=your_username
 *   AZURE_SQL_PASSWORD=your_password
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.AZURE_SQL_SERVER || 'ipsql2025.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'intertalent_DB',
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

// All 77 location-email mappings from client's Excel + Default
const locationEmails = [
  { market: 'Albuquerque', email: 'albuquerque@intersolutions.com' },
  { market: 'Atlanta East', email: 'atlantaeast@intersolutions.com' },
  { market: 'Atlanta West', email: 'atlanta@intersolutions.com' },
  { market: 'Austin North', email: 'austin@intersolutions.com' },
  { market: 'Austin South', email: 'austinsouth@intersolutions.com' },
  { market: 'Baltimore', email: 'baltimore@intersolutions.com' },
  { market: 'Baton Rouge', email: 'batonrouge@intersolutions.com' },
  { market: 'Bay Area', email: 'bayarea@intersolutions.com' },
  { market: 'Birmingham', email: 'birmingham@intersolutions.com' },
  { market: 'Boise', email: 'boise@intersolutions.com' },
  { market: 'Boston', email: 'boston@intersolutions.com' },
  { market: 'Charleston', email: 'charleston@intersolutions.com' },
  { market: 'Charlotte', email: 'charlotte@intersolutions.com' },
  { market: 'Chicago', email: 'chicago@intersolutions.com' },
  { market: 'Cincinnati', email: 'cincinnati@intersolutions.com' },
  { market: 'Cleveland', email: 'cleveland@intersolutions.com' },
  { market: 'Columbia', email: 'columbia@intersolutions.com' },
  { market: 'Columbus', email: 'columbus@intersolutions.com' },
  { market: 'Concierge', email: 'concierge@intersolutions.com' },
  { market: 'Dallas North', email: 'dallas@intersolutions.com' },
  { market: 'Dallas South', email: 'southdallas@intersolutions.com' },
  { market: 'DC Metro', email: 'maryland_dc@intersolutions.com' },
  { market: 'Delaware County', email: 'delawarecounty@intersolutions.com' },
  { market: 'Denver', email: 'denver@intersolutions.com' },
  { market: 'Des Moines', email: 'desmoines@intersolutions.com' },
  { market: 'Detroit', email: 'detroit@intersolutions.com' },
  { market: 'El Paso', email: 'elpaso@intersolutions.com' },
  { market: 'Fort Lauderdale', email: 'fortlauderdale@intersolutions.com' },
  { market: 'Fort Worth', email: 'fortworth@intersolutions.com' },
  { market: 'Greensboro', email: 'greensboro@intersolutions.com' },
  { market: 'Greenville', email: 'greenville@intersolutions.com' },
  { market: 'Houston East', email: 'houstoneast@intersolutions.com' },
  { market: 'Houston North', email: 'houston@intersolutions.com' },
  { market: 'Houston South', email: 'houstonsouth@intersolutions.com' },
  { market: 'Houston West', email: 'houstonwest@intersolutions.com' },
  { market: 'Indianapolis', email: 'indianapolis@intersolutions.com' },
  { market: 'Inland Empire', email: 'inlandempire@intersolutions.com' },
  { market: 'Jacksonville', email: 'jacksonville@intersolutions.com' },
  { market: 'Kansas City', email: 'kc@intersolutions.com' },
  { market: 'Las Vegas', email: 'lasvegas@intersolutions.com' },
  { market: 'Little Rock', email: 'littlerock@intersolutions.com' },
  { market: 'Los Angeles East', email: 'losangeleseast@intersolutions.com' },
  { market: 'Los Angeles West', email: 'losangeles@intersolutions.com' },
  { market: 'Louisville', email: 'louisville@intersolutions.com' },
  { market: 'Maryland', email: 'maryland@intersolutions.com' },
  { market: 'Memphis', email: 'memphis@intersolutions.com' },
  { market: 'Miami', email: 'miami@intersolutions.com' },
  { market: 'Milwaukee', email: 'milwaukee@intersolutions.com' },
  { market: 'Minneapolis', email: 'twincities@intersolutions.com' },
  { market: 'Myrtle Beach', email: 'myrtlebeach@intersolutions.com' },
  { market: 'Nashville', email: 'nashville@intersolutions.com' },
  { market: 'New Orleans', email: 'neworleans@intersolutions.com' },
  { market: 'Norfolk', email: 'norfolk@intersolutions.com' },
  {
    market: 'Northern California North',
    email: 'norcalnorth@intersolutions.com',
  },
  {
    market: 'Northern California South',
    email: 'norcalsouth@intersolutions.com',
  },
  { market: 'Northern Virginia', email: 'virginia@intersolutions.com' },
  { market: 'Oklahoma City', email: 'oklahomacity@intersolutions.com' },
  { market: 'Omaha', email: 'omaha@intersolutions.com' },
  { market: 'Orange County', email: 'orangecounty@intersolutions.com' },
  { market: 'Orlando', email: 'orlando@intersolutions.com' },
  { market: 'Pensacola', email: 'pensacola@intersolutions.com' },
  { market: 'Philadelphia', email: 'philadelphia@intersolutions.com' },
  { market: 'Phoenix', email: 'phoenix@intersolutions.com' },
  { market: 'Pittsburgh', email: 'pittsburgh@intersolutions.com' },
  { market: 'Portland', email: 'portland@intersolutions.com' },
  { market: 'Raleigh', email: 'raleigh@intersolutions.com' },
  { market: 'Richmond', email: 'richmond@intersolutions.com' },
  { market: 'Salt Lake City', email: 'saltlakecity@intersolutions.com' },
  { market: 'San Antonio', email: 'sanantonio@intersolutions.com' },
  { market: 'San Diego', email: 'sandiego@intersolutions.com' },
  { market: 'San Francisco', email: 'sanfran@intersolutions.com' },
  { market: 'Seattle', email: 'seattle@intersolutions.com' },
  { market: 'St. Louis', email: 'stlouis@intersolutions.com' },
  { market: 'Tampa', email: 'tampa@intersolutions.com' },
  { market: 'Tulsa', email: 'tulsa@intersolutions.com' },
  { market: 'West Texas', email: 'westtexas@intersolutions.com' },
  { market: 'Wilmington', email: 'wilmington@intersolutions.com' },
  { market: 'Default', email: 'info@intersolutions.com' },
];

async function createLocationEmailsTable() {
  let pool;

  try {
    console.log('Connecting to Azure SQL...');
    console.log(`Server: ${config.server}`);
    console.log(`Database: ${config.database}`);

    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Drop existing table if it exists
    console.log('Dropping existing table if it exists...');
    await pool.request().query(`
      IF OBJECT_ID('dbo.location_emails', 'U') IS NOT NULL
        DROP TABLE dbo.location_emails
    `);

    // Create the table
    console.log('Creating location_emails table...');
    await pool.request().query(`
      CREATE TABLE dbo.location_emails (
        id INT IDENTITY(1,1) PRIMARY KEY,
        market NVARCHAR(100) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // Create index
    console.log('Creating index on market column...');
    await pool.request().query(`
      CREATE INDEX IX_location_emails_market ON dbo.location_emails(market)
    `);

    // Insert all records
    console.log(
      `\nInserting ${locationEmails.length} location-email mappings...`
    );

    for (const { market, email } of locationEmails) {
      await pool
        .request()
        .input('market', sql.NVarChar, market)
        .input('email', sql.NVarChar, email).query(`
          INSERT INTO dbo.location_emails (market, email) 
          VALUES (@market, @email)
        `);
      process.stdout.write('.');
    }

    console.log('\n');

    // Verify the data
    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM dbo.location_emails
    `);
    console.log(`Total records inserted: ${countResult.recordset[0].total}`);

    // Show first few records
    const sampleResult = await pool.request().query(`
      SELECT TOP 5 market, email FROM dbo.location_emails ORDER BY market
    `);
    console.log('\nSample records:');
    sampleResult.recordset.forEach((r) => {
      console.log(`  ${r.market}: ${r.email}`);
    });

    console.log(
      '\n✅ Location emails table created and populated successfully!'
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

createLocationEmailsTable();
