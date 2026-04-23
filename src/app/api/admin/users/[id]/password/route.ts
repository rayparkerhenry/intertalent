import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import { parsePasswordChange } from '@/lib/admin/user-fields';

function jsonError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

async function userExists(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: number
): Promise<boolean> {
  const res = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`SELECT 1 AS x FROM admin_users WHERE id = @id`);
  return res.recordset.length > 0;
}

/**
 * PUT /api/admin/users/[id]/password
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
    if (!(await userExists(pool, id))) {
      return jsonError(404, 'USER_NOT_FOUND');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'INVALID_JSON');
    }

    const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const parsed = parsePasswordChange(o?.password);
    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const password_hash = await bcrypt.hash(parsed.value, 10);

    await pool
      .request()
      .input('id', sql.Int, id)
      .input('password_hash', sql.NVarChar(255), password_hash)
      .query(`
        UPDATE admin_users
        SET password_hash = @password_hash, updated_at = GETDATE()
        WHERE id = @id
      `);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/admin/users/[id]/password:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
