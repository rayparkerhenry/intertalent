import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';

interface CombinedRow {
  source: string;
  id: number;
  property_id: number | null;
  property_name: string | null;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
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

function mapRow(row: CombinedRow) {
  const mobile =
    row.mobile != null && String(row.mobile).trim() !== ''
      ? String(row.mobile).trim()
      : null;
  const email =
    row.email != null && String(row.email).trim() !== ''
      ? String(row.email).trim()
      : null;

  return {
    id: row.id,
    source: row.source === 'property' ? ('property' as const) : ('client' as const),
    property_id: row.property_id,
    property_name: row.property_name,
    name: row.name,
    title: row.title ?? null,
    mobile,
    email,
    profile_image: row.profile_image,
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

/**
 * GET /api/admin/clients/[id]/all-contacts
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

    const result = await pool.request().input('clientId', sql.Int, clientId)
      .query(`
        SELECT * FROM (
          SELECT
            CAST('client' AS VARCHAR(20)) AS source,
            c.id,
            CAST(NULL AS INT) AS property_id,
            CAST(NULL AS NVARCHAR(255)) AS property_name,
            c.name,
            c.title,
            c.mobile,
            c.email,
            c.profile_image,
            c.created_at,
            c.updated_at
          FROM contacts c
          WHERE c.client_id = @clientId

          UNION ALL

          SELECT
            CAST('property' AS VARCHAR(20)) AS source,
            pc.id,
            pc.property_id,
            p.name AS property_name,
            pc.name,
            pc.title,
            pc.mobile,
            pc.email,
            pc.profile_image,
            pc.created_at,
            pc.updated_at
          FROM property_contacts pc
          INNER JOIN properties p ON p.id = pc.property_id
          WHERE p.client_id = @clientId
        ) AS combined
        ORDER BY
          CASE WHEN source = 'client' THEN 0 ELSE 1 END,
          property_name,
          name
      `);

    const rows = result.recordset as CombinedRow[];
    return NextResponse.json({
      success: true,
      data: rows.map(mapRow),
    });
  } catch (error) {
    console.error('GET /api/admin/clients/[id]/all-contacts:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
