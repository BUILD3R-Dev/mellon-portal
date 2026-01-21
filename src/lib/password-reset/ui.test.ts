/**
 * Password Reset UI Tests
 *
 * Tests for password reset UI page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateResetToken, generateResetEmail } from './index';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  users: {},
}));

describe('Reset Token Validation for UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid for active token on page load', async () => {
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
    expect(result.user?.email).toBe('test@example.com');
  });

  it('returns expired status for expired token', async () => {
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
              resetToken: 'expired-token',
              resetExpiresAt: pastDate,
            },
          ]),
        }),
      }),
    } as any);

    const result = await validateResetToken('expired-token');
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(true);
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
    expect(result.expired).toBeFalsy();
  });
});

describe('Reset Email Template', () => {
  it('generates email with correct subject', () => {
    const email = generateResetEmail({
      resetLink: 'https://example.com/reset-password?token=abc',
      recipientEmail: 'test@example.com',
    });

    expect(email.subject).toBe('Reset your Mellon Portal password');
  });

  it('includes reset link in HTML body', () => {
    const resetLink = 'https://example.com/reset-password?token=abc123';
    const email = generateResetEmail({
      resetLink,
      recipientEmail: 'test@example.com',
    });

    expect(email.htmlBody).toContain(resetLink);
  });

  it('includes reset link in plain text body', () => {
    const resetLink = 'https://example.com/reset-password?token=abc123';
    const email = generateResetEmail({
      resetLink,
      recipientEmail: 'test@example.com',
    });

    expect(email.textBody).toContain(resetLink);
  });

  it('includes 1 hour expiration notice', () => {
    const email = generateResetEmail({
      resetLink: 'https://example.com/reset-password?token=abc',
      recipientEmail: 'test@example.com',
    });

    expect(email.htmlBody).toContain('1 hour');
    expect(email.textBody).toContain('1 hour');
  });

  it('includes ignore message for unrequested resets', () => {
    const email = generateResetEmail({
      resetLink: 'https://example.com/reset-password?token=abc',
      recipientEmail: 'test@example.com',
    });

    expect(email.htmlBody).toContain('did not request');
    expect(email.textBody).toContain('did not request');
  });

  it('includes recipient email in footer', () => {
    const recipientEmail = 'user@test.com';
    const email = generateResetEmail({
      resetLink: 'https://example.com/reset-password?token=abc',
      recipientEmail,
    });

    expect(email.htmlBody).toContain(recipientEmail);
    expect(email.textBody).toContain(recipientEmail);
  });
});
