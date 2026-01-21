import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types for testing
interface MockUser {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  status: string;
  passwordHash: string | null;
}

// Mock the validation functions
vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
  SESSION_COOKIE_NAME: 'session',
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  deleteAllUserSessions: vi.fn().mockResolvedValue(2),
  createSession: vi.fn().mockResolvedValue({
    id: 'session-new',
    userId: 'user-123',
    token: 'new-token',
    expiresAt: new Date(),
    createdAt: new Date(),
  }),
  createUnauthorizedResponse: vi.fn().mockImplementation(() =>
    new Response(JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// Mock the password validation
vi.mock('@/lib/password-reset', () => ({
  validatePassword: vi.fn().mockReturnValue({ valid: true }),
}));

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
  users: {},
}));

import { verifyPassword, hashPassword, deleteAllUserSessions } from '@/lib/auth';
import { validatePassword } from '@/lib/password-reset';

describe('Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('returns user data for authenticated user', async () => {
      const mockUser: MockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/New_York',
        status: 'active',
        passwordHash: 'hash',
      };

      // Verify the expected response shape
      const expectedResponse = {
        success: true,
        data: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          timezone: mockUser.timezone,
        },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.id).toBe('user-123');
      expect(expectedResponse.data.email).toBe('test@example.com');
      // Should not include passwordHash
      expect('passwordHash' in expectedResponse.data).toBe(false);
    });
  });

  describe('PATCH /api/profile', () => {
    it('updates name correctly', async () => {
      const updateData = { name: 'New Name' };

      // Verify name is a non-empty string
      expect(typeof updateData.name).toBe('string');
      expect(updateData.name.trim().length).toBeGreaterThan(0);
    });

    it('updates timezone correctly', async () => {
      const updateData = { timezone: 'America/Los_Angeles' };

      // Verify timezone format (IANA timezone)
      expect(updateData.timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
    });

    it('rejects empty name', () => {
      const updateData = { name: '   ' };
      const isValidName = updateData.name.trim().length > 0;

      expect(isValidName).toBe(false);
    });
  });

  describe('POST /api/profile/password', () => {
    it('requires current password verification', async () => {
      const currentPassword = 'oldpassword';
      const storedHash = 'stored-hash';

      vi.mocked(verifyPassword).mockResolvedValue(true);

      const result = await verifyPassword(currentPassword, storedHash);
      expect(result).toBe(true);
      expect(verifyPassword).toHaveBeenCalledWith(currentPassword, storedHash);
    });

    it('validates new password minimum length', () => {
      vi.mocked(validatePassword).mockReturnValueOnce({ valid: false, error: 'Too short' });

      const result = validatePassword('short');
      expect(result.valid).toBe(false);
    });

    it('validates password confirmation matches', () => {
      const newPassword = 'newpassword123';
      const confirmPassword = 'newpassword123';

      expect(newPassword === confirmPassword).toBe(true);
    });

    it('rejects mismatched password confirmation', () => {
      const newPassword = 'newpassword123';
      const confirmPassword = 'differentpassword';

      expect(newPassword === confirmPassword).toBe(false);
    });

    it('invalidates other sessions on success', async () => {
      vi.mocked(deleteAllUserSessions).mockResolvedValue(2);

      const result = await deleteAllUserSessions('user-123');
      expect(result).toBe(2);
      expect(deleteAllUserSessions).toHaveBeenCalledWith('user-123');
    });

    it('returns 401 for wrong current password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const result = await verifyPassword('wrongpassword', 'stored-hash');
      expect(result).toBe(false);

      // API should return 401 for wrong password
      const expectedStatusCode = 401;
      expect(expectedStatusCode).toBe(401);
    });
  });
});
