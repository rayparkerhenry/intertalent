/**
 * Shared validation and normalization for admin property-contact APIs.
 */

export const MAX_NAME_LEN = 255;
export const MAX_TITLE_LEN = 100;
export const MAX_MOBILE_LEN = 20;
export const MAX_EMAIL_LEN = 255;

export type ParsedPropertyContactFields = {
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
};

export type PropertyContactFieldErrorCode =
  | 'MISSING_NAME'
  | 'INVALID_EMAIL'
  | 'FIELD_TOO_LONG';

function isValidBasicEmail(s: string): boolean {
  const t = s.trim();
  const at = t.indexOf('@');
  if (at <= 0) return false;
  const dot = t.indexOf('.', at + 1);
  return dot > at + 1 && dot < t.length - 1;
}

export function parsePropertyContactFields(input: {
  name: unknown;
  title?: unknown;
  mobile?: unknown;
  email?: unknown;
}):
  | { ok: true; value: ParsedPropertyContactFields }
  | { ok: false; code: PropertyContactFieldErrorCode } {
  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  if (!nameRaw) {
    return { ok: false, code: 'MISSING_NAME' };
  }
  if (nameRaw.length > MAX_NAME_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const titleSource = input.title;
  let title: string | null;
  if (titleSource === undefined || titleSource === null) {
    title = null;
  } else if (typeof titleSource === 'string') {
    const t = titleSource.trim();
    if (t.length > MAX_TITLE_LEN) {
      return { ok: false, code: 'FIELD_TOO_LONG' };
    }
    title = t === '' ? null : t;
  } else {
    title = null;
  }

  const mobileRaw =
    typeof input.mobile === 'string' ? input.mobile.trim() : '';
  if (mobileRaw.length > MAX_MOBILE_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  const mobile = mobileRaw === '' ? null : mobileRaw;

  const emailRaw =
    typeof input.email === 'string' ? input.email.trim() : '';
  if (emailRaw.length > MAX_EMAIL_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  if (emailRaw !== '' && !isValidBasicEmail(emailRaw)) {
    return { ok: false, code: 'INVALID_EMAIL' };
  }
  const email = emailRaw === '' ? null : emailRaw;

  return {
    ok: true,
    value: {
      name: nameRaw,
      title,
      mobile,
      email,
    },
  };
}
