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
    select: vi.fn(),
  },
  ctScheduledActivities: {},
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to create a mock Astro API context
function createMockContext(options: {
  sessionToken?: string;
  tenantId?: string;
  searchParams?: Record<string, string>;
}) {
  const cookies = new Map<string, { value: string }>();
  if (options.sessionToken) {
    cookies.set('mellon_session', { value: options.sessionToken });
  }
  if (options.tenantId) {
    cookies.set('mellon_tenant', { value: options.tenantId });
  }

  const url = new URL('http://localhost/api/dashboard/schedule');
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return {
    cookies: {
      get: (name: string) => cookies.get(name),
    },
    url,
  };
}

describe('GET /api/dashboard/schedule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns upcoming activities only (future scheduled_at)', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const mockActivities = [
      {
        id: 'activity-1',
        tenantId: 'tenant-abc',
        activityType: 'call',
        scheduledAt: futureDate,
        contactName: 'Jane Smith',
        description: 'Follow-up call',
        status: 'scheduled',
        createdAt: new Date(),
      },
    ];

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
            limit: vi.fn().mockResolvedValue(mockActivities),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../schedule');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.activities).toHaveLength(1);
    expect(data.data.activities[0].activityType).toBe('call');
    expect(data.data.activities[0].contactName).toBe('Jane Smith');
  });

  it('orders activities by scheduledAt ascending', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const mockActivities = [
      {
        id: 'activity-1',
        tenantId: 'tenant-abc',
        activityType: 'call',
        scheduledAt: tomorrow,
        contactName: 'Jane Smith',
        description: 'Follow-up call',
        status: 'scheduled',
        createdAt: new Date(),
      },
      {
        id: 'activity-2',
        tenantId: 'tenant-abc',
        activityType: 'meeting',
        scheduledAt: nextWeek,
        contactName: 'John Doe',
        description: 'Quarterly review',
        status: 'scheduled',
        createdAt: new Date(),
      },
    ];

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
            limit: vi.fn().mockResolvedValue(mockActivities),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../schedule');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.activities).toHaveLength(2);
    // First activity should be tomorrow (earlier)
    expect(data.data.activities[0].contactName).toBe('Jane Smith');
    expect(data.data.activities[1].contactName).toBe('John Doe');
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

    const { GET } = await import('../schedule');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-xyz' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORBIDDEN');
  });
});
