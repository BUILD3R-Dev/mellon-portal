/**
 * @vitest-environment jsdom
 */
/**
 * Tests for ReportsList component
 *
 * Verifies the base rendering behavior of the ReportsList component
 * which now fetches data client-side via API calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReportsList } from '../ReportsList';

const mockReports = [
  {
    id: 'rw-1',
    weekEndingDate: '2025-01-17',
    periodStartAt: '2025-01-13T00:00:00.000Z',
    periodEndAt: '2025-01-17T23:59:59.000Z',
    weekPeriod: 'Jan 13 - Jan 17, 2025',
    status: 'published' as const,
  },
  {
    id: 'rw-2',
    weekEndingDate: '2025-01-10',
    periodStartAt: '2025-01-06T00:00:00.000Z',
    periodEndAt: '2025-01-10T23:59:59.000Z',
    weekPeriod: 'Jan 6 - Jan 10, 2025',
    status: 'published' as const,
  },
  {
    id: 'rw-3',
    weekEndingDate: '2025-01-03',
    periodStartAt: '2024-12-30T00:00:00.000Z',
    periodEndAt: '2025-01-03T23:59:59.000Z',
    weekPeriod: 'Dec 30 - Jan 3, 2025',
    status: 'published' as const,
  },
];

/** Parse the limit query param from a URL string */
function parseLimitParam(urlStr: string): number | null {
  try {
    const url = new URL(urlStr, 'http://localhost');
    const val = url.searchParams.get('limit');
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

function createFetchMock() {
  return vi.fn((url: string) => {
    const urlStr = typeof url === 'string' ? url : '';

    if (urlStr.includes('/api/reports/available-years')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { years: [2025] },
        }),
      });
    }

    const limitValue = parseLimitParam(urlStr);
    if (limitValue === 1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [mockReports[0]],
          pagination: { page: 1, limit: 1, totalPages: 1, totalCount: mockReports.length },
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockReports,
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: mockReports.length },
      }),
    });
  });
}

function createEmptyFetchMock() {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, totalPages: 0, totalCount: 0 },
      }),
    })
  );
}

describe('ReportsList', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders "Latest Report" prominently at the top', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      expect(screen.getByText('Latest Report')).toBeInTheDocument();
      expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
    });
  });

  it('links each report to individual report view', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      const reportLinks = screen.getAllByRole('link', { name: /view report/i });
      expect(reportLinks.length).toBeGreaterThan(0);
      expect(reportLinks[0]).toHaveAttribute('href', '/reports/rw-1');
    });
  });

  it('shows empty state message when no reports', async () => {
    globalThis.fetch = createEmptyFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      expect(screen.getByText(/no published reports yet/i)).toBeInTheDocument();
    });
  });

  it('shows week period dates for each report', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
      expect(screen.getByText('Dec 30 - Jan 3, 2025')).toBeInTheDocument();
    });
  });
});
