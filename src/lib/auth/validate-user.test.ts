import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module before importing validate-user
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
  users: {},
}));

import { validateUserStatus, hashPassword } from './validate-user';
import type { UserForAuth } from './validate-user';

// Mock user factory
function createMockUser(overrides: Partial<UserForAuth> = {}): UserForAuth {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    status: 'active',
    passwordHash: 'hashed-password',
    ...overrides,
  };
}

describe('User Validation', () => {
  describe('validateUserStatus', () => {
    it('allows active users to authenticate', () => {
      const user = createMockUser({ status: 'active' });
      const result = validateUserStatus(user);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
      }
    });

    it('returns pending activation error for pending users', () => {
      const user = createMockUser({ status: 'pending' });
      const result = validateUserStatus(user);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Account is pending activation');
        expect(result.code).toBe('PENDING_USER');
      }
    });

    it('returns deactivated error for inactive users', () => {
      const user = createMockUser({ status: 'inactive' });
      const result = validateUserStatus(user);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Account has been deactivated');
        expect(result.code).toBe('INACTIVE_USER');
      }
    });
  });

  describe('hashPassword', () => {
    it('returns a consistent hash for the same password', async () => {
      const password = 'test-password-123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password-a');
      const hash2 = await hashPassword('password-b');

      expect(hash1).not.toBe(hash2);
    });

    it('returns a 64-character hex string', async () => {
      const hash = await hashPassword('test-password');

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });
});
