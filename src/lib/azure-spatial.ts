/**
 * Azure SQL Geospatial Utilities
 *
 * Provides fast radius search using Azure SQL's built-in GEOGRAPHY type
 * and spatial indexes. This replaces the slow per-profile geocoding approach.
 */

import sql from 'mssql';
import { getPool } from './db/clients/azure-sql';
import { getZipLocation } from './geospatial';

/**
 * Check if a table has populated GeoLocation data
 * Returns true if spatial queries can be used
 */
export async function hasGeoLocationData(tableName: string): Promise<boolean> {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COUNT(*) as count FROM ${tableName} WHERE GeoLocation IS NOT NULL
    `);
    const count = result.recordset[0].count;
    console.log(`Table ${tableName} has ${count} records with GeoLocation`);
    return count > 0;
  } catch (error) {
    console.error('Error checking GeoLocation data:', error);
    return false;
  }
}

/**
 * Get all unique zip codes within a radius using Azure SQL spatial query
 *
 * @param centerZip - Center zip code
 * @param radiusMiles - Radius in miles
 * @param tableName - Table with GeoLocation column
 * @returns Array of zip codes within radius, or null if spatial query fails
 */
export async function getZipCodesWithinRadiusAzure(
  centerZip: string,
  radiusMiles: number,
  tableName: string
): Promise<string[] | null> {
  try {
    // Get center coordinates
    const centerLocation = await getZipLocation(centerZip);
    if (!centerLocation) {
      console.warn(`Could not geocode center zip: ${centerZip}`);
      return null;
    }

    const radiusMeters = radiusMiles * 1609.344; // Convert miles to meters
    const pool = await getPool();

    console.log(
      `Azure SQL spatial query: ${radiusMiles} miles from ${centerZip} (${centerLocation.lat}, ${centerLocation.lng})`
    );
            // Adjusted to follow logic of avoiding empty professional summaries and other statuses. 12/18/2025 MS 
    const result = await pool
      .request()
      .input('centerLat', sql.Float, centerLocation.lat)
      .input('centerLng', sql.Float, centerLocation.lng)
      .input('radiusMeters', sql.Float, radiusMeters).query(`
        DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
        
        SELECT DISTINCT ZipCode
        FROM ${tableName}
        WHERE GeoLocation IS NOT NULL
          AND GeoLocation.STDistance(@center) <= @radiusMeters
          AND ProfessionalSummary IS NOT NULL
          AND LTRIM(RTRIM(ProfessionalSummary)) <> ''
          AND Status = 'Active'
          AND OnAssignment = 0
      `);

    const zipCodes = result.recordset
      .map((row: { ZipCode: string }) => row.ZipCode)
      .filter((zip: string) => zip != null);

    console.log(
      `Found ${zipCodes.length} unique zip codes within ${radiusMiles} miles`
    );
    return zipCodes;
  } catch (error) {
    console.error('Azure SQL spatial query failed:', error);
    return null;
  }
}

/**
 * Get profile IDs within a radius using Azure SQL spatial query
 * This is even more direct - returns IDs ready for filtering
 *
 * @param centerZip - Center zip code
 * @param radiusMiles - Radius in miles
 * @param tableName - Table with GeoLocation column
 * @param additionalConditions - Optional SQL conditions (e.g., "Status = 'Active'")
 * @returns Array of PersonIDs within radius, or null if query fails
 */
export async function getProfileIdsWithinRadiusAzure(
  centerZip: string,
  radiusMiles: number,
  tableName: string,
  additionalConditions?: string
): Promise<string[] | null> {
  try {
    const centerLocation = await getZipLocation(centerZip);
    if (!centerLocation) {
      console.warn(`Could not geocode center zip: ${centerZip}`);
      return null;
    }

    const radiusMeters = radiusMiles * 1609.344;
    const pool = await getPool();
    //added in where clause to prevent empty professional summaries - 12/15/2025 MS 
    const baseConditions = `
      GeoLocation IS NOT NULL
      AND GeoLocation.STDistance(@center) <= @radiusMeters
      AND ProfessionalSummary IS NOT NULL
      AND LTRIM(RTRIM(ProfessionalSummary)) <> ''
      AND Status = 'Active'
      AND OnAssignment = 0
    `;

    const whereClause = additionalConditions
      ? `${baseConditions} AND ${additionalConditions}`
      : baseConditions;
    

    const result = await pool
      .request()
      .input('centerLat', sql.Float, centerLocation.lat)
      .input('centerLng', sql.Float, centerLocation.lng)
      .input('radiusMeters', sql.Float, radiusMeters).query(`
        DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
        
        SELECT PersonID, GeoLocation.STDistance(@center) / 1609.344 as distance_miles
        FROM ${tableName}
        WHERE ${whereClause}
        ORDER BY GeoLocation.STDistance(@center)
      `);

    const ids = result.recordset.map((row: { PersonID: number }) =>
      String(row.PersonID)
    );
    console.log(
      `Found ${ids.length} profiles within ${radiusMiles} miles of ${centerZip}`
    );
    return ids;
  } catch (error) {
    console.error('Azure SQL profile spatial query failed:', error);
    return null;
  }
}

/**
 * Search profiles with radius filter using Azure SQL spatial features
 * This combines spatial filtering with other search criteria
 */
export interface SpatialSearchParams {
  centerZip?: string;
  centerZips?: string[];
  radiusMiles: number;
  tableName: string;
  professionTypes?: string[];
  states?: string[];
  offices?: string[];
  page?: number;
  limit?: number;
}

export interface SpatialSearchResult {
  profiles: Array<{
    id: string;
    distance_miles: number;
    [key: string]: unknown;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Full spatial search with pagination
 */
export async function spatialProfileSearch(
  params: SpatialSearchParams
): Promise<SpatialSearchResult | null> {
  try {
    const {
      centerZip,
      centerZips = [],
      radiusMiles,
      tableName,
      professionTypes,
      states,
      offices,
      page = 1,
      limit = 20,
    } = params;

    // Collect all center zips
    const allCenterZips = [
      ...(centerZip ? [centerZip] : []),
      ...centerZips,
    ].filter(Boolean);

    if (allCenterZips.length === 0) {
      console.warn('No center zip codes provided');
      return null;
    }

    const centerLocation = await getZipLocation(allCenterZips[0]);
    if (!centerLocation) {
      console.warn(`Could not geocode center zip: ${allCenterZips[0]}`);
      return null;
    }

    const radiusMeters = radiusMiles * 1609.344;
    const pool = await getPool();
    const request = pool.request();

    // Build conditions * Added professional summary empty removal 12/15/2025 MS 
    const conditions: string[] = [
      'GeoLocation IS NOT NULL',
      'GeoLocation.STDistance(@center) <= @radiusMeters',
      'ProfessionalSummary IS NOT NULL',
      "LTRIM(RTRIM(ProfessionalSummary)) <> ''",
      "Status = 'Active'",
      'OnAssignment = 0',
    ];


    request.input('centerLat', sql.Float, centerLocation.lat);
    request.input('centerLng', sql.Float, centerLocation.lng);
    request.input('radiusMeters', sql.Float, radiusMeters);

    // Add profession filter
    if (professionTypes && professionTypes.length > 0) {
      const profConditions = professionTypes
        .map((prof, i) => {
          request.input(`prof${i}`, sql.NVarChar(100), `%${prof}%`);
          return `ProfessionType LIKE @prof${i}`;
        })
        .join(' OR ');
      conditions.push(`(${profConditions})`);
    }

    // Add state filter
    if (states && states.length > 0) {
      const stateConditions = states
        .map((s, i) => {
          request.input(`state${i}`, sql.NVarChar(2), s.toUpperCase());
          return `State = @state${i}`;
        })
        .join(' OR ');
      conditions.push(`(${stateConditions})`);
    }

    // Add office filter
    if (offices && offices.length > 0) {
      const officeConditions = offices
        .map((o, i) => {
          request.input(`office${i}`, sql.NVarChar(50), o);
          return `Office = @office${i}`;
        })
        .join(' OR ');
      conditions.push(`(${officeConditions})`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Count total
    const countResult = await request.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      SELECT COUNT(*) as total FROM ${tableName} WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // Get paginated results
    const dataRequest = pool.request();
    dataRequest.input('centerLat', sql.Float, centerLocation.lat);
    dataRequest.input('centerLng', sql.Float, centerLocation.lng);
    dataRequest.input('radiusMeters', sql.Float, radiusMeters);
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    // Re-add filters to new request
    if (professionTypes && professionTypes.length > 0) {
      professionTypes.forEach((prof, i) => {
        dataRequest.input(`prof${i}`, sql.NVarChar(100), `%${prof}%`);
      });
    }
    if (states && states.length > 0) {
      states.forEach((s, i) => {
        dataRequest.input(`state${i}`, sql.NVarChar(2), s.toUpperCase());
      });
    }
    if (offices && offices.length > 0) {
      offices.forEach((o, i) => {
        dataRequest.input(`office${i}`, sql.NVarChar(50), o);
      });
    }

    const dataResult = await dataRequest.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      
      SELECT 
        PersonID, Name, City, State, ZipCode, Office, ProfessionType, 
        ProfessionalSummary, Skill, Status, OnAssignment, HireDate,
        GeoLocation.STDistance(@center) / 1609.344 as distance_miles
      FROM ${tableName}
      WHERE ${whereClause}
      ORDER BY GeoLocation.STDistance(@center)
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const profiles = dataResult.recordset.map(
      (row: Record<string, unknown>) => ({
        id: String(row.PersonID),
        distance_miles: row.distance_miles as number,
        ...row,
      })
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Spatial profile search failed:', error);
    return null;
  }
}
