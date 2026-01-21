import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module with proper async behavior
const mockSelect = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  users: {},
}));

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password-123'),
  createSession: vi.fn().mockResolvedValue({
    id: 'session-id',
    token: 'session-token-123',
    expiresAt: new Date(),
  }),
  getPostLoginRedirect: vi.fn().mockResolvedValue({
    redirectUrl: '/dashboard',
    tenantId: undefined,
  }),
}));

// Import after mocking
import { acceptInvite } from './accept';

describe('Accept Invite Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('acceptInvite', () => {
    const validParams = {
      token: 'valid-token-123',
      name: 'John Doe',
      password: 'password123',
      passwordConfirmation: 'password123',
      timezone: 'America/New_York',
    };

    it('returns validation error when fields are missing', async () => {
      const result = await acceptInvite({
        ...validParams,
        name: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns error when password is too short', async () => {
      const result = await acceptInvite({
        ...validParams,
        password: 'short',
        passwordConfirmation: 'short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PASSWORD_TOO_SHORT');
        expect(result.error).toContain('8 characters');
      }
    });

    it('returns error when passwords do not match', async () => {
      const result = await acceptInvite({
        ...validParams,
        passwordConfirmation: 'different-password',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PASSWORD_MISMATCH');
        expect(result.error).toContain('do not match');
      }
    });

    it('returns error for invalid token', async () => {
      // The mock returns empty array, so token won't be found
      const result = await acceptInvite(validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TOKEN');
      }
    });

    it('validates token is required', async () => {
      const result = await acceptInvite({
        ...validParams,
        token: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('validates timezone is required', async () => {
      const result = await acceptInvite({
        ...validParams,
        timezone: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
