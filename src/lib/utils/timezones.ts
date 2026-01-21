/**
 * Timezone utilities for profile and tenant settings
 *
 * Provides common US timezones and formatting functions
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

/**
 * Common US timezones
 */
export const US_TIMEZONES: TimezoneOption[] = [
  { value: 'America/New_York', label: 'Eastern Time', offset: 'ET' },
  { value: 'America/Chicago', label: 'Central Time', offset: 'CT' },
  { value: 'America/Denver', label: 'Mountain Time', offset: 'MT' },
  { value: 'America/Phoenix', label: 'Arizona Time', offset: 'AZ' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: 'PT' },
  { value: 'America/Anchorage', label: 'Alaska Time', offset: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: 'HST' },
];

/**
 * Common international timezones
 */
export const INTERNATIONAL_TIMEZONES: TimezoneOption[] = [
  { value: 'UTC', label: 'Coordinated Universal Time', offset: 'UTC' },
  { value: 'Europe/London', label: 'London', offset: 'GMT/BST' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'CET' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'CET' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'CST' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'SGT' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEDT' },
];

/**
 * All available timezones grouped by category
 */
export const ALL_TIMEZONES = {
  us: US_TIMEZONES,
  international: INTERNATIONAL_TIMEZONES,
};

/**
 * Flat list of all timezones for simple dropdowns
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [...US_TIMEZONES, ...INTERNATIONAL_TIMEZONES];

/**
 * Formats a timezone IANA value for display
 *
 * @param tz - IANA timezone string (e.g., "America/New_York")
 * @returns Formatted display string
 */
export function formatTimezone(tz: string): string {
  // Check if it's in our list
  const option = TIMEZONE_OPTIONS.find((o) => o.value === tz);
  if (option) {
    return `${option.label} (${option.offset})`;
  }

  // Fallback: Convert IANA format to readable
  const parts = tz.split('/');
  if (parts.length === 2) {
    return `${parts[1].replace(/_/g, ' ')} (${parts[0]})`;
  }

  return tz;
}

/**
 * Gets the current offset for a timezone
 *
 * @param tz - IANA timezone string
 * @returns Offset string like "+05:00" or "-08:00"
 */
export function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });

    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');

    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Validates if a string is a valid IANA timezone
 *
 * @param tz - String to validate
 * @returns True if valid timezone
 */
export function isValidTimezone(tz: string): boolean {
  // Check against our list first
  if (TIMEZONE_OPTIONS.some((o) => o.value === tz)) {
    return true;
  }

  // Try to create a formatter with it
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
