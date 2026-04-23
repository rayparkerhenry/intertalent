import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import { parsePropertyContactFields } from '@/lib/admin/property-contact-fields';
import {
  saveUploadedImage,
  FileValidationError,
} from '@/lib/upload/save-file';

interface PropertyContactRow {
  id: number;
  property_id: number;
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

function mapPropertyContact(row: PropertyContactRow) {
  return {
    id: row.id,
    property_id: row.property_id,
    name: row.name,
    title: row.title ?? null,
    mobile: row.mobile ?? null,
    email: row.email ?? null,
    profile_image: row.profile_image,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

async function fetchPropertyById(
  pool: Awaited<ReturnType<typeof getPool>>,
  propertyId: number
): Promise<{ id: number; client_id: number } | null> {
  const res = await pool
    .request()
    .input('propertyId', sql.Int, propertyId)
    .query(
      `SELECT id, client_id FROM dbo.properties WHERE id = @propertyId`
    );
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as { id: number; client_id: number };
}

/**
 * GET /api/admin/properties/[id]/contacts
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const propertyId = Number.parseInt(idParam, 10);
    if (!Number.isFinite(propertyId)) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const pool = await getPool();
    const property = await fetchPropertyById(pool, propertyId);
    if (!property) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const result = await pool
      .request()
      .input('propertyId', sql.Int, propertyId)
      .query(`
        SELECT id, property_id, name, title, mobile, email, profile_image, created_at, updated_at
        FROM dbo.property_contacts
        WHERE property_id = @propertyId
        ORDER BY name ASC
      `);

    const rows = result.recordset as PropertyContactRow[];
    return NextResponse.json({
      success: true,
      data: rows.map(mapPropertyContact),
    });
  } catch (error) {
    console.error('GET /api/admin/properties/[id]/contacts:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * POST /api/admin/properties/[id]/contacts
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const propertyId = Number.parseInt(idParam, 10);
    if (!Number.isFinite(propertyId)) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
    }

    const pool = await getPool();
    const property = await fetchPropertyById(pool, propertyId);
    if (!property) {
      return jsonError(404, 'PROPERTY_NOT_FOUND');
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

    const parsed = parsePropertyContactFields({
      name: nameRaw,
      title: typeof titleRaw === 'string' ? titleRaw : undefined,
      mobile: typeof mobileRaw === 'string' ? mobileRaw : undefined,
      email: typeof emailRaw === 'string' ? emailRaw : undefined,
    });

    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const v = parsed.value;

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
      .input('property_id', sql.Int, propertyId)
      .input('name', sql.NVarChar(255), v.name)
      .input('title', sql.NVarChar(100), v.title)
      .input('mobile', sql.NVarChar(20), v.mobile)
      .input('email', sql.NVarChar(255), v.email)
      .input('profile_image', sql.NVarChar(500), profile_image)
      .query(`
        INSERT INTO dbo.property_contacts (property_id, name, title, mobile, email, profile_image)
        OUTPUT
          INSERTED.id,
          INSERTED.property_id,
          INSERTED.name,
          INSERTED.title,
          INSERTED.mobile,
          INSERTED.email,
          INSERTED.profile_image,
          INSERTED.created_at,
          INSERTED.updated_at
        VALUES (@property_id, @name, @title, @mobile, @email, @profile_image)
      `);

    const row = insertResult.recordset[0] as PropertyContactRow;
    return NextResponse.json(
      { success: true, data: mapPropertyContact(row) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FileValidationError) {
      return jsonError(error.statusCode, error.code);
    }
    console.error('POST /api/admin/properties/[id]/contacts:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
