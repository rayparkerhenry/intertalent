import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  normalizeContactNameKey,
  parseContactFields,
} from '@/lib/admin/contact-fields';
import {
  saveUploadedImage,
  FileValidationError,
} from '@/lib/upload/save-file';

interface ContactRow {
  id: number;
  client_id: number;
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

function mapContactList(row: ContactRow) {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? null,
    mobile: row.mobile ?? '',
    email: row.email ?? '',
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
      FROM contacts
      WHERE client_id = @clientId
        AND LOWER(LTRIM(RTRIM(name))) = @key
    `);
  return res.recordset.length > 0;
}

/**
 * GET /api/admin/clients/[id]/contacts
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
        SELECT id, client_id, name, title, mobile, email, profile_image, created_at, updated_at
        FROM contacts
        WHERE client_id = @clientId
        ORDER BY id
      `);

    const rows = result.recordset as ContactRow[];
    return NextResponse.json({
      success: true,
      data: rows.map(mapContactList),
    });
  } catch (error) {
    console.error('GET /api/admin/clients/[id]/contacts:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * POST /api/admin/clients/[id]/contacts
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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, 'INVALID_FORM_DATA');
    }

    const nameRaw = formData.get('name');
    const titleRaw = formData.get('title');
    const mobileRaw = formData.get('mobile');
    const emailRaw = formData.get('email');

    const parsed = parseContactFields({
      name: nameRaw,
      title: typeof titleRaw === 'string' ? titleRaw : undefined,
      mobile: typeof mobileRaw === 'string' ? mobileRaw : undefined,
      email: typeof emailRaw === 'string' ? emailRaw : undefined,
    });

    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const v = parsed.value;
    const nameKey = normalizeContactNameKey(v.name);
    if (await duplicateNameForClient(pool, clientId, nameKey)) {
      return jsonError(409, 'CONTACT_NAME_EXISTS');
    }

    let profile_image: string | null = null;
    const profileFile = formData.get('profile_image');
    if (profileFile instanceof File && profileFile.size > 0) {
      try {
        profile_image = await saveUploadedImage(profileFile);
      } catch (e) {
        if (e instanceof FileValidationError) {
          return jsonError(e.statusCode, e.code);
        }
        throw e;
      }
    }

    const insertResult = await pool
      .request()
      .input('client_id', sql.Int, clientId)
      .input('name', sql.NVarChar(255), v.name)
      .input('title', sql.NVarChar(100), v.title)
      .input('mobile', sql.NVarChar(20), v.mobile)
      .input('email', sql.NVarChar(255), v.email)
      .input('profile_image', sql.NVarChar(500), profile_image)
      .query(`
        INSERT INTO contacts (client_id, name, title, mobile, email, profile_image)
        OUTPUT
          INSERTED.id,
          INSERTED.client_id,
          INSERTED.name,
          INSERTED.title,
          INSERTED.mobile,
          INSERTED.email,
          INSERTED.profile_image,
          INSERTED.created_at,
          INSERTED.updated_at
        VALUES (@client_id, @name, @title, @mobile, @email, @profile_image)
      `);

    const row = insertResult.recordset[0] as ContactRow;
    return NextResponse.json(
      {
        success: true,
        data: {
          ...mapContactList(row),
          client_id: row.client_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FileValidationError) {
      return jsonError(error.statusCode, error.code);
    }
    console.error('POST /api/admin/clients/[id]/contacts:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
