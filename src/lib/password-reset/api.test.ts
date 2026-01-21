/**
 * Password Reset API Tests
 *
 * Tests for password reset API endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestPasswordReset,
  resetPassword,
  validateResetToken,
  validatePassword,
} from './index';

// Mock the database and email modules
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
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

describe('Password Validation', () => {
  it('validates password minimum 8 characters', () => {
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('12345678').valid).toBe(true);
    expect(validatePassword('longenoughpassword').valid).toBe(true);
  });

  it('returns appropriate error message for short passwords', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });
});

describe('Request Password Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success for valid email format', async () => {
    const { db } = await import('@/lib/db');

    // Mock no user found
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const result = await requestPasswordReset('test@example.com');
    expect(result.success).toBe(true);
  });

  it('returns validation error for invalid email format', async () => {
    const result = await requestPasswordReset('invalid-email');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns success even when user does not exist (prevents enumeration)', async () => {
    const { db } = await import('@/lib/db');

    // Mock no user found
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const result = await requestPasswordReset('nonexistent@example.com');
    expect(result.success).toBe(true);
  });
});

describe('Validate Reset Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invalid for non-existent token', async () => {
    const { db } = await import('@/lib/db');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const result = await validateResetToken('invalid-token');
    expect(result.valid).toBe(false);
  });

  it('returns expired for expired token', async () => {
    const { db } = await import('@/lib/db');

    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'user-id',
              email: 'test@example.com',
              status: 'active',
              resetToken: 'valid-token',
              resetExpiresAt: pastDate,
            },
          ]),
        }),
      }),
    } as any);

    const result = await validateResetToken('valid-token');
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
  });

  it('returns valid for valid non-expired token', async () => {
    const { db } = await import('@/lib/db');

    const futureDate = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes from now

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'user-id',
              email: 'test@example.com',
              status: 'active',
              resetToken: 'valid-token',
              resetExpiresAt: futureDate,
            },
          ]),
        }),
      }),
    } as any);

    const result = await validateResetToken('valid-token');
    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe('user-id');
    expect(result.user?.email).toBe('test@example.com');
  });
});

describe('Reset Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error for missing fields', async () => {
    const result = await resetPassword('', 'password', 'password');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns error for password too short', async () => {
    const result = await resetPassword('token', 'short', 'short');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PASSWORD_TOO_SHORT');
    }
  });

  it('returns error for password mismatch', async () => {
    const result = await resetPassword('token', 'password123', 'password456');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PASSWORD_MISMATCH');
    }
  });
});
