import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  saveUploadedImage,
  FileValidationError,
  safeUnlinkPublicUpload,
} from '@/lib/upload/save-file';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface ClientRow {
  id: number;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  hero_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PropertyRow {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface ContactRow {
  id: number;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
}

interface ContactRowWithImage {
  profile_image: string | null;
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

function mapClientList(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    logo_url: row.logo_url,
    hero_url: row.hero_url,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function mapProperty(row: PropertyRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip: row.zip ?? '',
  };
}

function mapContact(row: ContactRow) {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? null,
    mobile: row.mobile ?? '',
    email: row.email ?? '',
    profile_image: row.profile_image,
  };
}

async function fetchClientRow(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<ClientRow | null> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT id, name, slug, primary_color, secondary_color, logo_url, hero_url, created_at, updated_at
      FROM clients
      WHERE id = @id
    `);
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as ClientRow;
}

/**
 * GET /api/admin/clients/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const pool = await getPool();
    const clientRow = await fetchClientRow(pool, id);
    if (!clientRow) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const propsRes = await pool
      .request()
      .input('clientId', sql.Int, id)
      .query(`
        SELECT id, name, address, city, state, zip
        FROM properties
        WHERE client_id = @clientId
        ORDER BY id
      `);

    const contactsRes = await pool
      .request()
      .input('clientId', sql.Int, id)
      .query(`
        SELECT id, name, title, mobile, email, profile_image
        FROM contacts
        WHERE client_id = @clientId
        ORDER BY id
      `);

    const contactCountRes = await pool
      .request()
      .input('clientId', sql.Int, id)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM contacts WHERE client_id = @clientId)
          +
          (SELECT COUNT(*) FROM property_contacts pc
           INNER JOIN properties p ON p.id = pc.property_id
           WHERE p.client_id = @clientId) AS total_contacts
      `);

    const properties = (propsRes.recordset as PropertyRow[]).map(mapProperty);
    const mappedContacts = (contactsRes.recordset as ContactRow[]).map(
      mapContact
    );
    const totalContacts = Number(
      (contactCountRes.recordset[0] as { total_contacts: number } | undefined)
        ?.total_contacts ?? 0
    );
    const padding = Math.max(0, totalContacts - mappedContacts.length);
    const contacts =
      padding === 0
        ? mappedContacts
        : [
            ...mappedContacts,
            ...Array.from({ length: padding }, (_, i) => ({
              id: -(i + 1),
              name: '',
              title: null as string | null,
              mobile: '',
              email: '',
              profile_image: null as string | null,
            })),
          ];

    const data = {
      ...mapClientList(clientRow),
      properties,
      contacts,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/clients/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * PUT /api/admin/clients/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchClientRow(pool, id);
    if (!existing) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const formData = await request.formData();
    const setFragments: string[] = [];
    const req = pool.request().input('id', sql.Int, id);

    if (formData.has('name')) {
      const nameRaw = formData.get('name');
      if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
        return jsonError(400, 'MISSING_REQUIRED_FIELDS');
      }
      setFragments.push('name = @upd_name');
      req.input('upd_name', sql.NVarChar(255), nameRaw.trim());
    }

    if (formData.has('slug')) {
      const slugRaw = formData.get('slug');
      if (typeof slugRaw !== 'string' || !slugRaw.trim()) {
        return jsonError(400, 'INVALID_SLUG_FORMAT');
      }
      const slugStr = slugRaw.trim();
      if (!SLUG_REGEX.test(slugStr)) {
        return jsonError(400, 'INVALID_SLUG_FORMAT');
      }
      const dup = await pool
        .request()
        .input('slug', sql.NVarChar(100), slugStr)
        .input('cid', sql.Int, id)
        .query(
          `SELECT id FROM clients WHERE slug = @slug AND id <> @cid`
        );
      if (dup.recordset.length > 0) {
        return jsonError(409, 'SLUG_ALREADY_EXISTS');
      }
      setFragments.push('slug = @upd_slug');
      req.input('upd_slug', sql.NVarChar(100), slugStr);
    }

    if (formData.has('primary_color')) {
      const v = formData.get('primary_color');
      const val =
        typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
      setFragments.push('primary_color = @upd_pc');
      req.input('upd_pc', sql.NVarChar(7), val);
    }

    if (formData.has('secondary_color')) {
      const v = formData.get('secondary_color');
      const val =
        typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
      setFragments.push('secondary_color = @upd_sc');
      req.input('upd_sc', sql.NVarChar(7), val);
    }

    if (formData.has('logo')) {
      const logo = formData.get('logo');
      if (logo instanceof File && logo.size > 0) {
        safeUnlinkPublicUpload(existing.logo_url);
        let newUrl: string;
        try {
          newUrl = await saveUploadedImage(logo);
        } catch (e) {
          if (e instanceof FileValidationError) {
            return jsonError(e.statusCode, e.code);
          }
          throw e;
        }
        setFragments.push('logo_url = @upd_logo');
        req.input('upd_logo', sql.NVarChar(500), newUrl);
      }
    }

    if (formData.has('hero')) {
      const hero = formData.get('hero');
      if (hero instanceof File && hero.size > 0) {
        safeUnlinkPublicUpload(existing.hero_url);
        let newUrl: string;
        try {
          newUrl = await saveUploadedImage(hero);
        } catch (e) {
          if (e instanceof FileValidationError) {
            return jsonError(e.statusCode, e.code);
          }
          throw e;
        }
        setFragments.push('hero_url = @upd_hero');
        req.input('upd_hero', sql.NVarChar(500), newUrl);
      }
    }

    if (setFragments.length > 0) {
      setFragments.push('updated_at = GETDATE()');
      await req.query(
        `UPDATE clients SET ${setFragments.join(', ')} WHERE id = @id`
      );
    }

    const refreshed = await fetchClientRow(pool, id);
    if (!refreshed) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      data: mapClientList(refreshed),
    });
  } catch (error) {
    if (error instanceof FileValidationError) {
      return jsonError(error.statusCode, error.code);
    }
    console.error('PUT /api/admin/clients/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * DELETE /api/admin/clients/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const pool = await getPool();
    const clientRow = await fetchClientRow(pool, id);
    if (!clientRow) {
      return jsonError(404, 'CLIENT_NOT_FOUND');
    }

    const contactsRes = await pool
      .request()
      .input('clientId', sql.Int, id)
      .query(
        `SELECT profile_image FROM contacts WHERE client_id = @clientId`
      );

    await pool
      .request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM clients WHERE id = @id`);

    safeUnlinkPublicUpload(clientRow.logo_url);
    safeUnlinkPublicUpload(clientRow.hero_url);

    const contactRows = contactsRes.recordset as ContactRowWithImage[];
    for (const row of contactRows) {
      safeUnlinkPublicUpload(row.profile_image);
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/admin/clients/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
