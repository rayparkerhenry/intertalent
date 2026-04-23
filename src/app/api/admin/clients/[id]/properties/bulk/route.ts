import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  normalizePropertyNameKey,
  parsePropertyFields,
} from '@/lib/admin/property-fields';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

function jsonError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
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

function ciGet(row: Record<string, string>, field: string): string {
  const low = field.toLowerCase();
  for (const [k, v] of Object.entries(row)) {
    if (k.trim().toLowerCase() === low) return v ?? '';
  }
  return '';
}

function headerHasName(records: Record<string, string>[]): boolean {
  if (records.length === 0) return true;
  return Object.keys(records[0]).some(
    (k) => k.trim().toLowerCase() === 'name'
  );
}

/**
 * POST /api/admin/clients/[id]/properties/bulk
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

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return jsonError(400, 'MISSING_FILE');
    }
    if (file.size === 0) {
      return jsonError(400, 'EMPTY_FILE');
    }
    if (file.size > MAX_CSV_BYTES) {
      return jsonError(413, 'FILE_TOO_LARGE');
    }

    const lowerName = file.name.trim().toLowerCase();
    if (!lowerName.endsWith('.csv')) {
      return jsonError(415, 'UNSUPPORTED_FILE_TYPE');
    }

    const text = await file.text();
    let records: Record<string, string>[];
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (e) {
      console.error('CSV parse error:', e);
      return jsonError(400, 'INVALID_CSV');
    }

    if (records.length > 0 && !headerHasName(records)) {
      return jsonError(400, 'MISSING_NAME_COLUMN');
    }

    const existingRes = await pool
      .request()
      .input('clientId', sql.Int, clientId)
      .query(`
        SELECT LOWER(LTRIM(RTRIM(name))) AS k
        FROM properties
        WHERE client_id = @clientId
      `);
    const dbKeys = new Set<string>();
    for (const row of existingRes.recordset as { k: string }[]) {
      if (row.k) dbKeys.add(row.k);
    }

    const seenInFile = new Set<string>();
    let imported = 0;
    const skipped_rows: { row: number; reason: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const rowNum = i + 1;
      const nameRaw = ciGet(rec, 'name');
      if (!nameRaw.trim()) {
        skipped_rows.push({ row: rowNum, reason: 'MISSING_NAME' });
        continue;
      }

      const parsed = parsePropertyFields({
        name: nameRaw,
        address: ciGet(rec, 'address'),
        city: ciGet(rec, 'city'),
        state: ciGet(rec, 'state'),
        zip: ciGet(rec, 'zip'),
      });

      if (!parsed.ok) {
        skipped_rows.push({ row: rowNum, reason: parsed.code });
        continue;
      }

      const v = parsed.value;
      const key = normalizePropertyNameKey(v.name);
      if (seenInFile.has(key)) {
        skipped_rows.push({ row: rowNum, reason: 'DUPLICATE_IN_FILE' });
        continue;
      }
      if (dbKeys.has(key)) {
        skipped_rows.push({ row: rowNum, reason: 'DUPLICATE_EXISTS' });
        continue;
      }

      await pool
        .request()
        .input('client_id', sql.Int, clientId)
        .input('name', sql.NVarChar(255), v.name)
        .input('address', sql.NVarChar(255), v.address)
        .input('city', sql.NVarChar(100), v.city)
        .input('state', sql.NVarChar(50), v.state)
        .input('zip', sql.NVarChar(20), v.zip)
        .query(`
          INSERT INTO properties (client_id, name, address, city, state, zip)
          VALUES (@client_id, @name, @address, @city, @state, @zip)
        `);

      seenInFile.add(key);
      dbKeys.add(key);
      imported += 1;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: skipped_rows.length,
      skipped_rows,
    });
  } catch (error) {
    console.error('POST /api/admin/clients/[id]/properties/bulk:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
