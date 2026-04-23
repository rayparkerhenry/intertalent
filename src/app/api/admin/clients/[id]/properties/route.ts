import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  normalizePropertyNameKey,
  parsePropertyFields,
} from '@/lib/admin/property-fields';

interface PropertyRow {
  id: number;
  client_id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: Date;
  updated_at: Date;
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

function toIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function mapPropertyList(row: PropertyRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

async function fetchClientId(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<number | null> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`SELECT id FROM clients WHERE id = @id`);
  if (res.recordset.length === 0) return null;
  return (res.recordset[0] as { id: number }).id;
}

async function duplicateNameForClient(
  pool: Awaited<ReturnType<typeof getPool>>,
  clientId: number,
  nameKey: string
): Promise<boolean> {
  const res = await pool
    .request()
    .input('clientId', sql.Int, clientId)
    .input('key', sql.NVarChar(255), nameKey)
    .query(`
      SELECT 1 AS x
      FROM properties
      WHERE client_id = @clientId
        AND LOWER(LTRIM(RTRIM(name))) = @key
    `);
  return res.recordset.length > 0;
}

/**
 * GET /api/admin/clients/[id]/properties
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const clientId = Number.parseInt(idParam, 10);
    if (!Number.isFinite(clientId)) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const pool = await getPool();
    const exists = await fetchClientId(pool, clientId);
    if (exists === null) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const result = await pool
      .request()
      .input('clientId', sql.Int, clientId)
      .query(`
        SELECT id, client_id, name, address, city, state, zip, created_at, updated_at
        FROM properties
        WHERE client_id = @clientId
        ORDER BY id
      `);

    const rows = result.recordset as PropertyRow[];
    return NextResponse.json({
      success: true,
      data: rows.map(mapPropertyList),
    });
  } catch (error) {
    console.error('GET /api/admin/clients/[id]/properties:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * POST /api/admin/clients/[id]/properties
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const clientId = Number.parseInt(idParam, 10);
    if (!Number.isFinite(clientId)) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const pool = await getPool();
    const exists = await fetchClientId(pool, clientId);
    if (exists === null) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'INVALID_JSON');
    }

    if (typeof body !== 'object' || body === null) {
      return jsonError(400, 'INVALID_JSON');
    }

    const o = body as Record<string, unknown>;
    const parsed = parsePropertyFields({
      name: o.name,
      address: o.address,
      city: o.city,
      state: o.state,
      zip: o.zip,
    });

    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const { value: v } = parsed;
    const nameKey = normalizePropertyNameKey(v.name);
    if (await duplicateNameForClient(pool, clientId, nameKey)) {
      return jsonError(409, 'PROPERTY_NAME_EXISTS');
    }

    const insertResult = await pool
      .request()
      .input('client_id', sql.Int, clientId)
      .input('name', sql.NVarChar(255), v.name)
      .input('address', sql.NVarChar(255), v.address)
      .input('city', sql.NVarChar(100), v.city)
      .input('state', sql.NVarChar(50), v.state)
      .input('zip', sql.NVarChar(20), v.zip)
      .query(`
        INSERT INTO properties (client_id, name, address, city, state, zip)
        OUTPUT
          INSERTED.id,
          INSERTED.client_id,
          INSERTED.name,
          INSERTED.address,
          INSERTED.city,
          INSERTED.state,
          INSERTED.zip,
          INSERTED.created_at,
          INSERTED.updated_at
        VALUES (@client_id, @name, @address, @city, @state, @zip)
      `);

    const row = insertResult.recordset[0] as PropertyRow;
    return NextResponse.json(
      {
        success: true,
        data: {
          ...mapPropertyList(row),
          client_id: row.client_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/clients/[id]/properties:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
