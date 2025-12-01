/**
 * Azure SQL Database Implementation
 * Connects to InterTalentShowcase table with PascalCase columns
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
import {
  getZipCodesWithinRadius,
  getProfilesWithinRadius,
  getZipLocation,
  getCityLocation,
} from '../../geospatial';

const TABLE_NAME = 'InterTalentShowcase';

export class AzureSqlDatabase implements IDatabase {
  private pool: sql.ConnectionPool | null = null;

  private async getConnection(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = await getPool();
    }
    return this.pool;
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

  private rowToProfile(row: Record<string, unknown>): Profile {
    const { first_name, last_initial } = this.parseName(row.Name as string);
    const isActive =
      row.Status === 'Active' ||
      row.Status === 'active' ||
      row.OnAssignment === true ||
      row.OnAssignment === 1;

    return {
      id: String(row.PersonID),
      first_name,
      last_initial,
      city: (row.City as string) || '',
      state: (row.State as string) || '',
      zip_code: (row.ZipCode as string) || '',
      professional_summary: (row.ProfessionalSummary as string) || '',
      office: (row.Office as string) || '',
      profession_type: (row.ProfessionType as string) || '',
      skills: row.Skill ? [row.Skill as string] : null,
      source_file: null,
      is_active: isActive,
      created_at: row.HireDate
        ? new Date(row.HireDate as string).toISOString()
        : new Date().toISOString(),
      updated_at: row.RunTime
        ? new Date(row.RunTime as string).toISOString()
        : new Date().toISOString(),
    };
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

    const offset = (page - 1) * limit;
    const activeCondition = this.getActiveCondition();
    const conditions: string[] = [activeCondition];
    const request = pool.request();

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

    let radiusSearchAttempted = false;
    let radiusSearchSucceeded = false;

    if (radius && radius > 0) {
      radiusSearchAttempted = true;
      const centerZipCodes = Array.from(
        new Set([
          ...(zipCode ? [zipCode] : []),
          ...(zipCodes && zipCodes.length > 0 ? zipCodes : []),
        ])
      );

      if (centerZipCodes.length > 0) {
        try {
          const allNearbyZipCodesArrays = await Promise.all(
            centerZipCodes.map((centerZip) =>
              getZipCodesWithinRadius(centerZip, radius)
            )
          );
          const allNearbyZipCodes = Array.from(
            new Set(allNearbyZipCodesArrays.flatMap((zips) => zips ?? []))
          );

          if (allNearbyZipCodes.length > 0) {
            const zipPlaceholders = allNearbyZipCodes
              .map((z, index) => {
                const paramName = `radiusZip${index}`;
                request.input(paramName, sql.NVarChar(10), z);
                return `@${paramName}`;
              })
              .join(', ');
            conditions.push(`ZipCode IN (${zipPlaceholders})`);
            radiusSearchSucceeded = true;
          }
        } catch (error) {
          console.error('Error in radius search:', error);
        }

        if (!radiusSearchSucceeded) {
          const preFilterRequest = pool.request();
          const preFilterConditions: string[] = [activeCondition];

          if (professionTypes && professionTypes.length > 0) {
            const profConditions = professionTypes
              .map((prof, index) => {
                preFilterRequest.input(
                  `preProf${index}`,
                  sql.NVarChar(100),
                  prof
                );
                return `ProfessionType LIKE @preProf${index}`;
              })
              .join(' OR ');
            preFilterConditions.push(`(${profConditions})`);
          }

          const preFilterResult = await preFilterRequest.query(
            `SELECT PersonID as id, ZipCode as zip_code, City as city, State as state FROM ${TABLE_NAME} WHERE ${preFilterConditions.join(' AND ')}`
          );

          const filteredProfiles = preFilterResult.recordset.map(
            (row: Record<string, unknown>) => ({
              id: String(row.id),
              zip_code: row.zip_code as string,
              city: row.city as string,
              state: row.state as string,
            })
          );

          if (filteredProfiles.length > 0) {
            const allRadiusFilteredIdsSet = new Set<string>();
            for (const centerZip of centerZipCodes) {
              const idsForCenter = await getProfilesWithinRadius(
                centerZip,
                radius,
                filteredProfiles
              );
              idsForCenter.forEach((id) => allRadiusFilteredIdsSet.add(id));
            }
            const radiusFilteredIds = Array.from(allRadiusFilteredIdsSet);

            if (radiusFilteredIds.length === 0) {
              return { profiles: [], total: 0, page, limit, totalPages: 0 };
            }

            const idPlaceholders = radiusFilteredIds
              .map((id, index) => {
                request.input(`radiusId${index}`, sql.BigInt, parseInt(id, 10));
                return `@radiusId${index}`;
              })
              .join(', ');
            conditions.push(`PersonID IN (${idPlaceholders})`);
            radiusSearchSucceeded = true;
          } else {
            return { profiles: [], total: 0, page, limit, totalPages: 0 };
          }
        }
      } else if (city) {
        const preFilterRequest = pool.request();
        const preFilterConditions: string[] = [activeCondition];

        if (state) {
          preFilterRequest.input(
            'preState',
            sql.NVarChar(2),
            state.toUpperCase()
          );
          preFilterConditions.push('State = @preState');
        }

        const preFilterResult = await preFilterRequest.query(
          `SELECT PersonID as id, ZipCode as zip_code, City as city, State as state FROM ${TABLE_NAME} WHERE ${preFilterConditions.join(' AND ')}`
        );

        const filteredProfiles = preFilterResult.recordset.map(
          (row: Record<string, unknown>) => ({
            id: String(row.id),
            zip_code: row.zip_code as string,
            city: row.city as string,
            state: row.state as string,
          })
        );

        if (filteredProfiles.length > 0) {
          const centerCoords = await getCityLocation(city, state);
          const radiusFilteredIds = centerCoords
            ? await getProfilesWithinRadius(
                city,
                radius,
                filteredProfiles,
                centerCoords
              )
            : filteredProfiles.map((p) => p.id);

          if (radiusFilteredIds.length === 0) {
            return { profiles: [], total: 0, page, limit, totalPages: 0 };
          }

          const idPlaceholders = radiusFilteredIds
            .map((id, index) => {
              request.input(`radiusId${index}`, sql.BigInt, parseInt(id, 10));
              return `@radiusId${index}`;
            })
            .join(', ');
          conditions.push(`PersonID IN (${idPlaceholders})`);
          radiusSearchSucceeded = true;
        } else {
          return { profiles: [], total: 0, page, limit, totalPages: 0 };
        }
      }
    } else if (zipCodes && zipCodes.length > 0) {
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

    const isRadiusSearch = radius && radius > 0;
    if (!isRadiusSearch) {
      if (city) {
        request.input('city', sql.NVarChar(100), `%${city}%`);
        conditions.push('City LIKE @city');
      }
      if (state) {
        request.input('state', sql.NVarChar(2), state.toUpperCase());
        conditions.push('State = @state');
      }
    }

    if (radiusSearchAttempted && !radiusSearchSucceeded && state) {
      request.input('fallbackState', sql.NVarChar(2), state.toUpperCase());
      conditions.push('State = @fallbackState');
    }

    if (office) {
      request.input('office', sql.NVarChar(100), office);
      conditions.push('Office = @office');
    }

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
