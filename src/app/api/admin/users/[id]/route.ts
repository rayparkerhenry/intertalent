import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import { parseUpdateAdminUser } from '@/lib/admin/user-fields';

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

async function fetchAdminUserRow(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<AdminUserRow | null> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
      FROM admin_users
      WHERE id = @id
    `);
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as AdminUserRow;
}

async function emailExistsExcluding(
  pool: Awaited<ReturnType<typeof getPool>>,
  emailLower: string,
  excludeId: number
): Promise<boolean> {
  const res = await pool
    .request()
    .input('email', sql.NVarChar(255), emailLower)
    .input('excludeId', sql.Int, excludeId)
    .query(`
      SELECT 1 AS x
      FROM admin_users
      WHERE id <> @excludeId
        AND LOWER(LTRIM(RTRIM(email))) = @email
    `);
  return res.recordset.length > 0;
}

async function countSuperAdmins(
  pool: Awaited<ReturnType<typeof getPool>>
): Promise<number> {
  const res = await pool.request().query(`
    SELECT COUNT(*) AS c
    FROM admin_users
    WHERE role = N'super_admin'
  `);
  const row = res.recordset[0] as { c: number } | undefined;
  return row?.c ?? 0;
}

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    const pool = await getPool();
    const row = await fetchAdminUserRow(pool, id);
    if (!row) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    return NextResponse.json({ success: true, data: mapAdminUser(row) });
  } catch (error) {
    console.error('GET /api/admin/users/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * PUT /api/admin/users/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchAdminUserRow(pool, id);
    if (!existing) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'INVALID_JSON');
    }

    const parsed = parseUpdateAdminUser(body);
    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const v = parsed.value;

    if (await emailExistsExcluding(pool, v.email, id)) {
      return jsonError(409, 'EMAIL_ALREADY_EXISTS');
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(255), v.name)
      .input('email', sql.NVarChar(255), v.email)
      .input('role', sql.NVarChar(20), v.role)
      .input('is_active', sql.Bit, v.is_active ? 1 : 0)
      .query(`
        UPDATE admin_users
        SET
          name = @name,
          email = @email,
          role = @role,
          is_active = @is_active,
          updated_at = GETDATE()
        WHERE id = @id
      `);

    const row = await fetchAdminUserRow(pool, id);
    if (!row) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    return NextResponse.json({ success: true, data: mapAdminUser(row) });
  } catch (error) {
    console.error('PUT /api/admin/users/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * DELETE /api/admin/users/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    const pool = await getPool();
    const existing = await fetchAdminUserRow(pool, id);
    if (!existing) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    if (existing.role === 'super_admin') {
      const superCount = await countSuperAdmins(pool);
      if (superCount <= 1) {
        return jsonError(409, 'CANNOT_DELETE_LAST_SUPER_ADMIN');
      }
    }

    await pool.request().input('id', sql.Int, id).query(`
      DELETE FROM admin_users WHERE id = @id
    `);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id]:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
