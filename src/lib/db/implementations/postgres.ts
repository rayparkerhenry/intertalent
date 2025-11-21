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
import { getProfilesWithinRadius } from '@/lib/geospatial';

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
      professionType,
      city,
      state,
      zipCode,
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
    if (city) {
      queryBuilder = queryBuilder.ilike('city', `%${city}%`);
    }
    if (state) {
      queryBuilder = queryBuilder.eq('state', state.toUpperCase());
    }
    if (office) {
      queryBuilder = queryBuilder.eq('office', office);
    }

    // Keyword search in professional summary, name, and city
    // Searches: bio text, first name, and city name (e.g., "HVAC" or "Ethan")
    if (query) {
      queryBuilder = queryBuilder.or(
        `professional_summary.ilike.%${query}%,first_name.ilike.%${query}%,city.ilike.%${query}%`
      );
    }

    // Handle geospatial radius search if zipCode and radius are provided
    let radiusFilteredIds: string[] | null = null;
    if (zipCode && params.radius && params.radius > 0) {
      // First, get all profile IDs and zip codes for radius filtering
      const { data: allProfiles } = await this.client
        .from('profiles')
        .select('id, zip_code')
        .eq('is_active', true);

      if (allProfiles && allProfiles.length > 0) {
        radiusFilteredIds = await getProfilesWithinRadius(
          zipCode,
          params.radius,
          allProfiles
        );

        // Apply radius filter
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
      }
    } else if (zipCode) {
      // Exact zip match if no radius specified
      queryBuilder = queryBuilder.eq('zip_code', zipCode);
    }

    // Execute query with pagination and sorting
    const { data, error, count } = await queryBuilder
      .order(sortColumn, { ascending: sortDirection === 'asc' })
      .range(from, to);

    if (error) {
      console.error('Error searching profiles:', error);
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
