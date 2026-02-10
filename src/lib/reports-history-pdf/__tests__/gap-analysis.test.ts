/**
 * Task Group 6: Gap analysis tests for Reports History & PDF Export
 *
 * Fills critical coverage gaps identified from reviewing Task Groups 1-5:
 * 1. Full pagination flow (page 1, page 2, out-of-range page)
 * 2. Year + month filter combination returns only matching reports
 * 3. POST /api/reports/[id]/pdf for a non-existent report returns 404
 * 4. POST /api/reports/[id]/pdf for a draft report returns 403
 * 5. GET /api/reports/[id]/pdf streams correct PDF bytes and headers
 * 6. setFeatureFlag upsert: set true then false, verify final state
 * 7. generateReportHTML renders gracefully when manual content is null
 * 8. getDistinctReportYears returns sorted unique years
 * 9. GET /api/dashboard/kpi still returns same response shape (regression)
 * 10. GET /api/dashboard/pipeline still returns same response shape (regression)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
  getUserMemberships: vi.fn(),
  SESSION_COOKIE_NAME: 'mellon_session',
  TENANT_COOKIE_NAME: 'mellon_tenant',
}));

vi.mock('@/lib/report-weeks', () => ({
  getReportWeeksForTenantPaginated: vi.fn(),
  getDistinctReportYears: vi.fn(),
  getReportWeekById: vi.fn(),
  formatWeekPeriod: vi.fn().mockReturnValue('Jan 13 - Jan 19, 2026'),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
  FEATURE_PDF_EXPORT: 'pdf_export',
}));

vi.mock('@/lib/pdf', () => ({
  generateReportPDF: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  reportExports: {
    tenantId: 'tenant_id',
    reportWeekId: 'report_week_id',
    pdfUrl: 'pdf_url',
  },
  featureFlags: {
    tenantId: 'tenant_id',
    featureKey: 'feature_key',
    enabled: 'enabled',
  },
  pipelineStageCounts: {
    tenantId: 'tenant_id',
    reportWeekId: 'report_week_id',
    stage: 'stage',
  },
  leadMetrics: {
    tenantId: 'tenant_id',
    reportWeekId: 'report_week_id',
    dimensionType: 'dimension_type',
    leads: 'leads',
    createdAt: 'created_at',
  },
  reportWeeks: {
    id: 'id',
    weekEndingDate: 'week_ending_date',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  gte: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import {
  getReportWeeksForTenantPaginated,
  getDistinctReportYears,
  getReportWeekById,
} from '@/lib/report-weeks';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { db } from '@/lib/db';
import fs, { existsSync, readFileSync } from 'node:fs';
import { generateReportHTML } from '@/lib/pdf/template';
import type { ReportPDFData } from '@/lib/pdf/template';

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

  const url = new URL(`http://localhost/api/reports/${options.path || ''}`);
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
    params: {} as Record<string, string>,
  };
}

function setupAuthenticatedMocks() {
  vi.mocked(validateSession).mockResolvedValue(mockSession);
  vi.mocked(getUserMemberships).mockResolvedValue(mockMemberships);
}

function buildMockReportWeek(id: string, weekEndingDate: string) {
  return {
    id,
    tenantId: 'tenant-abc',
    weekEndingDate,
    periodStartAt: new Date(`${weekEndingDate}T00:00:00Z`),
    periodEndAt: new Date(`${weekEndingDate}T23:59:59Z`),
    status: 'published' as const,
    publishedAt: new Date(),
    publishedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Gap Analysis: Pagination flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('page 1 returns first slice, page 2 returns next slice, out-of-range returns empty', async () => {
    setupAuthenticatedMocks();

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValueOnce({
      data: [
        buildMockReportWeek('rw-1', '2026-01-31'),
        buildMockReportWeek('rw-2', '2026-01-24'),
      ],
      totalCount: 3,
    });

    const { GET } = await import('@/pages/api/reports/index');

    const ctx1 = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { page: '1', limit: '2' },
    });
    const res1 = await GET(ctx1 as any);
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.data).toHaveLength(2);
    expect(data1.pagination.page).toBe(1);
    expect(data1.pagination.totalPages).toBe(2);
    expect(data1.pagination.totalCount).toBe(3);

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValueOnce({
      data: [buildMockReportWeek('rw-3', '2026-01-17')],
      totalCount: 3,
    });

    setupAuthenticatedMocks();
    const ctx2 = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { page: '2', limit: '2' },
    });
    const res2 = await GET(ctx2 as any);
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.data).toHaveLength(1);
    expect(data2.pagination.page).toBe(2);

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValueOnce({
      data: [],
      totalCount: 3,
    });

    setupAuthenticatedMocks();
    const ctx3 = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { page: '99', limit: '2' },
    });
    const res3 = await GET(ctx3 as any);
    const data3 = await res3.json();

    expect(res3.status).toBe(200);
    expect(data3.data).toHaveLength(0);
    expect(data3.pagination.page).toBe(99);
    expect(data3.pagination.totalCount).toBe(3);
  });
});

describe('Gap Analysis: Year + month filter combination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('passes both year and month to the query layer and returns only matching reports', async () => {
    setupAuthenticatedMocks();

    const juneReport = buildMockReportWeek('rw-june', '2025-06-27');

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValueOnce({
      data: [juneReport],
      totalCount: 1,
    });

    const { GET } = await import('@/pages/api/reports/index');
    const ctx = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { year: '2025', month: '6', page: '1', limit: '10' },
    });
    const res = await GET(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe('rw-june');

    expect(getReportWeeksForTenantPaginated).toHaveBeenCalledWith(
      'tenant-abc',
      expect.objectContaining({ year: 2025, month: 6, status: 'published' })
    );
  });
});

describe('Gap Analysis: POST pdf for non-existent report', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 404 when the report week does not exist', async () => {
    setupAuthenticatedMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(getReportWeekById).mockResolvedValue(undefined);

    const { POST } = await import('@/pages/api/reports/[reportWeekId]/pdf');
    const ctx = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'nonexistent/pdf',
    });
    ctx.params = { reportWeekId: 'nonexistent' };

    const res = await POST(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NOT_FOUND');
  });
});

describe('Gap Analysis: POST pdf for a draft (unpublished) report', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 403 when the report is not published', async () => {
    setupAuthenticatedMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(getReportWeekById).mockResolvedValue({
      id: 'rw-draft',
      tenantId: 'tenant-abc',
      weekEndingDate: '2026-01-17',
      periodStartAt: new Date('2026-01-11'),
      periodEndAt: new Date('2026-01-18'),
      status: 'draft',
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { POST } = await import('@/pages/api/reports/[reportWeekId]/pdf');
    const ctx = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'rw-draft/pdf',
    });
    ctx.params = { reportWeekId: 'rw-draft' };

    const res = await POST(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('published');
  });
});

describe('Gap Analysis: GET pdf streams correct bytes and headers for cached report', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns PDF with correct Content-Type and Content-Disposition headers', async () => {
    setupAuthenticatedMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    const fakePdfBytes = Buffer.from('%PDF-1.4 fake pdf content');

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ pdfUrl: '/tmp/test.pdf' }]),
        }),
      }),
    } as any);

    // Mock both the named and default exports for existsSync/readFileSync
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(fakePdfBytes);
    // The pdf.ts endpoint uses `import fs from 'node:fs'` so also mock default
    if (fs && typeof fs === 'object') {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(fakePdfBytes);
    }

    const { GET } = await import('@/pages/api/reports/[reportWeekId]/pdf');
    const ctx = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'rw-1/pdf',
    });
    ctx.params = { reportWeekId: 'rw-1' };

    const res = await GET(ctx as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('report-rw-1.pdf');

    const arrayBuffer = await res.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    expect(bytes.toString()).toBe('%PDF-1.4 fake pdf content');
  });
});

describe('Gap Analysis: setFeatureFlag upsert true then false', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('set to true then set to false, verify final state is false', async () => {
    let lastEnabledValue: boolean | undefined;

    const mockOnConflictDoUpdate = vi.fn().mockImplementation((opts) => {
      lastEnabledValue = opts.set.enabled;
      return Promise.resolve();
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      }),
    } as any);

    const { setFeatureFlag } = await import('@/lib/feature-flags/queries');

    await setFeatureFlag('tenant-abc', 'pdf_export', true);
    expect(lastEnabledValue).toBe(true);

    await setFeatureFlag('tenant-abc', 'pdf_export', false);
    expect(lastEnabledValue).toBe(false);

    expect(db.insert).toHaveBeenCalledTimes(2);
  });
});

describe('Gap Analysis: generateReportHTML with null manual content', () => {
  it('renders gracefully when manual content fields are null', () => {
    const data: ReportPDFData = {
      reportWeek: {
        weekEndingDate: '2026-02-06',
        periodStartAt: new Date('2026-02-02T05:00:00Z'),
        periodEndAt: new Date('2026-02-07T04:59:59Z'),
      },
      manualContent: null,
      kpiData: {
        newLeads: 0,
        totalPipeline: 0,
        priorityCandidates: 0,
        weightedPipelineValue: '0.00',
      },
      pipelineData: [],
      leadTrends: [],
      branding: null,
      tenantName: 'Empty Corp',
    };

    const html = generateReportHTML(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Empty Corp');
    expect(html).toContain('Weekly Report');
    expect(html).toContain('Dashboard Summary');
    expect(html).toContain('Powered by');

    // Content sections should NOT render when manual content is null
    expect(html).not.toContain('class="content-section"');
  });
});

describe('Gap Analysis: getDistinctReportYears returns sorted unique years', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns distinct years in descending order from the query', async () => {
    vi.mocked(getDistinctReportYears).mockResolvedValue([2026, 2025, 2024]);

    setupAuthenticatedMocks();

    const { GET } = await import('@/pages/api/reports/available-years');
    const ctx = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
    });
    const res = await GET(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.years).toEqual([2026, 2025, 2024]);

    const years = data.data.years;
    for (let i = 0; i < years.length - 1; i++) {
      expect(years[i]).toBeGreaterThan(years[i + 1]);
    }
  });
});

describe('Gap Analysis: Dashboard KPI regression', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /api/dashboard/kpi returns same response shape after refactor', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 10 }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'New Lead', count: 20, dollarValue: '40000.00' },
          ]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('@/pages/api/dashboard/kpi');
    const cookies = new Map<string, { value: string }>();
    cookies.set('mellon_session', { value: 'valid-token' });
    cookies.set('mellon_tenant', { value: 'tenant-abc' });

    const ctx = {
      cookies: { get: (name: string) => cookies.get(name) },
      url: new URL('http://localhost/api/dashboard/kpi'),
    };

    const res = await GET(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('newLeads');
    expect(data.data).toHaveProperty('totalPipeline');
    expect(data.data).toHaveProperty('priorityCandidates');
    expect(data.data).toHaveProperty('weightedPipelineValue');

    expect(typeof data.data.newLeads).toBe('number');
    expect(typeof data.data.totalPipeline).toBe('number');
    expect(typeof data.data.priorityCandidates).toBe('number');
    expect(typeof data.data.weightedPipelineValue).toBe('string');
  });
});

describe('Gap Analysis: Dashboard Pipeline regression', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /api/dashboard/pipeline returns same response shape after refactor', async () => {
    setupAuthenticatedMocks();

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { stage: 'New Lead', count: 30, dollarValue: '60000.00' },
            ]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { weekEndingDate: '2026-01-31', leads: 12 },
                ]),
              }),
            }),
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { GET } = await import('@/pages/api/dashboard/pipeline');
    const cookies = new Map<string, { value: string }>();
    cookies.set('mellon_session', { value: 'valid-token' });
    cookies.set('mellon_tenant', { value: 'tenant-abc' });

    const ctx = {
      cookies: { get: (name: string) => cookies.get(name) },
      url: new URL('http://localhost/api/dashboard/pipeline'),
    };

    const res = await GET(ctx as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('pipelineByStage');
    expect(data.data).toHaveProperty('leadTrends');
    expect(Array.isArray(data.data.pipelineByStage)).toBe(true);
    expect(Array.isArray(data.data.leadTrends)).toBe(true);

    if (data.data.pipelineByStage.length > 0) {
      expect(data.data.pipelineByStage[0]).toHaveProperty('stage');
      expect(data.data.pipelineByStage[0]).toHaveProperty('count');
    }

    if (data.data.leadTrends.length > 0) {
      expect(data.data.leadTrends[0]).toHaveProperty('source');
      expect(data.data.leadTrends[0]).toHaveProperty('leads');
    }
  });
});
