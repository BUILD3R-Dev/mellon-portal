import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for Report Week API Endpoints
 *
 * These tests verify the API behavior using mocked fetch responses,
 * following the established pattern from TenantManagement.test.tsx
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Report Week API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('GET /api/tenants/[id]/report-weeks', () => {
    it('returns list of report weeks for tenant', async () => {
      const mockReportWeeks = [
        {
          id: 'rw-1',
          tenantId: 'tenant-1',
          weekEndingDate: '2025-01-24',
          periodStartAt: '2025-01-20T05:00:00.000Z',
          periodEndAt: '2025-01-25T04:59:59.000Z',
          weekPeriod: 'Jan 20 - Jan 24, 2025',
          status: 'draft',
          publishedAt: null,
          publishedBy: null,
          createdAt: '2025-01-15T10:00:00.000Z',
          updatedAt: '2025-01-15T10:00:00.000Z',
        },
        {
          id: 'rw-2',
          tenantId: 'tenant-1',
          weekEndingDate: '2025-01-17',
          periodStartAt: '2025-01-13T05:00:00.000Z',
          periodEndAt: '2025-01-18T04:59:59.000Z',
          weekPeriod: 'Jan 13 - Jan 17, 2025',
          status: 'published',
          publishedAt: '2025-01-16T14:00:00.000Z',
          publishedBy: 'user-1',
          createdAt: '2025-01-10T10:00:00.000Z',
          updatedAt: '2025-01-16T14:00:00.000Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: mockReportWeeks,
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].weekEndingDate).toBe('2025-01-24');
    });

    it('supports status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'rw-1',
                status: 'draft',
                weekEndingDate: '2025-01-24',
              },
            ],
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks?status=draft');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data[0].status).toBe('draft');
    });
  });

  describe('POST /api/tenants/[id]/report-weeks', () => {
    it('creates draft report week with valid Friday date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'new-rw-id',
              tenantId: 'tenant-1',
              weekEndingDate: '2025-01-24',
              periodStartAt: '2025-01-20T05:00:00.000Z',
              periodEndAt: '2025-01-25T04:59:59.000Z',
              weekPeriod: 'Jan 20 - Jan 24, 2025',
              status: 'draft',
              publishedAt: null,
              publishedBy: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekEndingDate: '2025-01-24',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('draft');
      expect(data.data.weekEndingDate).toBe('2025-01-24');
    });

    it('rejects non-Friday date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Selected date must be a Friday',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekEndingDate: '2025-01-23', // Thursday
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.error).toBe('Selected date must be a Friday');
    });

    it('rejects overlapping date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'A report week already exists that overlaps with this date range',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekEndingDate: '2025-01-24',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.error).toBe('A report week already exists that overlaps with this date range');
    });
  });

  describe('PATCH /api/tenants/[id]/report-weeks/[reportWeekId]', () => {
    it('publishes a draft report week', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'rw-1',
              status: 'published',
              publishedAt: '2025-01-20T14:00:00.000Z',
              publishedBy: 'user-1',
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks/rw-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('published');
      expect(data.data.publishedAt).toBeTruthy();
      expect(data.data.publishedBy).toBe('user-1');
    });

    it('unpublishes a published report week', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'rw-1',
              status: 'draft',
              publishedAt: null,
              publishedBy: null,
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks/rw-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('draft');
      expect(data.data.publishedAt).toBeNull();
    });

    it('rejects date change for published report week', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Only draft report weeks can be edited',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks/rw-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekEndingDate: '2025-01-31',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.error).toBe('Only draft report weeks can be edited');
    });
  });

  describe('DELETE /api/tenants/[id]/report-weeks/[reportWeekId]', () => {
    it('deletes a draft report week', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Report week deleted successfully',
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks/rw-1', {
        method: 'DELETE',
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    it('rejects deletion of published report week', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Only draft report weeks can be deleted',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks/rw-1', {
        method: 'DELETE',
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.error).toBe('Only draft report weeks can be deleted');
    });
  });
});
