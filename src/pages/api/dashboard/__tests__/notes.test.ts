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
  ctNotes: {},
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

  const url = new URL('http://localhost/api/dashboard/notes');
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

describe('GET /api/dashboard/notes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns paginated notes with default limit', async () => {
    const mockNotes = [
      {
        id: 'note-1',
        tenantId: 'tenant-abc',
        contactId: 'contact-123',
        noteDate: new Date('2026-01-20T10:00:00Z'),
        author: 'John Doe',
        content: 'Test note content',
        createdAt: new Date('2026-01-20T10:00:00Z'),
      },
      {
        id: 'note-2',
        tenantId: 'tenant-abc',
        contactId: 'contact-456',
        noteDate: new Date('2026-01-19T10:00:00Z'),
        author: 'Jane Smith',
        content: 'Another note',
        createdAt: new Date('2026-01-19T10:00:00Z'),
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
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockNotes),
            }),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../notes');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.notes).toHaveLength(2);
    expect(data.data.notes[0].author).toBe('John Doe');
  });

  it('supports pagination with limit and offset', async () => {
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

    const mockLimit = vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue([]),
    });
    const mockOrderBy = vi.fn().mockReturnValue({
      limit: mockLimit,
    });
    const mockWhere = vi.fn().mockReturnValue({
      orderBy: mockOrderBy,
    });
    const mockFrom = vi.fn().mockReturnValue({
      where: mockWhere,
    });
    const mockSelect = vi.fn().mockReturnValue({
      from: mockFrom,
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../notes');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { limit: '10', offset: '20' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(10);
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

    const { GET } = await import('../notes');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-xyz' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORBIDDEN');
  });
});
