/**
 * Test Azure SQL Geospatial Query Performance
 * Compares different approaches for radius search
 *
 * Run with: npm run test:geo
 */

import sql from 'mssql';
import { getMssqlBaseConfig } from '../src/lib/db/sql-config';

const TABLE_NAME = 'RayTestShowcase';

const config: sql.config = getMssqlBaseConfig();

// Test parameters
const TEST_ZIP = '44289'; // Example zip code
const RADIUS_MILES = 50;

// Convert miles to meters (Azure SQL uses meters)
const radiusMeters = RADIUS_MILES * 1609.344;

async function runTests() {
  console.log('🌍 Azure SQL Geospatial Performance Test\n');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Test ZIP: ${TEST_ZIP}`);
  console.log(
    `Radius: ${RADIUS_MILES} miles (${radiusMeters.toFixed(0)} meters)`
  );
  console.log('');

  // Connect
  console.log('Connecting to Azure SQL...');
  const pool = await sql.connect(config);
  console.log('✅ Connected!\n');

  // Get table stats
  const stats = await pool.request().query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN GeoLocation IS NOT NULL THEN 1 END) as with_geo
    FROM ${TABLE_NAME}
  `);
  console.log(`📊 Table Stats:`);
  console.log(`   Total records: ${stats.recordset[0].total}`);
  console.log(`   With GeoLocation: ${stats.recordset[0].with_geo}`);
  console.log('');

  // Get center point coordinates for test zip
  // Using approximate coordinates for 44289 (Sterling, OH)
  const centerLat = 41.01; // Sterling, OH approximate
  const centerLng = -81.84;

  console.log(`📍 Center Point: (${centerLat}, ${centerLng})\n`);
  console.log('='.repeat(60));

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Native Geography STDistance (fastest with spatial index)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🏆 TEST 1: Azure SQL Native Geography (STDistance)\n');
  console.log(
    "   This uses Azure's built-in spatial index for O(log n) performance"
  );

  const start1 = Date.now();
  const result1 = await pool.request().query(`
    DECLARE @center GEOGRAPHY = geography::Point(${centerLat}, ${centerLng}, 4326);
    
    SELECT 
      PersonID, Name, City, State, ZipCode,
      GeoLocation.STDistance(@center) / 1609.344 as distance_miles
    FROM ${TABLE_NAME}
    WHERE GeoLocation IS NOT NULL
      AND GeoLocation.STDistance(@center) <= ${radiusMeters}
    ORDER BY GeoLocation.STDistance(@center)
  `);
  const time1 = Date.now() - start1;

  console.log(`   ⏱️ Time: ${time1}ms`);
  console.log(
    `   📊 Results: ${result1.recordset.length} profiles within ${RADIUS_MILES} miles`
  );
  if (result1.recordset.length > 0) {
    console.log(
      `   📍 Nearest: ${result1.recordset[0].Name} in ${result1.recordset[0].City}, ${result1.recordset[0].State} (${result1.recordset[0].distance_miles?.toFixed(1)} miles)`
    );
    console.log(
      `   📍 Farthest: ${result1.recordset[result1.recordset.length - 1].Name} (${result1.recordset[result1.recordset.length - 1].distance_miles?.toFixed(1)} miles)`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Bounding Box + Distance (pre-filter optimization)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔲 TEST 2: Bounding Box Pre-filter + STDistance\n');
  console.log(
    '   This uses a rectangular pre-filter before circular distance check'
  );

  // Approximate bounding box (very rough at this latitude)
  const latDelta = RADIUS_MILES / 69.0; // ~69 miles per degree latitude
  const lngDelta =
    RADIUS_MILES / (69.0 * Math.cos((centerLat * Math.PI) / 180));

  const start2 = Date.now();
  const result2 = await pool.request().query(`
    DECLARE @center GEOGRAPHY = geography::Point(${centerLat}, ${centerLng}, 4326);
    DECLARE @bbox GEOGRAPHY = geography::STGeomFromText(
      'POLYGON((${centerLng - lngDelta} ${centerLat - latDelta}, 
                ${centerLng + lngDelta} ${centerLat - latDelta}, 
                ${centerLng + lngDelta} ${centerLat + latDelta}, 
                ${centerLng - lngDelta} ${centerLat + latDelta}, 
                ${centerLng - lngDelta} ${centerLat - latDelta}))', 4326);
    
    SELECT 
      PersonID, Name, City, State, ZipCode,
      GeoLocation.STDistance(@center) / 1609.344 as distance_miles
    FROM ${TABLE_NAME}
    WHERE GeoLocation IS NOT NULL
      AND GeoLocation.STIntersects(@bbox) = 1
      AND GeoLocation.STDistance(@center) <= ${radiusMeters}
    ORDER BY GeoLocation.STDistance(@center)
  `);
  const time2 = Date.now() - start2;

  console.log(`   ⏱️ Time: ${time2}ms`);
  console.log(`   📊 Results: ${result2.recordset.length} profiles`);

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Without Spatial Index (for comparison - what you had before)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🐢 TEST 3: Manual Haversine in SQL (no spatial features)\n');
  console.log(
    '   This calculates distance for EVERY row - O(n) full table scan'
  );

  const start3 = Date.now();
  const result3 = await pool.request().query(`
    SELECT 
      PersonID, Name, City, State, ZipCode,
      -- Haversine formula in SQL
      3959 * ACOS(
        COS(RADIANS(${centerLat})) * COS(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN 41.5
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN 39.96
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN 39.76
            ELSE 40.0
          END
        )) *
        COS(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN -81.7
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN -82.99
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN -86.16
            ELSE -82.0
          END
        ) - RADIANS(${centerLng})) +
        SIN(RADIANS(${centerLat})) * SIN(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN 41.5
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN 39.96
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN 39.76
            ELSE 40.0
          END
        ))
      ) as distance_miles
    FROM ${TABLE_NAME}
    WHERE ZipCode IS NOT NULL
    HAVING 3959 * ACOS(
        COS(RADIANS(${centerLat})) * COS(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN 41.5
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN 39.96
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN 39.76
            ELSE 40.0
          END
        )) *
        COS(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN -81.7
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN -82.99
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN -86.16
            ELSE -82.0
          END
        ) - RADIANS(${centerLng})) +
        SIN(RADIANS(${centerLat})) * SIN(RADIANS(
          CASE 
            WHEN LEFT(ZipCode, 3) BETWEEN '440' AND '449' THEN 41.5
            WHEN LEFT(ZipCode, 3) BETWEEN '430' AND '432' THEN 39.96
            WHEN LEFT(ZipCode, 3) BETWEEN '450' AND '458' THEN 39.76
            ELSE 40.0
          END
        ))
      ) <= ${RADIUS_MILES}
    ORDER BY distance_miles
  `);
  const time3 = Date.now() - start3;

  console.log(`   ⏱️ Time: ${time3}ms`);
  console.log(`   📊 Results: ${result3.recordset.length} profiles`);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 PERFORMANCE SUMMARY\n');
  console.log(`   | Method                     | Time     | Speedup |`);
  console.log(`   |----------------------------|----------|---------|`);
  console.log(
    `   | Native STDistance          | ${time1.toString().padStart(6)}ms | baseline |`
  );
  console.log(
    `   | Bounding Box + STDistance  | ${time2.toString().padStart(6)}ms | ${(time1 / time2).toFixed(1)}x     |`
  );
  console.log(
    `   | Manual Haversine (old way) | ${time3.toString().padStart(6)}ms | ${(time3 / time1).toFixed(1)}x slower |`
  );

  console.log('\n💡 Recommendation:');
  if (time1 < time3) {
    console.log(
      `   Use Native STDistance - it's ${(time3 / time1).toFixed(1)}x faster than manual calculation!`
    );
  } else {
    console.log('   Need to optimize spatial index or data quality');
  }

  await pool.close();
  console.log('\n✅ Tests complete!');
}

runTests().catch(console.error);
