/**
 * Azure SQL Database Implementation
 * Uses native GEOGRAPHY column for fast spatial queries
 *
 * REFACTORED: Now uses direct spatial queries instead of zip list approach
 * - 332ms spatial query vs 20 minutes per-profile geocoding
 * - Returns distance information for radius searches
 */

import sql from 'mssql';
import { getPool } from '../clients/azure-sql';
import type {
  IDatabase,
  ProfileSearchParams,
  PaginatedProfiles,
  StateInfo,
  OfficeInfo,
} from '../interface';
import type { Profile } from '../supabase';
import { getZipLocation, getCityLocation } from '../../geospatial';

// Use RayTestShowcase for testing (has GeoLocation column with spatial index)
// Change to 'InterTalentShowcase' when client's pipeline is complete
const TABLE_NAME = 'RayTestShowcase';

// Check if table has GeoLocation column
let hasGeoLocationColumn: boolean | null = null;

export class AzureSqlDatabase implements IDatabase {
  private pool: sql.ConnectionPool | null = null;

  private async getConnection(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = await getPool();
    }
    return this.pool;
  }

  /**
   * Check if the table has a GeoLocation column with data
   * Cached after first check for performance
   */
  private async checkGeoLocationSupport(): Promise<boolean> {
    if (hasGeoLocationColumn !== null) {
      return hasGeoLocationColumn;
    }

    try {
      const pool = await this.getConnection();

      // Check if column exists
      const columnCheck = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${TABLE_NAME}' AND COLUMN_NAME = 'GeoLocation'
      `);

      if (columnCheck.recordset[0].cnt === 0) {
        console.log(`Table ${TABLE_NAME} does not have GeoLocation column`);
        hasGeoLocationColumn = false;
        return false;
      }

      // Check if there's data
      const dataCheck = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM ${TABLE_NAME} WHERE GeoLocation IS NOT NULL
      `);

      const count = dataCheck.recordset[0].cnt;
      hasGeoLocationColumn = count > 0;
      console.log(
        `Table ${TABLE_NAME} has ${count} records with GeoLocation - spatial queries ${hasGeoLocationColumn ? 'ENABLED' : 'DISABLED'}`
      );

      return hasGeoLocationColumn;
    } catch (error) {
      console.error('Error checking GeoLocation support:', error);
      hasGeoLocationColumn = false;
      return false;
    }
  }

  private parseName(fullName: string | null): {
    first_name: string;
    last_initial: string;
  } {
    if (!fullName || fullName.trim() === '') {
      return { first_name: '', last_initial: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_initial: '' };
    }
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return {
      first_name: firstName,
      last_initial: lastName.charAt(0).toUpperCase(),
    };
  }

  private rowToProfile(
    row: Record<string, unknown>,
    distanceMiles?: number
  ): Profile {
    const { first_name, last_initial } = this.parseName(row.Name as string);

    // Handle OnAssignment: bit (true/false/1/0) or varchar ("Yes"/"No")
    const onAssignment =
      row.OnAssignment === true ||
      row.OnAssignment === 1 ||
      row.OnAssignment === 'Yes' ||
      row.OnAssignment === 'yes';

    const isActive =
      row.Status === 'Active' || row.Status === 'active' || onAssignment;

    // Handle both PersonID and PersonId (case variations between tables)
    const personId = row.PersonID || row.PersonId || row.personId || '';

    // Handle ZipCode: varchar(10) or bigint
    const zipCode = row.ZipCode ? String(row.ZipCode) : '';

    // Handle HireDate: datetime or varchar
    let createdAt: string;
    if (row.HireDate) {
      try {
        const hireDate =
          row.HireDate instanceof Date
            ? row.HireDate
            : new Date(row.HireDate as string);
        createdAt = hireDate.toISOString();
      } catch {
        createdAt = new Date().toISOString();
      }
    } else {
      createdAt = new Date().toISOString();
    }

    const profile: Profile = {
      id: String(personId),
      first_name,
      last_initial,
      city: (row.City as string) || '',
      state: (row.State as string) || '',
      zip_code: zipCode,
      professional_summary: (row.ProfessionalSummary as string) || '',
      office: (row.Office as string) || '',
      profession_type: (row.ProfessionType as string) || '',
      skills: row.Skill ? [row.Skill as string] : null,
      source_file: null,
      is_active: isActive,
      created_at: createdAt,
      updated_at: row.RunTime
        ? new Date(row.RunTime as string).toISOString()
        : new Date().toISOString(),
    };

    // Add distance if available (for radius searches)
    if (distanceMiles !== undefined) {
      (profile as Profile & { distance_miles?: number }).distance_miles =
        Math.round(distanceMiles * 100) / 100;
    }

    return profile;
  }

  private getActiveCondition(): string {
    return '1=1';
  }

  async getAllProfiles(
    page: number = 1,
    limit: number = 20,
    sortBy: 'name' | 'location' | 'profession' = 'name',
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;

    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      default:
        sortColumn = 'Name';
    }

    const sortDir = sortDirection.toUpperCase();
    const activeCondition = this.getActiveCondition();

    const countResult = await pool
      .request()
      .query(
        `SELECT COUNT(*) as total FROM ${TABLE_NAME} WHERE ${activeCondition}`
      );
    const total = countResult.recordset[0].total;

    const dataResult = await pool
      .request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(
        `SELECT * FROM ${TABLE_NAME} WHERE ${activeCondition} ORDER BY ${sortColumn} ${sortDir} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      );

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row)
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const pool = await this.getConnection();
    const activeCondition = this.getActiveCondition();

    const result = await pool
      .request()
      .input('id', sql.BigInt, parseInt(id, 10))
      .query(
        `SELECT * FROM ${TABLE_NAME} WHERE PersonID = @id AND ${activeCondition}`
      );

    if (result.recordset.length === 0) return null;
    return this.rowToProfile(result.recordset[0]);
  }

  /**
   * Perform spatial radius search using Azure SQL GEOGRAPHY
   * Returns profiles within radius, sorted by distance
   */
  private async spatialRadiusSearch(
    centerLat: number,
    centerLng: number,
    radiusMiles: number,
    additionalConditions: string[],
    page: number,
    limit: number,
    sortBy: string,
    sortDirection: string
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;
    const radiusMeters = radiusMiles * 1609.344;

    // Build WHERE clause
    const activeCondition = this.getActiveCondition();
    const spatialCondition =
      'GeoLocation IS NOT NULL AND GeoLocation.STDistance(@center) <= @radiusMeters';
    const allConditions = [
      activeCondition,
      spatialCondition,
      ...additionalConditions,
    ];
    const whereClause = allConditions.join(' AND ');

    // Count total matches
    const countRequest = pool.request();
    countRequest.input('centerLat', sql.Float, centerLat);
    countRequest.input('centerLng', sql.Float, centerLng);
    countRequest.input('radiusMeters', sql.Float, radiusMeters);

    const countResult = await countRequest.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      SELECT COUNT(*) as total FROM ${TABLE_NAME} WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    if (total === 0) {
      return { profiles: [], total: 0, page, limit, totalPages: 0 };
    }

    // For radius searches, sort by distance first (nearest), then by requested field
    let orderClause: string;
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      case 'distance':
        sortColumn = 'distance_miles';
        break;
      default:
        sortColumn = 'Name';
    }

    if (sortBy === 'distance') {
      orderClause = `GeoLocation.STDistance(@center) ${sortDirection.toUpperCase()}`;
    } else {
      // Sort by distance first (nearest), then by requested field
      orderClause = `GeoLocation.STDistance(@center) ASC, ${sortColumn} ${sortDirection.toUpperCase()}`;
    }

    // Get data with distance
    const dataRequest = pool.request();
    dataRequest.input('centerLat', sql.Float, centerLat);
    dataRequest.input('centerLng', sql.Float, centerLng);
    dataRequest.input('radiusMeters', sql.Float, radiusMeters);
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const dataResult = await dataRequest.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      
      SELECT *, GeoLocation.STDistance(@center) / 1609.344 as distance_miles
      FROM ${TABLE_NAME}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row, row.distance_miles as number)
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Perform spatial radius search with MULTIPLE center points
   * Returns profiles within radius of ANY center, with distance to nearest center
   * Uses UNION approach for efficient multi-center queries
   */
  private async multiCenterSpatialRadiusSearch(
    centers: Array<{ lat: number; lng: number; zipCode: string }>,
    radiusMiles: number,
    additionalConditions: string[],
    page: number,
    limit: number,
    sortBy: string,
    sortDirection: string
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;
    const radiusMeters = radiusMiles * 1609.344;

    // Build WHERE clause for additional conditions
    const activeCondition = this.getActiveCondition();
    const conditionsForWhere = [activeCondition, ...additionalConditions]
      .filter((c) => c)
      .join(' AND ');

    // Build UNION query for all centers
    // Each center contributes profiles within its radius, with calculated distance
    const centerQueries = centers
      .map(
        (center) => `
      SELECT 
        PersonID, Name, City, State, ZipCode, ProfessionalSummary, 
        Office, ProfessionType, Skill, OnAssignment, Status, HireDate, RunTime,
        GeoLocation.STDistance(geography::Point(${center.lat}, ${center.lng}, 4326)) / 1609.344 as distance_miles,
        '${center.zipCode}' as nearest_center
      FROM ${TABLE_NAME}
      WHERE GeoLocation IS NOT NULL 
        AND GeoLocation.STDistance(geography::Point(${center.lat}, ${center.lng}, 4326)) <= ${radiusMeters}
        AND ${conditionsForWhere}
    `
      )
      .join(' UNION ALL ');

    // Wrap in CTE to deduplicate (keep only nearest distance per profile)
    const dedupeQuery = `
      WITH AllMatches AS (
        ${centerQueries}
      ),
      RankedMatches AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY PersonID ORDER BY distance_miles ASC) as rn
        FROM AllMatches
      )
      SELECT * FROM RankedMatches WHERE rn = 1
    `;

    console.log(
      `Multi-center radius search: ${centers.length} centers, ${radiusMiles} miles`
    );
    centers.forEach((c) =>
      console.log(`  - ${c.zipCode}: (${c.lat}, ${c.lng})`)
    );

    // Count total unique matches using a proper count query
    const countQuery = `
      WITH AllMatches AS (
        ${centerQueries}
      ),
      RankedMatches AS (
        SELECT PersonID, ROW_NUMBER() OVER (PARTITION BY PersonID ORDER BY distance_miles ASC) as rn
        FROM AllMatches
      )
      SELECT COUNT(*) as total FROM RankedMatches WHERE rn = 1
    `;
    const countResult = await pool.request().query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    if (total === 0) {
      return { profiles: [], total: 0, page, limit, totalPages: 0 };
    }

    // Determine sort order
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      case 'distance':
        sortColumn = 'distance_miles';
        break;
      default:
        sortColumn = 'Name';
    }

    const orderClause =
      sortBy === 'distance'
        ? `distance_miles ${sortDirection.toUpperCase()}`
        : `distance_miles ASC, ${sortColumn} ${sortDirection.toUpperCase()}`;

    // Get paginated results
    const dataResult = await pool.request().query(`
      ${dedupeQuery}
      ORDER BY ${orderClause}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row, row.distance_miles as number)
    );

    console.log(
      `Multi-center search found ${total} unique profiles (showing ${profiles.length})`
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchProfiles(
    params: ProfileSearchParams
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const {
      query,
      keywords,
      professionTypes,
      city,
      state,
      zipCode,
      zipCodes,
      radius,
      office,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortDirection = 'asc',
    } = params;

    const activeCondition = this.getActiveCondition();
    const conditions: string[] = [activeCondition];
    const request = pool.request();

    // Build keyword search conditions
    const keywordsToSearch =
      keywords && keywords.length > 0 ? keywords : query ? [query] : [];

    if (keywordsToSearch.length > 0) {
      const keywordConditions = keywordsToSearch
        .map((kw, index) => {
          const paramName = `keyword${index}`;
          request.input(paramName, sql.NVarChar(sql.MAX), `%${kw.trim()}%`);
          return `(ProfessionalSummary LIKE @${paramName} OR Name LIKE @${paramName} OR City LIKE @${paramName} OR Skill LIKE @${paramName})`;
        })
        .join(' OR ');
      conditions.push(`(${keywordConditions})`);
    }

    // Build profession type conditions
    if (professionTypes && professionTypes.length > 0) {
      const professionConditions = professionTypes
        .map((prof, index) => {
          const paramName = `profession${index}`;
          request.input(paramName, sql.NVarChar(100), prof);
          return `ProfessionType LIKE @${paramName}`;
        })
        .join(' OR ');
      conditions.push(`(${professionConditions})`);
    }

    // Handle office filter
    if (office) {
      request.input('office', sql.NVarChar(100), office);
      conditions.push('Office = @office');
    }

    // ═══════════════════════════════════════════════════════════════
    // RADIUS SEARCH - Uses Azure SQL GEOGRAPHY for fast spatial queries
    // ═══════════════════════════════════════════════════════════════
    if (radius && radius > 0) {
      const hasGeoSupport = await this.checkGeoLocationSupport();

      // Collect center zip codes
      const centerZipCodes = Array.from(
        new Set([
          ...(zipCode ? [zipCode] : []),
          ...(zipCodes && zipCodes.length > 0 ? zipCodes : []),
        ])
      );

      // Geocode ALL zip codes to get center points
      const centers: Array<{ lat: number; lng: number; zipCode: string }> = [];

      if (centerZipCodes.length > 0) {
        console.log(
          `Geocoding ${centerZipCodes.length} zip code(s) for radius search...`
        );

        // Geocode all zip codes in parallel for efficiency
        const geocodePromises = centerZipCodes.map(async (zip) => {
          const location = await getZipLocation(zip);
          if (location) {
            return { lat: location.lat, lng: location.lng, zipCode: zip };
          }
          console.warn(`Could not geocode zip code: ${zip}`);
          return null;
        });

        const results = await Promise.all(geocodePromises);
        results.forEach((r) => {
          if (r) centers.push(r);
        });

        console.log(
          `Successfully geocoded ${centers.length}/${centerZipCodes.length} zip codes`
        );
      } else if (city) {
        // Fallback to city if no zip codes provided
        const centerLocation = await getCityLocation(city, state);
        if (centerLocation) {
          centers.push({
            lat: centerLocation.lat,
            lng: centerLocation.lng,
            zipCode: `${city}, ${state}`,
          });
          console.log(`Radius search: ${radius} miles from ${city}, ${state}`);
        }
      }

      // If we have center(s) and GeoLocation support, use spatial query
      if (centers.length > 0 && hasGeoSupport) {
        console.log(
          `Using Azure SQL spatial query with ${centers.length} center point(s)`
        );

        // Build additional conditions (excluding active which is already handled)
        const spatialConditions: string[] = [];

        // Add keyword conditions for spatial search
        if (keywordsToSearch.length > 0) {
          const keywordConditions = keywordsToSearch
            .map((kw) => {
              return `(ProfessionalSummary LIKE '%${kw.trim().replace(/'/g, "''")}%' OR Name LIKE '%${kw.trim().replace(/'/g, "''")}%' OR City LIKE '%${kw.trim().replace(/'/g, "''")}%' OR Skill LIKE '%${kw.trim().replace(/'/g, "''")}%')`;
            })
            .join(' OR ');
          spatialConditions.push(`(${keywordConditions})`);
        }

        // Add profession conditions for spatial search
        if (professionTypes && professionTypes.length > 0) {
          const professionConditions = professionTypes
            .map((prof) => `ProfessionType LIKE '${prof.replace(/'/g, "''")}'`)
            .join(' OR ');
          spatialConditions.push(`(${professionConditions})`);
        }

        // Add office condition for spatial search
        if (office) {
          spatialConditions.push(`Office = '${office.replace(/'/g, "''")}'`);
        }

        // Use multi-center search if multiple zip codes, otherwise single center (optimized)
        if (centers.length > 1) {
          return this.multiCenterSpatialRadiusSearch(
            centers,
            radius,
            spatialConditions,
            page,
            limit,
            sortBy,
            sortDirection
          );
        } else {
          // Single center - use original optimized method
          return this.spatialRadiusSearch(
            centers[0].lat,
            centers[0].lng,
            radius,
            spatialConditions,
            page,
            limit,
            sortBy,
            sortDirection
          );
        }
      } else {
        // Fallback: Filter by state if radius search not possible
        console.log('GeoLocation not available, falling back to state filter');
        if (state) {
          request.input('fallbackState', sql.NVarChar(2), state.toUpperCase());
          conditions.push('State = @fallbackState');
        }
      }
    } else {
      // Non-radius search: apply location filters directly
      if (zipCodes && zipCodes.length > 0) {
        const zipPlaceholders = zipCodes
          .map((z, index) => {
            request.input(`zip${index}`, sql.NVarChar(10), z);
            return `@zip${index}`;
          })
          .join(', ');
        conditions.push(`ZipCode IN (${zipPlaceholders})`);
      } else if (zipCode) {
        request.input('zipCode', sql.NVarChar(10), zipCode);
        conditions.push('ZipCode = @zipCode');
      }

      if (city) {
        request.input('city', sql.NVarChar(100), `%${city}%`);
        conditions.push('City LIKE @city');
      }

      if (state) {
        request.input('state', sql.NVarChar(2), state.toUpperCase());
        conditions.push('State = @state');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Standard query (non-spatial)
    // ═══════════════════════════════════════════════════════════════
    const offset = (page - 1) * limit;
    const whereClause = conditions.join(' AND ');

    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      default:
        sortColumn = 'Name';
    }

    const sortDir = sortDirection.toUpperCase();

    const countResult = await request.query(
      `SELECT COUNT(*) as total FROM ${TABLE_NAME} WHERE ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const dataResult = await request.query(
      `SELECT * FROM ${TABLE_NAME} WHERE ${whereClause} ORDER BY ${sortColumn} ${sortDir} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
    );

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row)
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProfessionTypes(): Promise<string[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT ProfessionType FROM ${TABLE_NAME} WHERE ${this.getActiveCondition()} AND ProfessionType IS NOT NULL AND ProfessionType != '' ORDER BY ProfessionType`
      );
    return result.recordset.map(
      (row: Record<string, unknown>) => row.ProfessionType as string
    );
  }

  async getStates(): Promise<StateInfo[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT State as code, State as name FROM ${TABLE_NAME} WHERE ${this.getActiveCondition()} AND State IS NOT NULL AND State != '' ORDER BY State`
      );
    return result.recordset.map((row: Record<string, unknown>) => ({
      code: row.code as string,
      name: row.name as string,
    }));
  }

  async getOffices(): Promise<OfficeInfo[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT Office as name, City as city, State as state FROM ${TABLE_NAME} WHERE ${this.getActiveCondition()} AND Office IS NOT NULL AND Office != '' ORDER BY Office`
      );
    return result.recordset.map((row: Record<string, unknown>) => ({
      name: row.name as string,
      city: row.city as string,
      state: row.state as string,
    }));
  }

  async insertProfiles(profiles: Profile[]): Promise<void> {
    const pool = await this.getConnection();
    for (const profile of profiles) {
      const fullName = profile.last_initial
        ? `${profile.first_name} ${profile.last_initial}.`
        : profile.first_name;
      await pool
        .request()
        .input('name', sql.NVarChar(50), fullName)
        .input('city', sql.NVarChar(50), profile.city)
        .input('state', sql.NVarChar(2), profile.state)
        .input('zipCode', sql.VarChar(10), profile.zip_code)
        .input(
          'professionalSummary',
          sql.NVarChar(3000),
          profile.professional_summary
        )
        .input('office', sql.NVarChar(50), profile.office)
        .input('professionType', sql.NVarChar(50), profile.profession_type)
        .input(
          'skill',
          sql.NVarChar(500),
          profile.skills ? profile.skills.join(', ') : null
        )
        .input('status', sql.NVarChar(50), 'Active')
        .input('runDate', sql.Date, new Date())
        .input('runTime', sql.DateTime2, new Date())
        .query(
          `INSERT INTO ${TABLE_NAME} (Name, City, State, ZipCode, ProfessionalSummary, Office, ProfessionType, Skill, Status, RunDate, RunTime) VALUES (@name, @city, @state, @zipCode, @professionalSummary, @office, @professionType, @skill, @status, @runDate, @runTime)`
        );
    }
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<void> {
    const pool = await this.getConnection();
    const request = pool.request().input('id', sql.BigInt, parseInt(id, 10));
    const updates: string[] = [];

    if (data.professional_summary !== undefined) {
      updates.push('ProfessionalSummary = @professionalSummary');
      request.input(
        'professionalSummary',
        sql.NVarChar(3000),
        data.professional_summary
      );
    }
    if (data.office !== undefined) {
      updates.push('Office = @office');
      request.input('office', sql.NVarChar(50), data.office);
    }
    if (data.profession_type !== undefined) {
      updates.push('ProfessionType = @professionType');
      request.input('professionType', sql.NVarChar(50), data.profession_type);
    }
    if (data.zip_code !== undefined) {
      updates.push('ZipCode = @zipCode');
      request.input('zipCode', sql.VarChar(10), data.zip_code);
    }
    if (data.skills !== undefined) {
      updates.push('Skill = @skill');
      request.input(
        'skill',
        sql.NVarChar(500),
        data.skills ? data.skills.join(', ') : null
      );
    }

    updates.push('RunTime = @runTime');
    request.input('runTime', sql.DateTime2, new Date());

    if (updates.length === 0) return;
    await request.query(
      `UPDATE ${TABLE_NAME} SET ${updates.join(', ')} WHERE PersonID = @id`
    );
  }

  async deleteProfiles(ids: string[]): Promise<void> {
    const pool = await this.getConnection();
    for (const id of ids) {
      await pool
        .request()
        .input('id', sql.BigInt, parseInt(id, 10))
        .input('runTime', sql.DateTime2, new Date())
        .query(
          `UPDATE ${TABLE_NAME} SET Status = 'Inactive', RunTime = @runTime WHERE PersonID = @id`
        );
    }
  }
}
