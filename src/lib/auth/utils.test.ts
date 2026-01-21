import { describe, it, expect } from 'vitest';
import {
  generateSessionToken,
  hashSessionToken,
  getSessionExpiration,
  isSessionExpired,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from './utils';

describe('Auth Utils', () => {
  describe('generateSessionToken', () => {
    it('generates a 64-character hex string', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashSessionToken', () => {
    it('returns a consistent hash for the same input', () => {
      const token = 'test-token-123';
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', () => {
      const hash1 = hashSessionToken('token-a');
      const hash2 = hashSessionToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getSessionExpiration', () => {
    it('returns a date 30 days in the future by default', () => {
      const now = new Date();
      const expiration = getSessionExpiration();
      const daysDiff = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });

    it('accepts custom days parameter', () => {
      const now = new Date();
      const expiration = getSessionExpiration(7);
      const daysDiff = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  describe('isSessionExpired', () => {
    it('returns false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isSessionExpired(futureDate)).toBe(false);
    });

    it('returns true for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isSessionExpired(pastDate)).toBe(true);
    });
  });

  describe('Session cookie configuration', () => {
    it('uses correct cookie name', () => {
      expect(SESSION_COOKIE_NAME).toBe('mellon_session');
    });

    it('has httpOnly flag set', () => {
      expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('has sameSite set to lax', () => {
      expect(SESSION_COOKIE_OPTIONS.sameSite).toBe('lax');
    });

    it('has 30 day maxAge', () => {
      expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(60 * 60 * 24 * 30);
    });
  });
});
