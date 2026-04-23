/**
 * Shared validation for admin user APIs.
 */

export const MAX_NAME_LEN = 255;
export const MAX_EMAIL_LEN = 255;
export const MIN_PASSWORD_LEN = 8;
export const MAX_PASSWORD_LEN = 100;

export const VALID_ROLES = ['admin', 'super_admin'] as const;
export type AdminRole = (typeof VALID_ROLES)[number];

export type UserFieldErrorCode =
  | 'MISSING_NAME'
  | 'MISSING_EMAIL'
  | 'INVALID_EMAIL'
  | 'FIELD_TOO_LONG'
  | 'INVALID_ROLE'
  | 'MISSING_PASSWORD'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'INVALID_JSON';

export type ParsedCreateAdminUser = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
};

export type ParsedUpdateAdminUser = {
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
};

function isValidBasicEmail(s: string): boolean {
  const t = s.trim();
  const at = t.indexOf('@');
  if (at <= 0) return false;
  const dot = t.indexOf('.', at + 1);
  return dot > at + 1 && dot < t.length - 1;
}

function isAdminRole(s: string): s is AdminRole {
  return (VALID_ROLES as readonly string[]).includes(s);
}

export function parseCreateAdminUser(body: unknown):
  | { ok: true; value: ParsedCreateAdminUser }
  | { ok: false; code: UserFieldErrorCode } {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'MISSING_NAME' };
  }
  const o = body as Record<string, unknown>;

  const nameRaw = typeof o.name === 'string' ? o.name.trim() : '';
  if (!nameRaw) {
    return { ok: false, code: 'MISSING_NAME' };
  }
  if (nameRaw.length > MAX_NAME_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const emailRaw = typeof o.email === 'string' ? o.email.trim() : '';
  if (!emailRaw) {
    return { ok: false, code: 'MISSING_EMAIL' };
  }
  if (emailRaw.length > MAX_EMAIL_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  if (!isValidBasicEmail(emailRaw)) {
    return { ok: false, code: 'INVALID_EMAIL' };
  }

  const passwordRaw = typeof o.password === 'string' ? o.password : '';
  if (!passwordRaw) {
    return { ok: false, code: 'MISSING_PASSWORD' };
  }
  if (passwordRaw.length < MIN_PASSWORD_LEN) {
    return { ok: false, code: 'PASSWORD_TOO_SHORT' };
  }
  if (passwordRaw.length > MAX_PASSWORD_LEN) {
    return { ok: false, code: 'PASSWORD_TOO_LONG' };
  }

  const roleRaw = typeof o.role === 'string' ? o.role.trim() : '';
  if (!roleRaw || !isAdminRole(roleRaw)) {
    return { ok: false, code: 'INVALID_ROLE' };
  }

  return {
    ok: true,
    value: {
      name: nameRaw,
      email: emailRaw.toLowerCase(),
      password: passwordRaw,
      role: roleRaw,
    },
  };
}

function parseBooleanActive(v: unknown): boolean | null {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return null;
}

export function parseUpdateAdminUser(body: unknown):
  | { ok: true; value: ParsedUpdateAdminUser }
  | { ok: false; code: UserFieldErrorCode } {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'MISSING_NAME' };
  }
  const o = body as Record<string, unknown>;

  const nameRaw = typeof o.name === 'string' ? o.name.trim() : '';
  if (!nameRaw) {
    return { ok: false, code: 'MISSING_NAME' };
  }
  if (nameRaw.length > MAX_NAME_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const emailRaw = typeof o.email === 'string' ? o.email.trim() : '';
  if (!emailRaw) {
    return { ok: false, code: 'MISSING_EMAIL' };
  }
  if (emailRaw.length > MAX_EMAIL_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  if (!isValidBasicEmail(emailRaw)) {
    return { ok: false, code: 'INVALID_EMAIL' };
  }

  const roleRaw = typeof o.role === 'string' ? o.role.trim() : '';
  if (!roleRaw || !isAdminRole(roleRaw)) {
    return { ok: false, code: 'INVALID_ROLE' };
  }

  if (!('is_active' in o)) {
    return { ok: false, code: 'INVALID_JSON' };
  }
  const activeParsed = parseBooleanActive(o.is_active);
  if (activeParsed === null) {
    return { ok: false, code: 'INVALID_JSON' };
  }

  return {
    ok: true,
    value: {
      name: nameRaw,
      email: emailRaw.toLowerCase(),
      role: roleRaw,
      is_active: activeParsed,
    },
  };
}

export function parsePasswordChange(password: unknown):
  | { ok: true; value: string }
  | { ok: false; code: UserFieldErrorCode } {
  const passwordRaw = typeof password === 'string' ? password : '';
  if (!passwordRaw) {
    return { ok: false, code: 'MISSING_PASSWORD' };
  }
  if (passwordRaw.length < MIN_PASSWORD_LEN) {
    return { ok: false, code: 'PASSWORD_TOO_SHORT' };
  }
  if (passwordRaw.length > MAX_PASSWORD_LEN) {
    return { ok: false, code: 'PASSWORD_TOO_LONG' };
  }
  return { ok: true, value: passwordRaw };
}
