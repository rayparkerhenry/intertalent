/**
 * Database Factory and Export
 * Central point for database access throughout the application
 * Uses Azure SQL Database
 */

import { AzureSqlDatabase } from './implementations/azure-sql';
import type { IDatabase } from './interface';

/**
 * Create database instance - Azure SQL only
 */
function createDatabase(): IDatabase {
  return new AzureSqlDatabase();
}

/**
 * Singleton database instance
 * Import this throughout your application
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db';
 * const profiles = await db.getAllProfiles();
 * ```
 */
export const db = createDatabase();

// Re-export types for convenience
export type { IDatabase, Profile } from './interface';
export type {
  ProfileSearchParams,
  PaginatedProfiles,
  StateInfo,
  OfficeInfo,
  LocationEmailResult,
} from './interface';
