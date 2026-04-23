import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/clients/azure-sql';
import {
  normalizeContactNameKey,
  parseContactFields,
} from '@/lib/admin/contact-fields';

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

type Source = 'client' | 'property';

function isSource(v: unknown): v is Source {
  return v === 'client' || v === 'property';
}

async function duplicateNameForClientTx(
  transaction: sql.Transaction,
  clientId: number,
  nameKey: string
): Promise<boolean> {
  const res = await new sql.Request(transaction)
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

async function fetchPropertyForClient(
  transaction: sql.Transaction,
  propertyId: number,
  clientId: number
): Promise<{ id: number } | null> {
  const res = await new sql.Request(transaction)
    .input('propertyId', sql.Int, propertyId)
    .input('clientId', sql.Int, clientId)
    .query(`
      SELECT id FROM properties
      WHERE id = @propertyId AND client_id = @clientId
    `);
  if (res.recordset.length === 0) return null;
  return res.recordset[0] as { id: number };
}

interface ClientContactRow {
  id: number;
  client_id: number;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
}

interface PropertyContactFetchRow {
  id: number;
  property_id: number;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
  client_id: number;
}

/**
 * POST /api/admin/contacts/reassign
 */
export async function POST(request: NextRequest) {
  let transaction: sql.Transaction | null = null;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'MISSING_REQUIRED_FIELDS');
    }

    if (typeof body !== 'object' || body === null) {
      return jsonError(400, 'MISSING_REQUIRED_FIELDS');
    }

    const o = body as Record<string, unknown>;
    const contactId = o.contactId;
    const currentSource = o.currentSource;
    const newSource = o.newSource;
    const newPropertyId = o.newPropertyId;
    const clientId = o.clientId;

    if (
      typeof contactId !== 'number' ||
      !Number.isFinite(contactId) ||
      contactId <= 0
    ) {
      return jsonError(400, 'MISSING_REQUIRED_FIELDS');
    }
    if (
      typeof clientId !== 'number' ||
      !Number.isFinite(clientId) ||
      clientId <= 0
    ) {
      return jsonError(400, 'MISSING_REQUIRED_FIELDS');
    }
    if (!isSource(currentSource) || !isSource(newSource)) {
      return jsonError(400, 'INVALID_SOURCE');
    }
    if (newSource === 'property') {
      if (
        typeof newPropertyId !== 'number' ||
        !Number.isFinite(newPropertyId) ||
        newPropertyId <= 0
      ) {
        return jsonError(400, 'MISSING_REQUIRED_FIELDS');
      }
    } else {
      if (newPropertyId !== null && newPropertyId !== undefined) {
        return jsonError(400, 'INVALID_SOURCE');
      }
    }

    const parsed = parseContactFields({
      name: o.name,
      title: o.title === null ? undefined : o.title,
      mobile: o.mobile === null ? undefined : o.mobile,
      email: o.email === null ? undefined : o.email,
    });

    if (!parsed.ok) {
      return jsonError(400, parsed.code);
    }

    const v = parsed.value;
    const nameKey = normalizeContactNameKey(v.name);

    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let profileImage: string | null = null;
    let oldTable: 'contacts' | 'property_contacts' = 'contacts';
    let currentPropertyId: number | null = null;

    if (currentSource === 'client') {
      const cur = await new sql.Request(transaction)
        .input('id', sql.Int, contactId)
        .query(`
          SELECT id, client_id, name, title, mobile, email, profile_image
          FROM contacts
          WHERE id = @id
        `);

      if (cur.recordset.length === 0) {
        await transaction.rollback();
        return jsonError(404, 'CONTACT_NOT_FOUND');
      }

      const row = cur.recordset[0] as ClientContactRow;
      if (row.client_id !== clientId) {
        await transaction.rollback();
        return jsonError(404, 'CONTACT_NOT_FOUND');
      }

      profileImage = row.profile_image;
      oldTable = 'contacts';
    } else {
      const cur = await new sql.Request(transaction)
        .input('id', sql.Int, contactId)
        .query(`
          SELECT pc.id, pc.property_id, pc.name, pc.title, pc.mobile, pc.email,
                 pc.profile_image, p.client_id
          FROM property_contacts pc
          INNER JOIN properties p ON p.id = pc.property_id
          WHERE pc.id = @id
        `);

      if (cur.recordset.length === 0) {
        await transaction.rollback();
        return jsonError(404, 'CONTACT_NOT_FOUND');
      }

      const row = cur.recordset[0] as PropertyContactFetchRow;
      if (row.client_id !== clientId) {
        await transaction.rollback();
        return jsonError(404, 'CONTACT_NOT_FOUND');
      }

      profileImage = row.profile_image;
      oldTable = 'property_contacts';
      currentPropertyId = row.property_id;
    }

    if (currentSource === newSource) {
      if (newSource === 'client') {
        await transaction.rollback();
        return jsonError(400, 'SAME_ASSIGNMENT');
      }
      if (
        newSource === 'property' &&
        typeof newPropertyId === 'number' &&
        currentPropertyId === newPropertyId
      ) {
        await transaction.rollback();
        return jsonError(400, 'SAME_ASSIGNMENT');
      }
    }

    if (newSource === 'property') {
      const prop = await fetchPropertyForClient(
        transaction,
        newPropertyId as number,
        clientId
      );
      if (!prop) {
        await transaction.rollback();
        return jsonError(404, 'PROPERTY_NOT_FOUND');
      }
    }

    if (newSource === 'client') {
      if (await duplicateNameForClientTx(transaction, clientId, nameKey)) {
        await transaction.rollback();
        return jsonError(409, 'CONTACT_NAME_EXISTS');
      }

      const ins = await new sql.Request(transaction)
        .input('client_id', sql.Int, clientId)
        .input('name', sql.NVarChar(255), v.name)
        .input('title', sql.NVarChar(100), v.title)
        .input('mobile', sql.NVarChar(20), v.mobile)
        .input('email', sql.NVarChar(255), v.email)
        .input('profile_image', sql.NVarChar(500), profileImage)
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

      const inserted = ins.recordset[0] as {
        id: number;
        client_id: number;
        name: string;
        title: string | null;
        mobile: string | null;
        email: string | null;
        profile_image: string | null;
        created_at: Date;
        updated_at: Date;
      };

      if (oldTable === 'contacts') {
        await new sql.Request(transaction)
          .input('id', sql.Int, contactId)
          .query(`DELETE FROM contacts WHERE id = @id`);
      } else {
        await new sql.Request(transaction)
          .input('id', sql.Int, contactId)
          .query(`DELETE FROM property_contacts WHERE id = @id`);
      }

      await transaction.commit();
      transaction = null;

      return NextResponse.json({
        success: true,
        data: {
          id: inserted.id,
          source: 'client' as const,
          property_id: null,
          name: inserted.name,
          title: inserted.title ?? null,
          mobile:
            inserted.mobile != null && String(inserted.mobile).trim() !== ''
              ? String(inserted.mobile).trim()
              : null,
          email:
            inserted.email != null && String(inserted.email).trim() !== ''
              ? String(inserted.email).trim()
              : null,
          profile_image: inserted.profile_image,
          created_at: toIso(inserted.created_at),
          updated_at: toIso(inserted.updated_at),
        },
      });
    }

    const insProp = await new sql.Request(transaction)
      .input('property_id', sql.Int, newPropertyId as number)
      .input('name', sql.NVarChar(255), v.name)
      .input('title', sql.NVarChar(100), v.title)
      .input('mobile', sql.NVarChar(20), v.mobile)
      .input('email', sql.NVarChar(255), v.email)
      .input('profile_image', sql.NVarChar(500), profileImage)
      .query(`
        INSERT INTO property_contacts (property_id, name, title, mobile, email, profile_image)
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

    const insertedP = insProp.recordset[0] as {
      id: number;
      property_id: number;
      name: string;
      title: string | null;
      mobile: string | null;
      email: string | null;
      profile_image: string | null;
      created_at: Date;
      updated_at: Date;
    };

    if (oldTable === 'contacts') {
      await new sql.Request(transaction)
        .input('id', sql.Int, contactId)
        .query(`DELETE FROM contacts WHERE id = @id`);
    } else {
      await new sql.Request(transaction)
        .input('id', sql.Int, contactId)
        .query(`DELETE FROM property_contacts WHERE id = @id`);
    }

    await transaction.commit();
    transaction = null;

    return NextResponse.json({
      success: true,
      data: {
        id: insertedP.id,
        source: 'property' as const,
        property_id: insertedP.property_id,
        name: insertedP.name,
        title: insertedP.title ?? null,
        mobile:
          insertedP.mobile != null && String(insertedP.mobile).trim() !== ''
            ? String(insertedP.mobile).trim()
            : null,
        email:
          insertedP.email != null && String(insertedP.email).trim() !== ''
            ? String(insertedP.email).trim()
            : null,
        profile_image: insertedP.profile_image,
        created_at: toIso(insertedP.created_at),
        updated_at: toIso(insertedP.updated_at),
      },
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        /* ignore */
      }
    }
    console.error('POST /api/admin/contacts/reassign:', error);
    return jsonError(500, 'INTERNAL_SERVER_ERROR');
  }
}
