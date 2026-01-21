/**
 * Password Reset Tests
 *
 * Tests for password reset token functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module before importing anything else
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  users: {},
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  createSession: vi.fn().mockResolvedValue({
    id: 'session-id',
    token: 'session-token',
    userId: 'user-id',
    expiresAt: new Date(),
    createdAt: new Date(),
  }),
  getPostLoginRedirect: vi.fn().mockResolvedValue({
    redirectUrl: '/dashboard',
    tenantId: undefined,
  }),
}));

import {
  generateResetToken,
  getResetExpiration,
  isResetTokenExpired,
  validatePassword,
} from './index';

describe('Password Reset Token Generation', () => {
  it('generates a valid UUID token', () => {
    const token = generateResetToken();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('generates unique tokens on each call', () => {
    const token1 = generateResetToken();
    const token2 = generateResetToken();
    expect(token1).not.toBe(token2);
  });
});

describe('Reset Token Expiration', () => {
  it('calculates expiration 1 hour from now', () => {
    const beforeTime = new Date();
    const expiration = getResetExpiration();
    const afterTime = new Date();

    // Should be approximately 1 hour (3600000 ms) from now
    const minExpected = beforeTime.getTime() + 60 * 60 * 1000;
    const maxExpected = afterTime.getTime() + 60 * 60 * 1000 + 1000; // 1 second buffer

    expect(expiration.getTime()).toBeGreaterThanOrEqual(minExpected);
    expect(expiration.getTime()).toBeLessThanOrEqual(maxExpected);
  });

  it('correctly identifies expired tokens', () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    expect(isResetTokenExpired(pastDate)).toBe(true);
  });

  it('correctly identifies valid tokens', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    expect(isResetTokenExpired(futureDate)).toBe(false);
  });
});

describe('Password Validation', () => {
  it('accepts passwords with 8 or more characters', () => {
    const result = validatePassword('password');
    expect(result.valid).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('short');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('accepts long passwords', () => {
    const result = validatePassword('thisisaverylongpasswordthatshouldbefine');
    expect(result.valid).toBe(true);
  });
});
