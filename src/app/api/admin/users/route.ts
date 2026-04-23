import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import { parseCreateAdminUser } from '@/lib/admin/user-fields';

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean | number | Buffer | null;
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

function mapActive(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (Buffer.isBuffer(v) && v.length > 0 && v[0] === 1) return true;
  return false;
}

function mapAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: mapActive(row.is_active),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

/**
 * GET /api/admin/users
 */
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM admin_users
      ORDER BY created_at ASC
    `);
    const rows = result.recordset as AdminUserRow[];
    const data = rows.map(mapAdminUser);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/users:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * POST /api/admin/users
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'INVALID_JSON');
    }

    const parsed = parseCreateAdminUser(body);
    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const v = parsed.value;
    const pool = await getPool();

    const dupCheck = await pool
      .request()
      .input('email', sql.NVarChar(255), v.email)
      .query(`
        SELECT id FROM admin_users
        WHERE LOWER(LTRIM(RTRIM(email))) = @email
      `);

    if (dupCheck.recordset.length > 0) {
      return jsonError(409, 'EMAIL_ALREADY_EXISTS');
    }

    const password_hash = await bcrypt.hash(v.password, 10);

    const insertResult = await pool
      .request()
      .input('name', sql.NVarChar(255), v.name)
      .input('email', sql.NVarChar(255), v.email)
      .input('password_hash', sql.NVarChar(255), password_hash)
      .input('role', sql.NVarChar(20), v.role)
      .query(`
        INSERT INTO admin_users (name, email, password_hash, role, is_active)
        OUTPUT
          INSERTED.id,
          INSERTED.name,
          INSERTED.email,
          INSERTED.role,
          INSERTED.is_active,
          INSERTED.created_at,
          INSERTED.updated_at
        VALUES (@name, @email, @password_hash, @role, 1)
      `);

    const row = insertResult.recordset[0] as AdminUserRow;
    return NextResponse.json(
      { success: true, data: mapAdminUser(row) },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/users:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
