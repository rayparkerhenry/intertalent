/**
 * Resolves Azure SQL / SQL Server connection settings from env.
 * Uses DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD.
 */

import type sql from 'mssql';

const DEFAULT_SERVER = 'ipsql2025.database.windows.net';
const DEFAULT_DATABASE = 'intertalent_DB';

export function getMssqlBaseConfig(): sql.config {
  return {
    server: process.env.DB_SERVER || DEFAULT_SERVER,
    database: process.env.DB_NAME || DEFAULT_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: true,
      enableArithAbort: true,
      trustServerCertificate: false,
    },
  };
}

/** Config including connection pool options (app runtime). */
export function getMssqlPooledConfig(): sql.config {
  return {
    ...getMssqlBaseConfig(),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}
