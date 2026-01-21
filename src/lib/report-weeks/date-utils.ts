/**
 * Date utility functions for Report Week calculations
 *
 * All date operations respect tenant timezone for consistency.
 * Week ending dates are always Fridays, with periods spanning Monday-Friday.
 */

/**
 * Checks if a given date is a Friday
 */
export function isFriday(date: Date): boolean {
  return date.getUTCDay() === 5;
}

/**
 * Validates that a date string represents a Friday
 * Accepts YYYY-MM-DD format
 */
export function isValidFridayDate(dateString: string): boolean {
  const date = new Date(dateString + 'T12:00:00Z');
  return !isNaN(date.getTime()) && isFriday(date);
}

/**
 * Calculates the period start (Monday 00:00:00) from a Friday week ending date
 * in the specified timezone
 *
 * @param weekEndingDate - The Friday date (as Date or YYYY-MM-DD string)
 * @param timezone - The tenant's timezone (e.g., 'America/New_York')
 * @returns Date object representing Monday 00:00:00 in the specified timezone
 */
export function calculatePeriodStart(
  weekEndingDate: Date | string,
  timezone: string
): Date {
  // Parse the date if it's a string
  const friday =
    typeof weekEndingDate === 'string'
      ? new Date(weekEndingDate + 'T12:00:00Z')
      : weekEndingDate;

  // Get the date components from the Friday
  const year = friday.getUTCFullYear();
  const month = friday.getUTCMonth();
  const day = friday.getUTCDate();

  // Calculate Monday (4 days before Friday)
  const mondayDate = day - 4;

  // Create a date string for Monday at midnight in the tenant timezone
  const mondayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(mondayDate).padStart(2, '0')}T00:00:00`;

  // Use Intl.DateTimeFormat to get the timezone offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Create the date in the target timezone
  // We need to calculate the UTC time that corresponds to midnight in the target timezone
  const tempDate = new Date(mondayStr + 'Z');

  // Get the offset by comparing local time representation
  const parts = formatter.formatToParts(tempDate);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value || '0';

  // Create a Date for Monday at 00:00:00 in the tenant timezone
  // by calculating the UTC offset
  const utcDate = new Date(
    Date.UTC(year, month, mondayDate, 0, 0, 0)
  );

  // Calculate timezone offset in minutes
  const tzOffset = getTimezoneOffset(timezone, utcDate);

  // Adjust by adding the offset (if timezone is behind UTC, we need to add hours)
  return new Date(utcDate.getTime() + tzOffset * 60 * 1000);
}

/**
 * Calculates the period end (Friday 23:59:59) from a Friday week ending date
 * in the specified timezone
 *
 * @param weekEndingDate - The Friday date (as Date or YYYY-MM-DD string)
 * @param timezone - The tenant's timezone (e.g., 'America/New_York')
 * @returns Date object representing Friday 23:59:59 in the specified timezone
 */
export function calculatePeriodEnd(
  weekEndingDate: Date | string,
  timezone: string
): Date {
  // Parse the date if it's a string
  const friday =
    typeof weekEndingDate === 'string'
      ? new Date(weekEndingDate + 'T12:00:00Z')
      : weekEndingDate;

  // Get the date components from the Friday
  const year = friday.getUTCFullYear();
  const month = friday.getUTCMonth();
  const day = friday.getUTCDate();

  // Create a Date for Friday at 23:59:59 in the tenant timezone
  const utcDate = new Date(
    Date.UTC(year, month, day, 23, 59, 59)
  );

  // Calculate timezone offset in minutes
  const tzOffset = getTimezoneOffset(timezone, utcDate);

  // Adjust by adding the offset
  return new Date(utcDate.getTime() + tzOffset * 60 * 1000);
}

/**
 * Gets the timezone offset in minutes for a given timezone and date
 * Positive values mean timezone is behind UTC (e.g., America/New_York = +300 in winter)
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  // Create formatters for UTC and target timezone
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const utcParts = utcFormatter.formatToParts(date);
  const tzParts = tzFormatter.formatToParts(date);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  const utcHour = getPart(utcParts, 'hour');
  const utcMinute = getPart(utcParts, 'minute');
  const utcDay = getPart(utcParts, 'day');

  const tzHour = getPart(tzParts, 'hour');
  const tzMinute = getPart(tzParts, 'minute');
  const tzDay = getPart(tzParts, 'day');

  // Calculate difference in minutes
  let diffMinutes = (utcHour - tzHour) * 60 + (utcMinute - tzMinute);

  // Handle day boundary crossings
  if (utcDay !== tzDay) {
    if (utcDay > tzDay) {
      diffMinutes += 24 * 60;
    } else {
      diffMinutes -= 24 * 60;
    }
  }

  return diffMinutes;
}

/**
 * Formats a week period for display
 *
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Formatted string like "Jan 13 - Jan 17, 2025"
 */
export function formatWeekPeriod(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getUTCDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getUTCDate();
  const year = endDate.getUTCFullYear();

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Formats a date for display in the format "Mon DD, YYYY"
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns a date string in YYYY-MM-DD format for database storage
 */
export function getWeekEndingDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the Monday date string from a Friday week ending date
 */
export function getMondayFromFriday(weekEndingDate: Date | string): string {
  const friday =
    typeof weekEndingDate === 'string'
      ? new Date(weekEndingDate + 'T12:00:00Z')
      : weekEndingDate;

  const year = friday.getUTCFullYear();
  const month = friday.getUTCMonth();
  const day = friday.getUTCDate() - 4; // Monday is 4 days before Friday

  // Handle month boundaries
  const monday = new Date(Date.UTC(year, month, day));

  return getWeekEndingDateString(monday);
}
