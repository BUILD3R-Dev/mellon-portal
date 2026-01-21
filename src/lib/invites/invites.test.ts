import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateInviteToken,
  getInviteExpiration,
  isInviteExpired,
  checkRateLimit,
  resetRateLimit,
} from './index';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  users: {},
  memberships: {},
  tenants: {},
}));

// Mock the email module
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
  generateInviteEmail: vi.fn().mockReturnValue({
    subject: 'Test Subject',
    htmlBody: '<p>Test</p>',
    textBody: 'Test',
  }),
}));

describe('Invite Module', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  describe('generateInviteToken', () => {
    it('generates a valid UUID format token', () => {
      const token = generateInviteToken();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(token).toMatch(uuidRegex);
    });

    it('generates unique tokens on each call', () => {
      const token1 = generateInviteToken();
      const token2 = generateInviteToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('getInviteExpiration', () => {
    it('returns a date 7 days in the future', () => {
      const now = new Date();
      const expiration = getInviteExpiration();
      const daysDiff = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  describe('isInviteExpired', () => {
    it('returns false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isInviteExpired(futureDate)).toBe(false);
    });

    it('returns true for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isInviteExpired(pastDate)).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('allows first invite', () => {
      const result = checkRateLimit('admin-1');
      expect(result.allowed).toBe(true);
    });

    it('allows up to 10 invites per hour', () => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('admin-2');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks after 10 invites', () => {
      // Send 10 invites
      for (let i = 0; i < 10; i++) {
        checkRateLimit('admin-3');
      }

      // 11th should be blocked
      const result = checkRateLimit('admin-3');
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeDefined();
    });

    it('tracks rate limits per admin', () => {
      // Fill up admin-4's limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit('admin-4');
      }

      // admin-5 should still be allowed
      const result = checkRateLimit('admin-5');
      expect(result.allowed).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('resets rate limit for specific admin', () => {
      // Fill up limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit('admin-6');
      }
      expect(checkRateLimit('admin-6').allowed).toBe(false);

      // Reset
      resetRateLimit('admin-6');

      // Should be allowed again
      expect(checkRateLimit('admin-6').allowed).toBe(true);
    });

    it('resets all rate limits when no admin specified', () => {
      // Fill up multiple admins
      for (let i = 0; i < 10; i++) {
        checkRateLimit('admin-7');
        checkRateLimit('admin-8');
      }

      // Reset all
      resetRateLimit();

      // Both should be allowed
      expect(checkRateLimit('admin-7').allowed).toBe(true);
      expect(checkRateLimit('admin-8').allowed).toBe(true);
    });
  });
});
