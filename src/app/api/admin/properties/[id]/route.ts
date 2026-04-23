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

function mapProperty(row: PropertyRow) {
  return {
    id: row.id,
    client_id: row.client_id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

async function fetchPropertyRow(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<PropertyRow | null> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT id, client_id, name, address, city, state, zip, created_at, updated_at
      FROM properties
      WHERE id = @id
    `);
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as PropertyRow;
}

async function duplicateNameForClientExcluding(
  pool: Awaited<ReturnType<typeof getPool>>,
  clientId: number,
  nameKey: string,
  excludePropertyId: number
): Promise<boolean> {
  const res = await pool
    .request()
    .input('clientId', sql.Int, clientId)
    .input('key', sql.NVarChar(255), nameKey)
    .input('excludeId', sql.Int, excludePropertyId)
    .query(`
      SELECT 1 AS x
      FROM properties
      WHERE client_id = @clientId
        AND id <> @excludeId
        AND LOWER(LTRIM(RTRIM(name))) = @key
    `);
  return res.recordset.length > 0;
}

/**
 * GET /api/admin/properties/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const pool = await getPool();
    const row = await fetchPropertyRow(pool, id);
    if (!row) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    return NextResponse.json({ success: true, data: mapProperty(row) });
  } catch (error) {
    console.error('GET /api/admin/properties/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * PUT /api/admin/properties/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchPropertyRow(pool, id);
    if (!existing) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
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

    const v = parsed.value;
    const nameKey = normalizePropertyNameKey(v.name);
    if (
      await duplicateNameForClientExcluding(
        pool,
        existing.client_id,
        nameKey,
        id
      )
    ) {
      return jsonError(409, 'PROPERTY_NAME_EXISTS');
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(255), v.name)
      .input('address', sql.NVarChar(255), v.address)
      .input('city', sql.NVarChar(100), v.city)
      .input('state', sql.NVarChar(50), v.state)
      .input('zip', sql.NVarChar(20), v.zip)
      .query(`
        UPDATE properties
        SET
          name = @name,
          address = @address,
          city = @city,
          state = @state,
          zip = @zip,
          updated_at = GETDATE()
        WHERE id = @id
      `);

    const row = await fetchPropertyRow(pool, id);
    if (!row) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    return NextResponse.json({ success: true, data: mapProperty(row) });
  } catch (error) {
    console.error('PUT /api/admin/properties/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * DELETE /api/admin/properties/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchPropertyRow(pool, id);
    if (!existing) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const clientId = existing.client_id;
    if (clientId != null) {
      await pool
        .request()
        .input('propertyId', sql.Int, id)
        .input('clientId', sql.Int, clientId)
        .query(`
        INSERT INTO contacts
          (client_id, name, title, mobile, email, profile_image, created_at, updated_at)
        SELECT
          @clientId,
          name,
          title,
          ISNULL(mobile, N''),
          ISNULL(email, N''),
          profile_image,
          GETDATE(),
          GETDATE()
        FROM property_contacts
        WHERE property_id = @propertyId
      `);
    }

    await pool.request().input('id', sql.Int, id).query(`
      DELETE FROM properties WHERE id = @id
    `);

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/admin/properties/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
