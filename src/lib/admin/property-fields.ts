/**
 * Shared validation and normalization for admin property APIs.
 */

export const MAX_NAME_LEN = 255;
export const MAX_ADDRESS_LEN = 255;
export const MAX_CITY_LEN = 100;

export type ParsedPropertyFields = {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type PropertyFieldErrorCode =
  | 'MISSING_NAME'
  | 'INVALID_STATE'
  | 'INVALID_ZIP'
  | 'FIELD_TOO_LONG';

function emptyToNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export function normalizePropertyNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function parsePropertyFields(input: {
  name: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
}):
  | { ok: true; value: ParsedPropertyFields }
  | { ok: false; code: PropertyFieldErrorCode } {
  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  if (!nameRaw) {
    return { ok: false, code: 'MISSING_NAME' };
  }
  if (nameRaw.length > MAX_NAME_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const address = emptyToNull(
    typeof input.address === 'string' ? input.address : null
  );
  if (address && address.length > MAX_ADDRESS_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const city = emptyToNull(
    typeof input.city === 'string' ? input.city : null
  );
  if (city && city.length > MAX_CITY_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  let state: string | null = emptyToNull(
    typeof input.state === 'string' ? input.state : null
  );
  if (state) {
    const u = state.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(u)) {
      return { ok: false, code: 'INVALID_STATE' };
    }
    state = u;
  }

  let zip: string | null = emptyToNull(
    typeof input.zip === 'string' ? input.zip : null
  );
  if (zip) {
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) {
      return { ok: false, code: 'INVALID_ZIP' };
    }
    zip = z;
  }

  return {
    ok: true,
    value: {
      name: nameRaw,
      address,
      city,
      state,
      zip,
    },
  };
}
