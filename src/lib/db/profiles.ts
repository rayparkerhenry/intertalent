/**
 * Database Helper Functions for Profiles
 * CRUD operations and query utilities
 */

import { supabase, supabaseAdmin } from './supabase';
import type { Profile } from './supabase';

/**
 * Search/Filter Parameters
 */
export interface ProfileSearchParams {
  query?: string; // Keyword search in professional summary
  professionType?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  office?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated response
 */
export interface PaginatedProfiles {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all profiles (with pagination)
 */
export async function getAllProfiles(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedProfiles> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get paginated data
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
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
 * Search and filter profiles
 */
export async function searchProfiles(
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
  } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let queryBuilder = supabase
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
  if (zipCode) {
    queryBuilder = queryBuilder.eq('zip_code', zipCode);
  }
  if (office) {
    queryBuilder = queryBuilder.eq('office', office);
  }

  // Keyword search in professional summary
  if (query) {
    queryBuilder = queryBuilder.textSearch('professional_summary', query, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Execute query with pagination
  const { data, error, count } = await queryBuilder
    .order('created_at', { ascending: false })
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
 * Get profile by ID
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
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
 * Get unique profession types
 */
export async function getProfessionTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('profession_type')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching profession types:', error);
    return [];
  }

  // Get unique values
  const unique = [...new Set(data.map((p) => p.profession_type))];
  return unique.sort();
}

/**
 * Get unique states
 */
export async function getStates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('state')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching states:', error);
    return [];
  }

  const unique = [...new Set(data.map((p) => p.state))];
  return unique.sort();
}

/**
 * Get unique offices
 */
export async function getOffices(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('office')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching offices:', error);
    return [];
  }

  const unique = [...new Set(data.map((p) => p.office))];
  return unique.sort();
}

/**
 * Insert profile (Admin only - use supabaseAdmin)
 */
export async function insertProfile(
  profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('Error inserting profile:', error);
    throw error;
  }

  return data;
}

/**
 * Update profile (Admin only)
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

/**
 * Soft delete profile (sets is_active = false)
 */
export async function deleteProfile(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting profile:', error);
    return false;
  }

  return true;
}

/**
 * Bulk upsert profiles (for CSV sync)
 */
export async function upsertProfiles(
  profiles: Omit<Profile, 'id' | 'created_at' | 'updated_at'>[]
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(profiles, {
      onConflict: 'first_name,last_initial,city,state', // Assuming this is unique identifier
    })
    .select('id');

  if (error) {
    console.error('Error upserting profiles:', error);
    throw error;
  }

  return data?.length || 0;
}

/**
 * Get profile count
 */
export async function getProfileCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error getting profile count:', error);
    return 0;
  }

  return count || 0;
}
