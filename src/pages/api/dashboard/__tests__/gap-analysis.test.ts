/**
 * Gap analysis tests for dashboard data wiring feature.
 *
 * Covers critical workflows identified during Task Group 6 review:
 * - KPI newLeads calculation correctness
 * - Weighted pipeline value summing across correct stages
 * - Pipeline endpoint weeks parameter controlling leadTrends count
 * - Priority candidates stage list matching spec
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  pipelineStageCounts: {
    tenantId: 'tenantId',
    reportWeekId: 'reportWeekId',
    stage: 'stage',
  },
  leadMetrics: {
    tenantId: 'tenantId',
    reportWeekId: 'reportWeekId',
    dimensionType: 'dimensionType',
    leads: 'leads',
    createdAt: 'createdAt',
    sourceCreatedAt: 'sourceCreatedAt',
  },
  reportWeeks: { id: 'id', weekEndingDate: 'weekEndingDate' },
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { db } from '@/lib/db';

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

function setupAuthenticatedMocks() {
  vi.mocked(validateSession).mockResolvedValue(mockSession);
  vi.mocked(getUserMemberships).mockResolvedValue(mockMemberships);
}

describe('Gap Analysis: KPI Endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns correct newLeads count when leadMetrics has rows matching current report week', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // newLeads aggregation: sum of leads from status-dimensioned leadMetrics
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 27 }]),
          }),
        };
      }
      // Pipeline stage counts (empty for this test)
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
      searchParams: { timeWindow: 'report-week' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.newLeads).toBe(27);
  });

  it('returns correct weightedPipelineValue by summing dollarValue across correct stages only', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 0 }]),
          }),
        };
      }
      // Pipeline with a mix of active and inactive stages
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'New Lead', count: 5, dollarValue: '25000.00' },
            { stage: 'Initial Call Complete', count: 3, dollarValue: '90000.00' },
            { stage: 'FA Signed', count: 1, dollarValue: '30000.00' },
            // Inactive stage - should be excluded from totals
            { stage: 'Not Interested', count: 20, dollarValue: '0' },
            { stage: 'Bad Lead', count: 8, dollarValue: '0' },
          ]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../kpi');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Only active stages: 25000 + 90000 + 30000 = 145000 (Not Interested & Bad Lead excluded)
    expect(data.data.weightedPipelineValue).toBe('145000.00');
    // Total pipeline excludes inactive: 5 + 3 + 1 = 9 (Not Interested 20 + Bad Lead 8 excluded)
    expect(data.data.totalPipeline).toBe(9);
  });

  it('priority candidates excludes early-funnel stages (New Lead, Inbound Contact, Outbound Call)', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 0 }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'Discovery Day Booked', count: 3, dollarValue: '30000' },
            { stage: 'Initial Call Complete', count: 5, dollarValue: '50000' },
            { stage: 'FA Signed', count: 2, dollarValue: '60000' },
            // Early-funnel stages - NOT priority candidates but still active
            { stage: 'New Lead', count: 10, dollarValue: '5000' },
            { stage: 'Inbound Contact', count: 8, dollarValue: '3000' },
            { stage: 'Outbound Call', count: 4, dollarValue: '2000' },
            // Inactive stages - excluded from everything
            { stage: 'Not Interested', count: 50, dollarValue: '0' },
            { stage: 'Never Responded', count: 20, dollarValue: '0' },
          ]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('../kpi');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Priority = Discovery Day Booked(3) + Initial Call Complete(5) + FA Signed(2) = 10
    // Early-funnel (active but not priority): New Lead(10) + Inbound Contact(8) + Outbound Call(4)
    // Inactive (excluded entirely): Not Interested(50) + Never Responded(20)
    expect(data.data.priorityCandidates).toBe(10);
    // Total pipeline = active only: 3+5+2+10+8+4 = 32 (inactive 70 excluded)
    expect(data.data.totalPipeline).toBe(32);
  });
});

describe('Gap Analysis: Pipeline Endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns correct number of weeks of leadTrends data based on weeks parameter', async () => {
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
                  // Return exactly 8 weeks of data
                  return Promise.resolve([
                    { weekEndingDate: '2026-02-02', leads: 15 },
                    { weekEndingDate: '2026-01-26', leads: 22 },
                    { weekEndingDate: '2026-01-19', leads: 18 },
                    { weekEndingDate: '2026-01-12', leads: 10 },
                    { weekEndingDate: '2026-01-05', leads: 14 },
                    { weekEndingDate: '2025-12-29', leads: 9 },
                    { weekEndingDate: '2025-12-22', leads: 20 },
                    { weekEndingDate: '2025-12-15', leads: 11 },
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
      searchParams: { weeks: '8' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Verify the limit was called with 8
    expect(capturedLimit).toBe(8);
    // Verify all 8 trend points are returned, sorted chronologically
    expect(data.data.leadTrends).toHaveLength(8);
    expect(data.data.leadTrends[0].source).toBe('2025-12-15');
    expect(data.data.leadTrends[7].source).toBe('2026-02-02');
  });
});
