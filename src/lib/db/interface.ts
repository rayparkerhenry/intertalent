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
  getAllProfiles(page?: number, limit?: number): Promise<PaginatedProfiles>;
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
