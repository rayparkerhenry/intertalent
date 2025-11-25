/**
 * PostgreSQL Database Implementation
 * Uses Supabase client to implement IDatabase interface
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IDatabase,
  ProfileSearchParams,
  PaginatedProfiles,
  StateInfo,
  OfficeInfo,
} from '../interface';
import type { Profile } from '../supabase';
import {
  getProfilesWithinRadius,
  getCityLocation,
  getZipLocation,
  getZipCodesWithinRadius,
} from '@/lib/geospatial';

export class PostgresDatabase implements IDatabase {
  constructor(
    private client: SupabaseClient,
    private adminClient: SupabaseClient
  ) {}

  /**
   * Get all profiles with pagination and sorting
   */
  async getAllProfiles(
    page: number = 1,
    limit: number = 20,
    sortBy: 'name' | 'location' | 'profession' = 'name',
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedProfiles> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Determine sort column
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'first_name';
        break;
      case 'location':
        sortColumn = 'city';
        break;
      case 'profession':
        sortColumn = 'profession_type';
        break;
      default:
        sortColumn = 'first_name';
    }

    // Get total count
    const { count } = await this.client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get paginated data with sorting
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order(sortColumn, { ascending: sortDirection === 'asc' })
      .range(from, to);

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }

    return {
      profiles: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get profile by ID
   */
  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Search and filter profiles
   */
  async searchProfiles(
    params: ProfileSearchParams
  ): Promise<PaginatedProfiles> {
    const {
      query,
      keywords,
      professionType,
      city,
      state,
      zipCode,
      zipCodes,
      office,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortDirection = 'asc',
    } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Determine sort column
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'first_name';
        break;
      case 'location':
        sortColumn = 'city';
        break;
      case 'profession':
        sortColumn = 'profession_type';
        break;
      default:
        sortColumn = 'first_name';
    }

    let queryBuilder = this.client
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (professionType) {
      queryBuilder = queryBuilder.eq('profession_type', professionType);
    }

    // IMPORTANT: Only apply city/state filters if NOT doing radius search
    // Radius search handles location filtering via radiusFilteredIds
    const isRadiusSearch = params.radius && params.radius > 0;

    if (!isRadiusSearch) {
      // Only apply exact location filters when NOT doing radius search
      if (city) {
        queryBuilder = queryBuilder.ilike('city', `%${city}%`);
      }
      if (state) {
        queryBuilder = queryBuilder.eq('state', state.toUpperCase());
      }
    }

    if (office) {
      queryBuilder = queryBuilder.eq('office', office);
    }

    // Multiple keyword search with OR logic
    // Each keyword searches across: professional_summary, first_name, last_initial, city
    // Multiple keywords are combined with OR (match ANY keyword)
    const keywordsToSearch =
      keywords && keywords.length > 0 ? keywords : query ? [query] : [];

    if (keywordsToSearch.length > 0) {
      // Build OR conditions: for each keyword, search across all fields
      // Each keyword gets its own set of field searches, properly wildcarded
      // Format: professional_summary.ilike.%kw1%,first_name.ilike.%kw1%,professional_summary.ilike.%kw2%,first_name.ilike.%kw2%
      const allFieldConditions = keywordsToSearch
        .flatMap((kw) => {
          // For each keyword, create separate condition for each searchable field
          return [
            `professional_summary.ilike.%${kw}%`,
            `first_name.ilike.%${kw}%`,
            `last_initial.ilike.%${kw}%`,
            `city.ilike.%${kw}%`,
          ];
        })
        .join(',');

      queryBuilder = queryBuilder.or(allFieldConditions);
    }

    // Handle geospatial radius search
    // Priority: zipCode > city+state > city only
    // Radius only works if we have a geocodable location
    let radiusFilteredIds: string[] | null = null;
    let radiusSearchAttempted = false;
    let radiusSearchSucceeded = false;

    if (params.radius && params.radius > 0) {
      let centerLocation: string | null = null;
      let useCityGeocode = false;
      let stateFilter = state; // May be undefined initially

      radiusSearchAttempted = true;

      // Determine center point for radius search
      if (zipCode) {
        // Best case: zip code provided
        centerLocation = zipCode;

        // If no state provided, try to get state from zip code lookup
        // This is crucial for reducing geocoding load from 1000+ to ~100-200
        if (!stateFilter) {
          try {
            const zipLocation = await getZipLocation(zipCode);
            if (zipLocation && zipLocation.state) {
              stateFilter = zipLocation.state;
              console.log(
                `Extracted state '${stateFilter}' from zip code ${zipCode}`
              );
            }
          } catch {
            console.warn(`Could not extract state from zip ${zipCode}`);
          }
        }
      } else if (city) {
        // Fallback: use city (with state if available)
        centerLocation = city;
        useCityGeocode = true;
      }

      // Execute radius search if we have a valid center
      if (centerLocation) {
        try {
          // OPTIMIZATION: For zip-based searches, try to get nearby zip codes first
          // This avoids geocoding thousands of profiles
          if (zipCode) {
            console.log(
              `Attempting optimized zip code radius search for ${zipCode} within ${params.radius} miles`
            );

            const nearbyZipCodes = await getZipCodesWithinRadius(
              zipCode,
              params.radius
            );

            if (nearbyZipCodes && nearbyZipCodes.length > 0) {
              // SUCCESS: We have a list of zip codes within radius
              console.log(
                `Found ${nearbyZipCodes.length} zip codes within radius - using optimized query`
              );

              // Build query that filters by these zip codes + other filters
              let optimizedQuery = this.client
                .from('profiles')
                .select('id')
                .eq('is_active', true)
                .in('zip_code', nearbyZipCodes);

              // Apply other filters
              if (professionType) {
                optimizedQuery = optimizedQuery.eq(
                  'profession_type',
                  professionType
                );
              }
              if (office) {
                optimizedQuery = optimizedQuery.eq('office', office);
              }

              // Multiple keyword search with OR logic
              const keywordsToSearch =
                keywords && keywords.length > 0
                  ? keywords
                  : query
                    ? [query]
                    : [];
              if (keywordsToSearch.length > 0) {
                const allFieldConditions = keywordsToSearch
                  .flatMap((kw) => [
                    `professional_summary.ilike.%${kw}%`,
                    `first_name.ilike.%${kw}%`,
                    `last_initial.ilike.%${kw}%`,
                    `city.ilike.%${kw}%`,
                  ])
                  .join(',');
                optimizedQuery = optimizedQuery.or(allFieldConditions);
              }

              const { data: matchedProfiles } = await optimizedQuery;

              if (matchedProfiles && matchedProfiles.length > 0) {
                radiusFilteredIds = matchedProfiles.map((p) => p.id);
                radiusSearchSucceeded = true;
                console.log(
                  `Optimized zip search found ${radiusFilteredIds.length} profiles`
                );
              } else {
                // No profiles in those zip codes
                console.log('No profiles found in nearby zip codes');
                return {
                  profiles: [],
                  total: 0,
                  page,
                  limit,
                  totalPages: 0,
                };
              }

              // Skip the rest of the search logic - we're done!
              // Continue to apply the filter to the main query
            } else {
              console.log(
                'Zip code radius API not available - falling back to geocoding method'
              );
              // Fall through to standard geocoding approach
            }
          }

          // FALLBACK: Standard geocoding approach (for city searches or if zip optimization failed)
          if (!radiusSearchSucceeded) {
            // IMPORTANT: Get only profiles that match OTHER filters first to reduce geocoding load
            // Build a query with all filters EXCEPT radius, BUT include state filter to limit scope
            let preFilterQuery = this.client
              .from('profiles')
              .select('id, zip_code, city, state')
              .eq('is_active', true);

            // Apply same filters as main query
            if (professionType) {
              preFilterQuery = preFilterQuery.eq(
                'profession_type',
                professionType
              );
            }
            if (office) {
              preFilterQuery = preFilterQuery.eq('office', office);
            }

            // Multiple keyword search with OR logic
            const keywordsToSearch =
              keywords && keywords.length > 0 ? keywords : query ? [query] : [];
            if (keywordsToSearch.length > 0) {
              const allFieldConditions = keywordsToSearch
                .flatMap((kw) => [
                  `professional_summary.ilike.%${kw}%`,
                  `first_name.ilike.%${kw}%`,
                  `last_initial.ilike.%${kw}%`,
                  `city.ilike.%${kw}%`,
                ])
                .join(',');
              preFilterQuery = preFilterQuery.or(allFieldConditions);
            }

            // CRITICAL: Smart filtering to reduce geocoding load while handling bad data
            //
            // Strategy:
            // 1. Zip + Radius: Don't filter by state (db may have wrong state for zip)
            // 2. City + State + Radius: Filter by state (trust user's state input)
            // 3. City only + Radius: Filter by city name (find all matching cities)
            if (zipCode) {
              // Zip-based search: Don't filter by state (database may have incorrect state)
              console.log(
                `Zip-based radius search (fallback) - not filtering by state (relying on geocoding)`
              );
            } else if (stateFilter && city) {
              // City + State search: Filter by state for performance
              preFilterQuery = preFilterQuery.eq('state', stateFilter);
              console.log(
                `City + State radius search - filtering by state: ${stateFilter}`
              );
            } else if (city && !stateFilter) {
              // City-only search: Filter by city name to reduce geocoding
              // This will find all cities with that name across all states
              preFilterQuery = preFilterQuery.ilike('city', `%${city}%`);
              console.log(
                `City-only radius search - filtering by city name: ${city} (all states)`
              );
            }

            const { data: filteredProfiles } = await preFilterQuery;

            if (filteredProfiles && filteredProfiles.length > 0) {
              console.log(
                `Geocoding ${filteredProfiles.length} profiles for radius search...`
              );

              // If using city geocoding, get the center coordinates first
              if (useCityGeocode) {
                try {
                  const centerCoords = await getCityLocation(city!, state);
                  console.log('centerCoords', centerCoords);
                  if (!centerCoords) {
                    // Failed to geocode city - can't do radius search
                    // Apply city filter as fallback to show profiles in that city
                    console.warn(
                      `Could not geocode city: ${city}, ${state} - using exact city match as fallback`
                    );
                    // Mark that radius succeeded with the pre-filtered profiles
                    // (These already match city name from line 265)
                    radiusFilteredIds = filteredProfiles.map((p) => p.id);
                    radiusSearchSucceeded = true;
                  } else {
                    // Modify profiles to use city geocoding for radius calc
                    radiusFilteredIds = await getProfilesWithinRadius(
                      centerLocation,
                      params.radius,
                      filteredProfiles,
                      useCityGeocode ? centerCoords : undefined
                    );
                    console.log(
                      'centerLocation when useCityGeocode',
                      centerLocation
                    );
                    console.log(
                      'radiusFilteredIds when useCityGeocode',
                      radiusFilteredIds
                    );
                  }
                } catch (geocodeError) {
                  console.error(
                    'Geocoding error - using exact city match as fallback:',
                    geocodeError
                  );
                  // Use the pre-filtered profiles (matched by city name)
                  radiusFilteredIds = filteredProfiles.map((p) => p.id);
                  radiusSearchSucceeded = true;
                }
              } else {
                // Standard zip code radius search
                try {
                  radiusFilteredIds = await getProfilesWithinRadius(
                    centerLocation,
                    params.radius,
                    filteredProfiles
                  );

                  console.log(
                    'centerLocation when no useCityGeocode',
                    centerLocation
                  );
                  console.log(
                    'radiusFilteredIds when no useCityGeocode',
                    radiusFilteredIds
                  );
                  radiusSearchSucceeded = true;
                } catch (radiusError) {
                  console.error(
                    'Radius search error - using pre-filtered profiles as fallback:',
                    radiusError
                  );
                  // Use the pre-filtered profiles as fallback
                  radiusFilteredIds = filteredProfiles.map((p) => p.id);
                  radiusSearchSucceeded = true;
                }
              }

              // Apply radius filter if we got results
              if (radiusFilteredIds !== null) {
                if (radiusFilteredIds.length === 0) {
                  // No profiles within radius, return empty result
                  return {
                    profiles: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                  };
                }
                queryBuilder = queryBuilder.in('id', radiusFilteredIds);
                radiusSearchSucceeded = true;
                console.log(
                  `Applied radius filter: ${radiusFilteredIds.length} profiles match`
                );
              }
            } else {
              // No profiles matched the pre-filter criteria (e.g., no profiles in that city/state)
              // For radius searches, this means zero results
              console.log(
                `No profiles found matching pre-filter criteria for radius search`
              );
              return {
                profiles: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
              };
            }
          } // End of if (!radiusSearchSucceeded) - fallback geocoding block
        } catch (profileFetchError) {
          console.error(
            'Error fetching profiles for radius search:',
            profileFetchError
          );
          // Continue with search without radius filter
        }
      }
    } else if (zipCode || (zipCodes && zipCodes.length > 0)) {
      // Exact zip match if no radius specified
      // Support multiple zip codes with OR logic
      if (zipCodes && zipCodes.length > 0) {
        queryBuilder = queryBuilder.in('zip_code', zipCodes);
      } else if (zipCode) {
        queryBuilder = queryBuilder.eq('zip_code', zipCode);
      }
    }

    // FALLBACK: If radius search was attempted but failed (e.g., city not found),
    // still apply state filter to show relevant results
    if (radiusSearchAttempted && !radiusSearchSucceeded) {
      console.log('Radius search failed, applying state filter as fallback');
      if (state) {
        queryBuilder = queryBuilder.eq('state', state.toUpperCase());
        console.log(`Applied fallback state filter: ${state}`);
      }
    }

    // Execute query with pagination and sorting
    const { data, error, count } = await queryBuilder
      .order(sortColumn, { ascending: sortDirection === 'asc' })
      .range(from, to);

    console.log(
      `Final query results: ${data?.length || 0} profiles, count: ${count}`
    );

    if (error) {
      console.error('Error searching profiles:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Query params:', JSON.stringify(params, null, 2));
      throw error;
    }

    return {
      profiles: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get unique profession types
   */
  async getProfessionTypes(): Promise<string[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('profession_type')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching profession types:', error);
      return [];
    }

    // Get unique values
    const unique = [...new Set(data.map((p) => p.profession_type))];
    return unique.filter((p) => p).sort();
  }

  /**
   * Get unique states with names
   */
  async getStates(): Promise<StateInfo[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('state, city')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching states:', error);
      return [];
    }

    // Get unique states
    const unique = [...new Set(data.map((p) => p.state))];
    return unique
      .filter((s) => s)
      .sort()
      .map((code) => ({
        code: code,
        name: code, // For now, just use code as name
      }));
  }

  /**
   * Get unique offices
   */
  async getOffices(): Promise<OfficeInfo[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('office, city, state')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching offices:', error);
      return [];
    }

    // Group by office name
    const officeMap = new Map<string, { city: string; state: string }>();

    data.forEach((item) => {
      if (item.office && !officeMap.has(item.office)) {
        officeMap.set(item.office, {
          city: item.city,
          state: item.state,
        });
      }
    });

    return Array.from(officeMap.entries())
      .map(([name, info]) => ({
        name,
        city: info.city,
        state: info.state,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Insert multiple profiles (for sync service)
   */
  async insertProfiles(
    profiles: Omit<Profile, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<void> {
    const { error } = await this.adminClient.from('profiles').insert(profiles);

    if (error) {
      console.error('Error inserting profiles:', error);
      throw error;
    }
  }

  /**
   * Update a profile
   */
  async updateProfile(
    id: string,
    data: Partial<Omit<Profile, 'id' | 'created_at'>>
  ): Promise<void> {
    const { error } = await this.adminClient
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Soft delete profiles (set is_active = false)
   */
  async deleteProfiles(ids: string[]): Promise<void> {
    const { error } = await this.adminClient
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      console.error('Error deleting profiles:', error);
      throw error;
    }
  }
}
