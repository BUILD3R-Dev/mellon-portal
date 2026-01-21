import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the handler
vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
  getUserMemberships: vi.fn(),
  SESSION_COOKIE_NAME: 'mellon_session',
  TENANT_COOKIE_NAME: 'mellon_tenant',
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
  syncRuns: {},
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to create a mock Astro API context
function createMockContext(options: {
  sessionToken?: string;
  tenantId?: string;
}) {
  const cookies = new Map<string, { value: string }>();
  if (options.sessionToken) {
    cookies.set('mellon_session', { value: options.sessionToken });
  }
  if (options.tenantId) {
    cookies.set('mellon_tenant', { value: options.tenantId });
  }

  return {
    cookies: {
      get: (name: string) => cookies.get(name),
    },
  };
}

describe('GET /api/sync/status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns lastSyncAt and status for successful sync', async () => {
    // Use a recent time (30 minutes ago) to ensure isStale is false
    const recentTime = new Date(Date.now() - 30 * 60 * 1000);
    const mockSyncRun = {
      id: 'sync-123',
      tenantId: 'tenant-abc',
      startedAt: new Date(recentTime.getTime() - 5 * 60 * 1000),
      finishedAt: recentTime,
      status: 'success',
      errorMessage: null,
      recordsUpdated: 50,
    };

    vi.mocked(validateSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      token: 'test-token',
      expiresAt: new Date(),
      createdAt: new Date(),
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User', status: 'active' },
    });

    vi.mocked(getUserMemberships).mockResolvedValue([
      { id: 'mem-1', userId: 'user-123', tenantId: 'tenant-abc', role: 'tenant_admin', tenant: { id: 'tenant-abc', name: 'Test Tenant' } },
    ]);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSyncRun]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    // Import the handler dynamically to get the mocked version
    const { GET } = await import('../status');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.lastSyncAt).toBe(recentTime.toISOString());
    expect(data.data.status).toBe('success');
    expect(data.data.isStale).toBe(false);
  });

  it('requires authentication (returns 401 without session)', async () => {
    const { GET } = await import('../status');
    const context = createMockContext({});
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('calculates isStale as true when data is older than 2 hours', async () => {
    // Sync from 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const mockSyncRun = {
      id: 'sync-123',
      tenantId: 'tenant-abc',
      startedAt: new Date(threeHoursAgo.getTime() - 5 * 60 * 1000),
      finishedAt: threeHoursAgo,
      status: 'success',
      errorMessage: null,
      recordsUpdated: 50,
    };

    vi.mocked(validateSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      token: 'test-token',
      expiresAt: new Date(),
      createdAt: new Date(),
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User', status: 'active' },
    });

    vi.mocked(getUserMemberships).mockResolvedValue([
      { id: 'mem-1', userId: 'user-123', tenantId: 'tenant-abc', role: 'tenant_admin', tenant: { id: 'tenant-abc', name: 'Test Tenant' } },
    ]);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSyncRun]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../status');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.isStale).toBe(true);
  });

  it('enforces tenant isolation', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      token: 'test-token',
      expiresAt: new Date(),
      createdAt: new Date(),
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User', status: 'active' },
    });

    // User only has access to tenant-abc, but trying to access tenant-xyz
    vi.mocked(getUserMemberships).mockResolvedValue([
      { id: 'mem-1', userId: 'user-123', tenantId: 'tenant-abc', role: 'tenant_admin', tenant: { id: 'tenant-abc', name: 'Test Tenant' } },
    ]);

    const { GET } = await import('../status');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-xyz' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORBIDDEN');
  });
});
