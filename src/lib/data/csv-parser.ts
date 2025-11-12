/**
 * CSV Parser for InterTalent Profile Data
 * Parses CSV files from EIS system and transforms to database format
 */

import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

/**
 * CSV Row structure from InterTalent export
 */
export interface ProfileCSVRow {
  'First Name': string;
  'Last Initial': string;
  City: string;
  State: string;
  'Zip Code': string;
  'Professional Summary': string;
  Office: string;
  'Profession Type': string;
}

/**
 * Transformed profile data ready for database
 */
export interface ParsedProfile {
  first_name: string;
  last_initial: string;
  city: string;
  state: string;
  zip_code: string;
  professional_summary: string;
  office: string;
  profession_type: string;
  source_file: string;
  is_active: boolean;
}

/**
 * Parse CSV file and return array of profiles
 */
export function parseCSVFile(filePath: string): ParsedProfile[] {
  console.log(`📄 Reading CSV file: ${filePath}`);

  // Read file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Parse CSV
  const records = parse(fileContent, {
    columns: true, // Use first row as column names
    skip_empty_lines: true,
    trim: true,
  }) as ProfileCSVRow[];

  console.log(`✅ Parsed ${records.length} rows from CSV`);

  // Transform to database format
  const profiles: ParsedProfile[] = records.map((row, index) => {
    try {
      return transformRow(row, fileName);
    } catch (error) {
      console.error(`❌ Error parsing row ${index + 1}:`, error);
      throw error;
    }
  });

  return profiles;
}

/**
 * Transform CSV row to database format
 */
function transformRow(row: ProfileCSVRow, sourceFile: string): ParsedProfile {
  // Validate required fields
  if (!row['First Name'] || !row['Last Initial']) {
    throw new Error('Missing required name fields');
  }
  if (!row.City || !row.State) {
    throw new Error('Missing required location fields');
  }
  if (!row['Professional Summary']) {
    throw new Error('Missing professional summary');
  }

  return {
    first_name: sanitizeString(row['First Name']),
    last_initial: sanitizeLastInitial(row['Last Initial']),
    city: sanitizeString(row.City),
    state: sanitizeState(row.State),
    zip_code: sanitizeZipCode(row['Zip Code']),
    professional_summary: row['Professional Summary'].trim(), // Keep HTML
    office: sanitizeString(row.Office),
    profession_type: sanitizeString(row['Profession Type']),
    source_file: sourceFile,
    is_active: true,
  };
}

/**
 * Sanitize string fields - trim and normalize
 */
function sanitizeString(value: string): string {
  if (!value) return '';
  return value.trim();
}

/**
 * Sanitize last initial - ensure single character, uppercase
 */
function sanitizeLastInitial(value: string): string {
  if (!value) return '';
  const cleaned = value.trim().toUpperCase();
  return cleaned.charAt(0); // Take first character only
}

/**
 * Sanitize state - ensure 2-char uppercase
 */
function sanitizeState(value: string): string {
  if (!value) return '';
  const cleaned = value.trim().toUpperCase();
  if (cleaned.length !== 2) {
    console.warn(`⚠️  Invalid state format: "${value}" - using as-is`);
  }
  return cleaned;
}

/**
 * Sanitize zip code - accept 5 or 5+4 format
 */
function sanitizeZipCode(value: string): string {
  if (!value) return '';
  const cleaned = value.trim();

  // Remove any non-numeric/dash characters
  const zipOnly = cleaned.replace(/[^0-9-]/g, '');

  return zipOnly;
}

/**
 * Parse CSV from string content (for testing or API uploads)
 */
export function parseCSVString(
  csvContent: string,
  fileName: string = 'unknown.csv'
): ParsedProfile[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ProfileCSVRow[];

  return records.map((row) => transformRow(row, fileName));
}

/**
 * Validate parsed profile data
 */
export function validateProfile(profile: ParsedProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.first_name) errors.push('Missing first name');
  if (!profile.last_initial) errors.push('Missing last initial');
  if (!profile.city) errors.push('Missing city');
  if (!profile.state) errors.push('Missing state');
  if (profile.state.length !== 2) errors.push('State must be 2 characters');
  if (!profile.zip_code) errors.push('Missing zip code');
  if (!profile.professional_summary)
    errors.push('Missing professional summary');
  if (!profile.office) errors.push('Missing office');
  if (!profile.profession_type) errors.push('Missing profession type');

  return {
    valid: errors.length === 0,
    errors,
  };
}
