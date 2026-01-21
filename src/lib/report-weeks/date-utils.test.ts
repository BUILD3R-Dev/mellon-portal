import { describe, it, expect } from 'vitest';
import {
  calculatePeriodStart,
  calculatePeriodEnd,
  isFriday,
  formatWeekPeriod,
  getWeekEndingDateString,
} from './date-utils';

describe('Report Week Date Utils', () => {
  describe('isFriday', () => {
    it('returns true for a Friday date', () => {
      // January 24, 2025 is a Friday
      const friday = new Date('2025-01-24T12:00:00Z');
      expect(isFriday(friday)).toBe(true);
    });

    it('returns false for non-Friday dates', () => {
      // January 23, 2025 is a Thursday
      const thursday = new Date('2025-01-23T12:00:00Z');
      expect(isFriday(thursday)).toBe(false);

      // January 25, 2025 is a Saturday
      const saturday = new Date('2025-01-25T12:00:00Z');
      expect(isFriday(saturday)).toBe(false);
    });
  });

  describe('calculatePeriodStart', () => {
    it('calculates Monday 00:00:00 from Friday in Eastern timezone', () => {
      // Friday January 24, 2025
      const weekEndingDate = new Date('2025-01-24');
      const periodStart = calculatePeriodStart(weekEndingDate, 'America/New_York');

      // Should be Monday January 20, 2025 at 00:00:00 EST
      expect(periodStart.getUTCFullYear()).toBe(2025);
      expect(periodStart.getUTCMonth()).toBe(0); // January
      expect(periodStart.getUTCDate()).toBe(20); // Monday
      // 5:00 UTC = 00:00 EST (UTC-5)
      expect(periodStart.getUTCHours()).toBe(5);
      expect(periodStart.getUTCMinutes()).toBe(0);
      expect(periodStart.getUTCSeconds()).toBe(0);
    });

    it('calculates Monday 00:00:00 from Friday in Pacific timezone', () => {
      // Friday January 24, 2025
      const weekEndingDate = new Date('2025-01-24');
      const periodStart = calculatePeriodStart(weekEndingDate, 'America/Los_Angeles');

      // Should be Monday January 20, 2025 at 00:00:00 PST
      expect(periodStart.getUTCFullYear()).toBe(2025);
      expect(periodStart.getUTCMonth()).toBe(0);
      expect(periodStart.getUTCDate()).toBe(20);
      // 8:00 UTC = 00:00 PST (UTC-8)
      expect(periodStart.getUTCHours()).toBe(8);
    });
  });

  describe('calculatePeriodEnd', () => {
    it('calculates Friday 23:59:59 in Eastern timezone', () => {
      // Friday January 24, 2025
      const weekEndingDate = new Date('2025-01-24');
      const periodEnd = calculatePeriodEnd(weekEndingDate, 'America/New_York');

      // Should be Friday January 24, 2025 at 23:59:59 EST
      expect(periodEnd.getUTCFullYear()).toBe(2025);
      expect(periodEnd.getUTCMonth()).toBe(0);
      expect(periodEnd.getUTCDate()).toBe(25); // Next day UTC due to timezone
      // 4:59:59 UTC = 23:59:59 EST
      expect(periodEnd.getUTCHours()).toBe(4);
      expect(periodEnd.getUTCMinutes()).toBe(59);
      expect(periodEnd.getUTCSeconds()).toBe(59);
    });
  });

  describe('formatWeekPeriod', () => {
    it('formats week period in same month', () => {
      const start = new Date('2025-01-20T05:00:00Z'); // Monday
      const end = new Date('2025-01-24T04:59:59Z'); // Friday (end of day EST)

      const result = formatWeekPeriod(start, end);
      expect(result).toBe('Jan 20 - Jan 24, 2025');
    });

    it('formats week period across months', () => {
      const start = new Date('2025-01-27T05:00:00Z'); // Monday
      const end = new Date('2025-01-31T04:59:59Z'); // Friday

      const result = formatWeekPeriod(start, end);
      expect(result).toBe('Jan 27 - Jan 31, 2025');
    });
  });

  describe('getWeekEndingDateString', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const friday = new Date('2025-01-24T12:00:00Z');
      const result = getWeekEndingDateString(friday);
      expect(result).toBe('2025-01-24');
    });
  });
});
