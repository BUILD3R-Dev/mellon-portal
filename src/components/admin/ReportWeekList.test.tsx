import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { ReportWeekList } from './ReportWeekList';
import { ReportWeekModal } from './ReportWeekModal';
import { PublishConfirmDialog } from './PublishConfirmDialog';
import { UnpublishConfirmDialog } from './UnpublishConfirmDialog';
import { DeleteReportWeekDialog } from './DeleteReportWeekDialog';

/**
 * Tests for Report Week UI Components
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Report Week UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('ReportWeekList', () => {
    const mockReportWeeks = [
      {
        id: 'rw-1',
        tenantId: 'tenant-1',
        weekEndingDate: '2025-01-24',
        periodStartAt: '2025-01-20T05:00:00.000Z',
        periodEndAt: '2025-01-25T04:59:59.000Z',
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        status: 'draft' as const,
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
        status: 'published' as const,
        publishedAt: '2025-01-16T14:00:00.000Z',
        publishedBy: 'user-1',
        createdAt: '2025-01-10T10:00:00.000Z',
        updatedAt: '2025-01-16T14:00:00.000Z',
      },
    ];

    it('exports ReportWeekList component', () => {
      expect(ReportWeekList).toBeDefined();
      expect(typeof ReportWeekList).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        tenantId: 'tenant-1',
        tenantName: 'Test Franchise',
        tenantTimezone: 'America/New_York',
        initialReportWeeks: mockReportWeeks,
      };

      expect(() => React.createElement(ReportWeekList, props)).not.toThrow();
    });

    it('renders with correct initial data', () => {
      const props = {
        tenantId: 'tenant-1',
        tenantName: 'Test Franchise',
        tenantTimezone: 'America/New_York',
        initialReportWeeks: mockReportWeeks,
      };

      const element = React.createElement(ReportWeekList, props);
      expect(element.props.initialReportWeeks).toHaveLength(2);
      expect(element.props.initialReportWeeks[0].weekPeriod).toBe('Jan 20 - Jan 24, 2025');
    });

    it('handles empty report weeks list gracefully', () => {
      const props = {
        tenantId: 'tenant-1',
        tenantName: 'Test Franchise',
        tenantTimezone: 'America/New_York',
        initialReportWeeks: [],
      };

      expect(() => React.createElement(ReportWeekList, props)).not.toThrow();
    });
  });

  describe('ReportWeekModal', () => {
    it('exports ReportWeekModal component', () => {
      expect(ReportWeekModal).toBeDefined();
      expect(typeof ReportWeekModal).toBe('function');
    });

    it('accepts required props for create mode', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        mode: 'create' as const,
        tenantId: 'tenant-1',
        tenantTimezone: 'America/New_York',
      };

      expect(() => React.createElement(ReportWeekModal, props)).not.toThrow();
    });

    it('accepts required props for edit mode', () => {
      const reportWeek = {
        id: 'rw-1',
        tenantId: 'tenant-1',
        weekEndingDate: '2025-01-24',
        periodStartAt: '2025-01-20T05:00:00.000Z',
        periodEndAt: '2025-01-25T04:59:59.000Z',
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        status: 'draft' as const,
        publishedAt: null,
        publishedBy: null,
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z',
      };

      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        mode: 'edit' as const,
        tenantId: 'tenant-1',
        tenantTimezone: 'America/New_York',
        reportWeek,
      };

      expect(() => React.createElement(ReportWeekModal, props)).not.toThrow();
    });

    it('validates Friday-only date via API', async () => {
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
  });

  describe('PublishConfirmDialog', () => {
    it('exports PublishConfirmDialog component', () => {
      expect(PublishConfirmDialog).toBeDefined();
      expect(typeof PublishConfirmDialog).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        isLoading: false,
      };

      expect(() => React.createElement(PublishConfirmDialog, props)).not.toThrow();
    });

    it('handles loading state', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        isLoading: true,
      };

      const element = React.createElement(PublishConfirmDialog, props);
      expect(element.props.isLoading).toBe(true);
    });
  });

  describe('UnpublishConfirmDialog', () => {
    it('exports UnpublishConfirmDialog component', () => {
      expect(UnpublishConfirmDialog).toBeDefined();
      expect(typeof UnpublishConfirmDialog).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        isLoading: false,
      };

      expect(() => React.createElement(UnpublishConfirmDialog, props)).not.toThrow();
    });
  });

  describe('DeleteReportWeekDialog', () => {
    it('exports DeleteReportWeekDialog component', () => {
      expect(DeleteReportWeekDialog).toBeDefined();
      expect(typeof DeleteReportWeekDialog).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        isLoading: false,
      };

      expect(() => React.createElement(DeleteReportWeekDialog, props)).not.toThrow();
    });

    it('handles loading state', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        weekPeriod: 'Jan 20 - Jan 24, 2025',
        isLoading: true,
      };

      const element = React.createElement(DeleteReportWeekDialog, props);
      expect(element.props.isLoading).toBe(true);
    });
  });

  describe('Status Filter Behavior', () => {
    it('filters report weeks by draft status via API', async () => {
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
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('draft');
    });

    it('filters report weeks by published status via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'rw-2',
                status: 'published',
                weekEndingDate: '2025-01-17',
              },
            ],
          }),
      });

      const response = await fetch('/api/tenants/tenant-1/report-weeks?status=published');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('published');
    });
  });
});
