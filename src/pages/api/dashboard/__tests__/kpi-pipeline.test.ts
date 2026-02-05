import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the handlers
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
  pipelineStageCounts: { tenantId: 'tenantId', reportWeekId: 'reportWeekId', stage: 'stage' },
  leadMetrics: { tenantId: 'tenantId', reportWeekId: 'reportWeekId', dimensionType: 'dimensionType', leads: 'leads', createdAt: 'createdAt' },
  reportWeeks: { id: 'id', weekEndingDate: 'weekEndingDate' },
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { db } from '@/lib/db';

// Reusable mock session for authenticated requests
const mockSession = {
  id: 'session-1',
  userId: 'user-123',
  token: 'valid-token',
  expiresAt: new Date(),
  createdAt: new Date(),
  user: { id: 'user-123', email: 'test@example.com', name: 'Test User', status: 'active' as const },
};

const mockMemberships = [
  {
    id: 'mem-1',
    userId: 'user-123',
    tenantId: 'tenant-abc',
    role: 'tenant_admin' as const,
    tenant: { id: 'tenant-abc', name: 'Test Tenant' },
  },
];

/** Helper to create a mock Astro API context */
function createMockContext(options: {
  sessionToken?: string;
  tenantId?: string;
  searchParams?: Record<string, string>;
  path?: string;
}) {
  const cookies = new Map<string, { value: string }>();
  if (options.sessionToken) {
    cookies.set('mellon_session', { value: options.sessionToken });
  }
  if (options.tenantId) {
    cookies.set('mellon_tenant', { value: options.tenantId });
  }

  const url = new URL(`http://localhost/api/dashboard/${options.path || 'kpi'}`);
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

/** Sets up mocks for an authenticated, authorized request */
function setupAuthenticatedMocks() {
  vi.mocked(validateSession).mockResolvedValue(mockSession);
  vi.mocked(getUserMemberships).mockResolvedValue(mockMemberships);
}

describe('GET /api/dashboard/kpi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when no session cookie is present', async () => {
    const { GET } = await import('../kpi');
    const context = createMockContext({});
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.code).toBe('UNAUTHORIZED');
    expect(data.error).toBe('Authentication required');
  });

  it('returns all four KPI values with correct shape', async () => {
    setupAuthenticatedMocks();

    // First db.select() call: newLeads query (sum from leadMetrics)
    // Second db.select() call: livePipelineRows query (from pipelineStageCounts)
    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // New Leads aggregation query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 12 }]),
          }),
        };
      }
      // Pipeline stage counts live rows
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'New Lead', count: 50, dollarValue: '100000.00' },
            { stage: 'Outbound Call', count: 30, dollarValue: '60000.00' },
            { stage: 'QR Returned', count: 10, dollarValue: '50000.00' },
            { stage: 'FDD Sent', count: 5, dollarValue: '90000.00' },
            { stage: 'FA Sent', count: 2, dollarValue: '40000.00' },
          ]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../kpi');
    const context = createMockContext({ sessionToken: 'valid-token', tenantId: 'tenant-abc' });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('newLeads');
    expect(data.data).toHaveProperty('totalPipeline');
    expect(data.data).toHaveProperty('priorityCandidates');
    expect(data.data).toHaveProperty('weightedPipelineValue');

    // Verify calculated values
    expect(data.data.newLeads).toBe(12);
    // Total pipeline: 50 + 30 + 10 + 5 + 2 = 97
    expect(data.data.totalPipeline).toBe(97);
    // Priority candidates (QR Returned + FDD Sent + FA Sent): 10 + 5 + 2 = 17
    expect(data.data.priorityCandidates).toBe(17);
    // Weighted pipeline value (all stages are in full pipeline): 100000 + 60000 + 50000 + 90000 + 40000 = 340000
    expect(data.data.weightedPipelineValue).toBe('340000.00');
  });

  it('respects timeWindow=rolling-7 query parameter for newLeads calculation', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 8 }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../kpi');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { timeWindow: 'rolling-7' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // The rolling-7 time window was passed, and the mock returns 8
    expect(data.data.newLeads).toBe(8);
    // Verify the select was called (first call is for newLeads)
    expect(db.select).toHaveBeenCalled();
  });
});

describe('GET /api/dashboard/pipeline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns per-stage { stage, count } array for HorizontalBarChart', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // pipelineByStage query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { stage: 'New Lead', count: 50, dollarValue: '100000.00' },
              { stage: 'QR Returned', count: 10, dollarValue: '50000.00' },
              { stage: 'FDD Sent', count: 5, dollarValue: '90000.00' },
            ]),
          }),
        };
      }
      // leadTrends query with join
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../pipeline');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'pipeline',
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.pipelineByStage)).toBe(true);
    expect(data.data.pipelineByStage).toHaveLength(3);
    expect(data.data.pipelineByStage[0]).toEqual({ stage: 'New Lead', count: 50 });
    expect(data.data.pipelineByStage[1]).toEqual({ stage: 'QR Returned', count: 10 });
    expect(data.data.pipelineByStage[2]).toEqual({ stage: 'FDD Sent', count: 5 });
  });

  it('returns weekly trend data as { source: weekLabel, leads: count } array for LeadsChart', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // pipelineByStage query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      // leadTrends query with join
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { weekEndingDate: '2026-02-02', leads: 15 },
                  { weekEndingDate: '2026-01-26', leads: 22 },
                  { weekEndingDate: '2026-01-19', leads: 18 },
                  { weekEndingDate: '2026-01-12', leads: 10 },
                ]),
              }),
            }),
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../pipeline');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'pipeline',
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.leadTrends)).toBe(true);
    expect(data.data.leadTrends).toHaveLength(4);

    // leadTrends should be sorted chronologically (ascending)
    expect(data.data.leadTrends[0]).toEqual({ source: '2026-01-12', leads: 10 });
    expect(data.data.leadTrends[1]).toEqual({ source: '2026-01-19', leads: 18 });
    expect(data.data.leadTrends[2]).toEqual({ source: '2026-01-26', leads: 22 });
    expect(data.data.leadTrends[3]).toEqual({ source: '2026-02-02', leads: 15 });
  });

  it('respects weeks query parameter to control number of historical weeks', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    let capturedLimit: number | undefined;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation((limitVal: number) => {
                  capturedLimit = limitVal;
                  return Promise.resolve([
                    { weekEndingDate: '2026-02-02', leads: 15 },
                    { weekEndingDate: '2026-01-26', leads: 22 },
                  ]);
                }),
              }),
            }),
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../pipeline');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'pipeline',
      searchParams: { weeks: '2' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Verify the limit was called with the requested number of weeks
    expect(capturedLimit).toBe(2);
    expect(data.data.leadTrends).toHaveLength(2);
  });
});
