import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import { parsePropertyContactFields } from '@/lib/admin/property-contact-fields';
import {
  saveUploadedImage,
  FileValidationError,
  safeUnlinkPublicUpload,
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

async function fetchPropertyContactRow(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<PropertyContactRow | null> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT id, property_id, name, title, mobile, email, profile_image, created_at, updated_at
      FROM dbo.property_contacts
      WHERE id = @id
    `);
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as PropertyContactRow;
}

/**
 * GET /api/admin/property-contacts/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    const pool = await getPool();
    const row = await fetchPropertyContactRow(pool, id);
    if (!row) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      data: mapPropertyContact(row),
    });
  } catch (error) {
    console.error('GET /api/admin/property-contacts/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * PUT /api/admin/property-contacts/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchPropertyContactRow(pool, id);
    if (!existing) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
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

    let profile_image = existing.profile_image;
    const profileFile = formData.get('profile_image');
    if (profileFile instanceof File && profileFile.size > 0) {
      try {
        const newPath = await saveUploadedImage(profileFile);
        safeUnlinkPublicUpload(existing.profile_image);
        profile_image = newPath;
      } catch (e) {
        if (e instanceof FileValidationError) {
          return jsonError(e.statusCode, e.code);
        }
        throw e;
      }
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(255), v.name)
      .input('title', sql.NVarChar(100), v.title)
      .input('mobile', sql.NVarChar(20), v.mobile)
      .input('email', sql.NVarChar(255), v.email)
      .input('profile_image', sql.NVarChar(500), profile_image)
      .query(`
        UPDATE dbo.property_contacts
        SET
          name = @name,
          title = @title,
          mobile = @mobile,
          email = @email,
          profile_image = @profile_image,
          updated_at = GETDATE()
        WHERE id = @id
      `);

    const row = await fetchPropertyContactRow(pool, id);
    if (!row) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    return NextResponse.json({ success: true, data: mapPropertyContact(row) });
  } catch (error) {
    if (error instanceof FileValidationError) {
      return jsonError(error.statusCode, error.code);
    }
    console.error('PUT /api/admin/property-contacts/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * DELETE /api/admin/property-contacts/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchPropertyContactRow(pool, id);
    if (!existing) {
      return jsonError(404, 'PROPERTY_CONTACT_NOT_FOUND');
    }

    safeUnlinkPublicUpload(existing.profile_image);

    await pool.request().input('id', sql.Int, id).query(`
      DELETE FROM dbo.property_contacts WHERE id = @id
    `);

    return NextResponse.json({
      success: true,
      message: 'Property contact deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/admin/property-contacts/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
