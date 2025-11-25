/**
 * Database Abstraction Interface
 * This interface allows swapping between PostgreSQL and Azure SQL
 * without changing application code
 */

import type { Profile } from './supabase';

/**
 * Search/Filter Parameters
 */
export interface ProfileSearchParams {
  query?: string; // Single keyword (legacy, kept for hero search)
  keywords?: string[]; // Multiple keywords for OR search
  professionType?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  zipCodes?: string[]; // Multiple zip codes for OR search
  radius?: number; // Radius in miles for zip code search
  office?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'location' | 'profession';
  sortDirection?: 'asc' | 'desc';
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
 * State information
 */
export interface StateInfo {
  code: string;
  name: string;
}

/**
 * Office information
 */
export interface OfficeInfo {
  name: string;
  city: string;
  state: string;
}

/**
 * Database Interface
 * All database implementations must conform to this interface
 */
export interface IDatabase {
  // Profile operations
  getAllProfiles(
    page?: number,
    limit?: number,
    sortBy?: 'name' | 'location' | 'profession',
    sortDirection?: 'asc' | 'desc'
  ): Promise<PaginatedProfiles>;
  getProfileById(id: string): Promise<Profile | null>;
  searchProfiles(params: ProfileSearchParams): Promise<PaginatedProfiles>;

  // Metadata operations
  getProfessionTypes(): Promise<string[]>;
  getStates(): Promise<StateInfo[]>;
  getOffices(): Promise<OfficeInfo[]>;

  // Profile mutations (for sync service)
  insertProfiles(profiles: Profile[]): Promise<void>;
  updateProfile(id: string, data: Partial<Profile>): Promise<void>;
  deleteProfiles(ids: string[]): Promise<void>;
}
