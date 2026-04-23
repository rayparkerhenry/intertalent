/**
 * Azure SQL Connection Pool
 * Shared connection pool for all database operations
 */

import sql from 'mssql';
import { getMssqlPooledConfig } from '../sql-config';

const config: sql.config = getMssqlPooledConfig();

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create connection pool
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL');
  }
  return pool;
}

/**
 * Close connection pool (for cleanup)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Closed Azure SQL connection');
  }
}

export { sql };
