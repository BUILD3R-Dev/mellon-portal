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
      // Pipeline with a mix of stages: some in full pipeline, one outside
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'New Lead', count: 5, dollarValue: '25000.00' },
            { stage: 'QR Returned', count: 3, dollarValue: '90000.00' },
            { stage: 'FA Sent', count: 1, dollarValue: '30000.00' },
            // Stage outside full pipeline range (should NOT be included in weighted value)
            { stage: 'Closed Won', count: 2, dollarValue: '200000.00' },
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
    // 25000 + 90000 + 30000 = 145000 (Closed Won excluded)
    expect(data.data.weightedPipelineValue).toBe('145000.00');
    // Total pipeline includes all stages: 5 + 3 + 1 + 2 = 11
    expect(data.data.totalPipeline).toBe(11);
  });

  it('priority candidates stage list matches the spec (QR Returned through FA Sent)', async () => {
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
      // One contact in each priority stage
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'QR Returned', count: 1, dollarValue: '10000' },
            { stage: 'FDD Sent', count: 2, dollarValue: '20000' },
            { stage: 'FDD Signed', count: 3, dollarValue: '30000' },
            { stage: 'FDD Review Call Sched.', count: 4, dollarValue: '40000' },
            { stage: 'FDD Review Call Compl.', count: 5, dollarValue: '50000' },
            { stage: 'FA Sent', count: 6, dollarValue: '60000' },
            // These are NOT priority candidates
            { stage: 'New Lead', count: 10, dollarValue: '5000' },
            { stage: 'QR', count: 8, dollarValue: '3000' },
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
    // Priority = QR Returned(1) + FDD Sent(2) + FDD Signed(3) + FDD Review Call Sched.(4) + FDD Review Call Compl.(5) + FA Sent(6) = 21
    expect(data.data.priorityCandidates).toBe(21);
    // New Lead and QR are NOT included in priority candidates
    // Total pipeline includes everything: 1+2+3+4+5+6+10+8 = 39
    expect(data.data.totalPipeline).toBe(39);
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
