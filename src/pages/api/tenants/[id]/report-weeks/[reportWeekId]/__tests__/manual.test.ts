/**
 * Tests for manual content API endpoints
 *
 * Task Group 3.1: Write 5 focused tests for manual content API
 * - Test GET returns manual content for report week
 * - Test PATCH updates manual content successfully
 * - Test PATCH returns 400 when report week is published
 * - Test proper authorization (agency admin required)
 * - Test 404 when report week not found
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
  SESSION_COOKIE_NAME: 'session',
  getUserMemberships: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', timezone: 'America/New_York' }]),
  },
  tenants: {},
}));

vi.mock('@/lib/report-weeks', () => ({
  getReportWeekById: vi.fn(),
  getReportWeekManualByReportWeekId: vi.fn(),
  updateReportWeekManual: vi.fn(),
  formatWeekPeriod: vi.fn(),
}));

import { validateSession, getUserMemberships } from '@/lib/auth';
import { getReportWeekById, getReportWeekManualByReportWeekId, updateReportWeekManual } from '@/lib/report-weeks';

// Import after mocking
const importHandler = async () => {
  const module = await import('../manual');
  return module;
};

const createMockRequest = (body?: any) => ({
  json: vi.fn().mockResolvedValue(body || {}),
});

const createMockCookies = (sessionToken?: string) => ({
  get: vi.fn().mockReturnValue(sessionToken ? { value: sessionToken } : undefined),
});

describe('GET /api/tenants/[id]/report-weeks/[reportWeekId]/manual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns manual content for report week', async () => {
    (validateSession as any).mockResolvedValue({ userId: 'user-1' });
    (getUserMemberships as any).mockResolvedValue([{ role: 'agency_admin', tenantId: null }]);
    (getReportWeekById as any).mockResolvedValue({
      id: 'report-week-1',
      tenantId: 'tenant-1',
      status: 'draft',
    });
    (getReportWeekManualByReportWeekId as any).mockResolvedValue({
      id: 'manual-1',
      reportWeekId: 'report-week-1',
      narrativeRich: '<p>Narrative content</p>',
      initiativesRich: '<p>Initiatives content</p>',
      needsRich: '<p>Needs content</p>',
    });

    const { GET } = await importHandler();
    const response = await GET({
      cookies: createMockCookies('valid-session'),
      params: { id: 'tenant-1', reportWeekId: 'report-week-1' },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.narrativeRich).toBe('<p>Narrative content</p>');
    expect(data.data.initiativesRich).toBe('<p>Initiatives content</p>');
    expect(data.data.needsRich).toBe('<p>Needs content</p>');
    expect(data.data.reportWeekStatus).toBe('draft');
  });

  it('returns 404 when report week not found', async () => {
    (validateSession as any).mockResolvedValue({ userId: 'user-1' });
    (getUserMemberships as any).mockResolvedValue([{ role: 'agency_admin', tenantId: null }]);
    (getReportWeekById as any).mockResolvedValue(undefined);

    const { GET } = await importHandler();
    const response = await GET({
      cookies: createMockCookies('valid-session'),
      params: { id: 'tenant-1', reportWeekId: 'nonexistent' },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('requires agency admin authorization', async () => {
    (validateSession as any).mockResolvedValue({ userId: 'user-1' });
    (getUserMemberships as any).mockResolvedValue([{ role: 'tenant_admin', tenantId: 'tenant-1' }]);

    const { GET } = await importHandler();
    const response = await GET({
      cookies: createMockCookies('valid-session'),
      params: { id: 'tenant-1', reportWeekId: 'report-week-1' },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/tenants/[id]/report-weeks/[reportWeekId]/manual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates manual content successfully', async () => {
    (validateSession as any).mockResolvedValue({ userId: 'user-1' });
    (getUserMemberships as any).mockResolvedValue([{ role: 'agency_admin', tenantId: null }]);
    (getReportWeekById as any).mockResolvedValue({
      id: 'report-week-1',
      tenantId: 'tenant-1',
      status: 'draft',
    });
    (updateReportWeekManual as any).mockResolvedValue({
      id: 'manual-1',
      reportWeekId: 'report-week-1',
      narrativeRich: '<p>Updated narrative</p>',
      initiativesRich: null,
      needsRich: null,
    });

    const { PATCH } = await importHandler();
    const response = await PATCH({
      cookies: createMockCookies('valid-session'),
      params: { id: 'tenant-1', reportWeekId: 'report-week-1' },
      request: createMockRequest({
        narrativeRich: '<p>Updated narrative</p>',
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.narrativeRich).toBe('<p>Updated narrative</p>');
    expect(updateReportWeekManual).toHaveBeenCalledWith('report-week-1', {
      narrativeRich: '<p>Updated narrative</p>',
    });
  });

  it('returns 400 when report week is published', async () => {
    (validateSession as any).mockResolvedValue({ userId: 'user-1' });
    (getUserMemberships as any).mockResolvedValue([{ role: 'agency_admin', tenantId: null }]);
    (getReportWeekById as any).mockResolvedValue({
      id: 'report-week-1',
      tenantId: 'tenant-1',
      status: 'published',
    });

    const { PATCH } = await importHandler();
    const response = await PATCH({
      cookies: createMockCookies('valid-session'),
      params: { id: 'tenant-1', reportWeekId: 'report-week-1' },
      request: createMockRequest({
        narrativeRich: '<p>Updated narrative</p>',
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.error).toContain('published');
  });
});
