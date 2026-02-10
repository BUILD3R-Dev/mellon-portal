/**
 * Tests for reports API endpoints
 *
 * Task Group 3.1: 6 focused tests for the API layer
 * - GET /api/reports returns paginated results with pagination metadata
 * - GET /api/reports filters by year and month query parameters
 * - GET /api/reports/available-years returns distinct years for the tenant
 * - POST /api/reports/[reportWeekId]/pdf returns 403 when pdf_export flag is disabled
 * - POST /api/reports/[reportWeekId]/pdf returns a download URL on success
 * - GET /api/reports/[reportWeekId]/pdf returns 404 when no cached PDF exists
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the handlers
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
  },
  reportExports: {
    tenantId: 'tenant_id',
    reportWeekId: 'report_week_id',
    pdfUrl: 'pdf_url',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { getReportWeeksForTenantPaginated, getDistinctReportYears, getReportWeekById } from '@/lib/report-weeks';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { generateReportPDF } from '@/lib/pdf';
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

/** Sets up mocks for an authenticated, authorized request */
function setupAuthenticatedMocks() {
  vi.mocked(validateSession).mockResolvedValue(mockSession);
  vi.mocked(getUserMemberships).mockResolvedValue(mockMemberships);
}

describe('GET /api/reports (paginated)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns paginated results with pagination metadata when page and limit params are provided', async () => {
    setupAuthenticatedMocks();

    const mockReportWeeks = [
      {
        id: 'rw-1',
        tenantId: 'tenant-abc',
        weekEndingDate: '2026-01-17',
        periodStartAt: new Date('2026-01-11'),
        periodEndAt: new Date('2026-01-18'),
        status: 'published' as const,
        publishedAt: new Date(),
        publishedBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValue({
      data: mockReportWeeks,
      totalCount: 15,
    });

    const { GET } = await import('../index');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { page: '2', limit: '5' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(data.pagination.totalCount).toBe(15);
    expect(data.pagination.totalPages).toBe(3);

    // Verify paginated function was called with correct offset
    expect(getReportWeeksForTenantPaginated).toHaveBeenCalledWith(
      'tenant-abc',
      expect.objectContaining({
        status: 'published',
        limit: 5,
        offset: 5,
      })
    );
  });

  it('filters by year and month query parameters', async () => {
    setupAuthenticatedMocks();

    vi.mocked(getReportWeeksForTenantPaginated).mockResolvedValue({
      data: [],
      totalCount: 0,
    });

    const { GET } = await import('../index');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      searchParams: { year: '2025', month: '6' },
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(getReportWeeksForTenantPaginated).toHaveBeenCalledWith(
      'tenant-abc',
      expect.objectContaining({
        status: 'published',
        year: 2025,
        month: 6,
      })
    );
  });
});

describe('GET /api/reports/available-years', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns distinct years for the tenant', async () => {
    setupAuthenticatedMocks();

    vi.mocked(getDistinctReportYears).mockResolvedValue([2026, 2025]);

    const { GET } = await import('../available-years');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
    });
    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.years).toEqual([2026, 2025]);
    expect(getDistinctReportYears).toHaveBeenCalledWith('tenant-abc');
  });
});

describe('POST /api/reports/[reportWeekId]/pdf', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 403 when pdf_export feature flag is disabled', async () => {
    setupAuthenticatedMocks();

    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    const { POST } = await import('../[reportWeekId]/pdf');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'rw-1/pdf',
    });
    context.params = { reportWeekId: 'rw-1' };

    const response = await POST(context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORBIDDEN');
    expect(isFeatureEnabled).toHaveBeenCalledWith('tenant-abc', 'pdf_export');
  });

  it('returns a download URL on success', async () => {
    setupAuthenticatedMocks();

    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(getReportWeekById).mockResolvedValue({
      id: 'rw-1',
      tenantId: 'tenant-abc',
      weekEndingDate: '2026-01-17',
      periodStartAt: new Date('2026-01-11'),
      periodEndAt: new Date('2026-01-18'),
      status: 'published',
      publishedAt: new Date(),
      publishedBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(generateReportPDF).mockResolvedValue('./storage/pdfs/tenant-abc_rw-1.pdf');

    const { POST } = await import('../[reportWeekId]/pdf');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'rw-1/pdf',
    });
    context.params = { reportWeekId: 'rw-1' };

    const response = await POST(context as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.downloadUrl).toBe('/api/reports/rw-1/pdf');
    expect(generateReportPDF).toHaveBeenCalledWith('rw-1', 'tenant-abc');
  });
});

describe('GET /api/reports/[reportWeekId]/pdf', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 404 when no cached PDF exists', async () => {
    setupAuthenticatedMocks();

    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    // Mock db.select to return empty result (no cached PDF)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const { GET } = await import('../[reportWeekId]/pdf');
    const context = createMockContext({
      sessionToken: 'valid-token',
      tenantId: 'tenant-abc',
      path: 'rw-1/pdf',
    });
    context.params = { reportWeekId: 'rw-1' };

    const response = await GET(context as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NOT_FOUND');
  });
});
