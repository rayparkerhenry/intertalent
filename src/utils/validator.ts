/**
 * Data Validation Utilities
 * Centralized validation logic for profile data
 */

import type { ParsedProfile } from '../lib/data/csv-parser';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a complete profile
 */
export function validateProfile(
  profile: Partial<ParsedProfile>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!profile.first_name || profile.first_name.trim() === '') {
    errors.push('First name is required');
  } else if (profile.first_name.length > 100) {
    errors.push('First name is too long (max 100 characters)');
  }

  if (!profile.last_initial || profile.last_initial.trim() === '') {
    errors.push('Last initial is required');
  } else if (profile.last_initial.length !== 1) {
    errors.push('Last initial must be exactly 1 character');
  }

  if (!profile.city || profile.city.trim() === '') {
    errors.push('City is required');
  } else if (profile.city.length > 100) {
    errors.push('City name is too long (max 100 characters)');
  }

  if (!profile.state || profile.state.trim() === '') {
    errors.push('State is required');
  } else if (profile.state.length !== 2) {
    errors.push('State must be exactly 2 characters (e.g., CA, NY)');
  } else if (!/^[A-Z]{2}$/.test(profile.state)) {
    errors.push('State must be 2 uppercase letters');
  }

  if (!profile.zip_code || profile.zip_code.trim() === '') {
    errors.push('Zip code is required');
  } else if (!validateZipCode(profile.zip_code)) {
    warnings.push(
      'Zip code format may be invalid (expected: 12345 or 12345-6789)'
    );
  }

  if (
    !profile.professional_summary ||
    profile.professional_summary.trim() === ''
  ) {
    errors.push('Professional summary is required');
  } else if (profile.professional_summary.length > 10000) {
    errors.push('Professional summary is too long (max 10000 characters)');
  }

  if (!profile.office || profile.office.trim() === '') {
    errors.push('Office is required');
  }

  if (!profile.profession_type || profile.profession_type.trim() === '') {
    errors.push('Profession type is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate zip code format
 */
export function validateZipCode(zipCode: string): boolean {
  if (!zipCode) return false;

  const cleaned = zipCode.trim();

  // 5 digits OR 5 digits + dash + 4 digits
  return /^\d{5}(-\d{4})?$/.test(cleaned);
}

/**
 * Validate US state code
 */
export function validateStateCode(state: string): boolean {
  if (!state) return false;

  const validStates = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC', // District of Columbia
  ];

  return validStates.includes(state.toUpperCase());
}

/**
 * Sanitize and normalize profile data
 */
export function sanitizeProfile(profile: ParsedProfile): ParsedProfile {
  return {
    ...profile,
    first_name: profile.first_name.trim(),
    last_initial: profile.last_initial.trim().toUpperCase().charAt(0),
    city: profile.city.trim(),
    state: profile.state.trim().toUpperCase(),
    zip_code: profile.zip_code.trim(),
    professional_summary: profile.professional_summary.trim(),
    office: profile.office.trim(),
    profession_type: profile.profession_type.trim(),
  };
}

/**
 * Batch validate multiple profiles
 */
export function validateProfiles(profiles: ParsedProfile[]): {
  valid: ParsedProfile[];
  invalid: Array<{ profile: ParsedProfile; validation: ValidationResult }>;
} {
  const valid: ParsedProfile[] = [];
  const invalid: Array<{
    profile: ParsedProfile;
    validation: ValidationResult;
  }> = [];

  profiles.forEach((profile) => {
    const validation = validateProfile(profile);
    if (validation.valid) {
      valid.push(profile);
    } else {
      invalid.push({ profile, validation });
    }
  });

  return { valid, invalid };
}

/**
 * Check for duplicate profiles
 */
export function findDuplicates(profiles: ParsedProfile[]): ParsedProfile[][] {
  const groups = new Map<string, ParsedProfile[]>();

  profiles.forEach((profile) => {
    // Create unique key: firstName + lastInitial + city + state
    const key =
      `${profile.first_name}|${profile.last_initial}|${profile.city}|${profile.state}`.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(profile);
  });

  // Return only groups with more than one profile
  return Array.from(groups.values()).filter((group) => group.length > 1);
}
