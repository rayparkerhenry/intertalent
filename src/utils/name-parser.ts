/**
 * Name Parsing Utilities
 * Handles various name formats and edge cases
 */

export interface ParsedName {
  firstName: string;
  lastInitial: string;
}

/**
 * Parse full name into first name and last initial
 * Handles various edge cases and formats
 */
export function parseFullName(fullName: string): ParsedName {
  if (!fullName || fullName.trim() === '') {
    throw new Error('Name cannot be empty');
  }

  const cleaned = fullName.trim();
  const parts = cleaned.split(/\s+/); // Split by whitespace

  if (parts.length === 0) {
    throw new Error('Invalid name format');
  }

  // Single name (e.g., "John")
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastInitial: parts[0].charAt(0).toUpperCase(),
    };
  }

  // Two or more parts (e.g., "John Smith" or "Mary Jane Watson")
  // Use first part as first name, last part for initial
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const lastInitial = lastName.charAt(0).toUpperCase();

  return {
    firstName,
    lastInitial,
  };
}

/**
 * Parse when first name and last initial are already separated
 */
export function parseNameParts(
  firstName: string,
  lastInitial: string
): ParsedName {
  const cleanedFirst = firstName.trim();
  const cleanedLast = lastInitial.trim().toUpperCase();

  if (!cleanedFirst) {
    throw new Error('First name cannot be empty');
  }

  if (!cleanedLast) {
    throw new Error('Last initial cannot be empty');
  }

  return {
    firstName: cleanedFirst,
    lastInitial: cleanedLast.charAt(0), // Take first character only
  };
}

/**
 * Format name for display
 */
export function formatName(firstName: string, lastInitial: string): string {
  return `${firstName} ${lastInitial}.`;
}

/**
 * Normalize name (trim, proper case first letter)
 */
export function normalizeName(name: string): string {
  if (!name) return '';

  const cleaned = name.trim();
  if (cleaned.length === 0) return '';

  // Capitalize first letter, keep rest as-is (to preserve names like "José")
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Check if name contains special characters (accents, etc.)
 */
export function hasSpecialCharacters(name: string): boolean {
  // Check for characters beyond basic ASCII
  return /[^\x00-\x7F]/.test(name);
}

/**
 * Validate name format
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name cannot be empty' };
  }

  const cleaned = name.trim();

  if (cleaned.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (cleaned.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' };
  }

  // Check for only letters, spaces, hyphens, apostrophes, and accented characters
  if (!/^[a-zA-Z\s\-'À-ÿ]+$/.test(cleaned)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true };
}
