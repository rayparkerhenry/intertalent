import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  saveUploadedImage,
  FileValidationError,
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

/**
 * GET /api/admin/clients
 */
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, name, slug, primary_color, secondary_color, logo_url, hero_url, created_at, updated_at
      FROM clients
      ORDER BY id
    `);
    const rows = result.recordset as ClientRow[];
    const data = rows.map(mapClientList);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/clients:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * POST /api/admin/clients
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const nameRaw = formData.get('name');
    const slugRaw = formData.get('slug');

    const nameStr =
      typeof nameRaw === 'string' ? nameRaw.trim() : '';
    const slugStr =
      typeof slugRaw === 'string' ? slugRaw.trim() : '';

    if (!nameStr || !slugStr) {
      return jsonError(400, 'MISSING_REQUIRED_FIELDS');
    }
    if (!SLUG_REGEX.test(slugStr)) {
      return jsonError(400, 'INVALID_SLUG_FORMAT');
    }

    const pool = await getPool();
    const dupCheck = await pool
      .request()
      .input('slug', sql.NVarChar(100), slugStr)
      .query(`SELECT id FROM clients WHERE slug = @slug`);

    if (dupCheck.recordset.length > 0) {
      return jsonError(409, 'SLUG_ALREADY_EXISTS');
    }

    let primary_color: string | null = null;
    let secondary_color: string | null = null;

    if (formData.has('primary_color')) {
      const v = formData.get('primary_color');
      primary_color =
        typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
    }
    if (formData.has('secondary_color')) {
      const v = formData.get('secondary_color');
      secondary_color =
        typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
    }

    let logo_url: string | null = null;
    let hero_url: string | null = null;

    const logo = formData.get('logo');
    if (logo instanceof File && logo.size > 0) {
      try {
        logo_url = await saveUploadedImage(logo);
      } catch (e) {
        if (e instanceof FileValidationError) {
          return jsonError(e.statusCode, e.code);
        }
        throw e;
      }
    }

    const hero = formData.get('hero');
    if (hero instanceof File && hero.size > 0) {
      try {
        hero_url = await saveUploadedImage(hero);
      } catch (e) {
        if (e instanceof FileValidationError) {
          return jsonError(e.statusCode, e.code);
        }
        throw e;
      }
    }

    const insertResult = await pool
      .request()
      .input('name', sql.NVarChar(255), nameStr)
      .input('slug', sql.NVarChar(100), slugStr)
      .input('primary_color', sql.NVarChar(7), primary_color)
      .input('secondary_color', sql.NVarChar(7), secondary_color)
      .input('logo_url', sql.NVarChar(500), logo_url)
      .input('hero_url', sql.NVarChar(500), hero_url)
      .query(`
        INSERT INTO clients (name, slug, primary_color, secondary_color, logo_url, hero_url)
        OUTPUT
          INSERTED.id,
          INSERTED.name,
          INSERTED.slug,
          INSERTED.primary_color,
          INSERTED.secondary_color,
          INSERTED.logo_url,
          INSERTED.hero_url,
          INSERTED.created_at,
          INSERTED.updated_at
        VALUES (@name, @slug, @primary_color, @secondary_color, @logo_url, @hero_url)
      `);

    const row = insertResult.recordset[0] as ClientRow;
    return NextResponse.json(
      { success: true, data: mapClientList(row) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FileValidationError) {
      return jsonError(error.statusCode, error.code);
    }
    console.error('POST /api/admin/clients:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
