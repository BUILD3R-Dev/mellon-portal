/**
 * @vitest-environment jsdom
 */
/**
 * Tests for the updated ReportsList component with pagination, filters, and PDF download
 *
 * Task Group 5.1: Write 5 focused tests
 * - Test ReportsList renders year and month filter dropdowns with "All" as default option
 * - Test ReportsList renders pagination controls when multiple pages exist
 * - Test ReportsList renders a PDF download button on each report row when pdfExportEnabled is true
 * - Test ReportsList does NOT render PDF download buttons when pdfExportEnabled is false
 * - Test PDF download button shows a loading/spinner state during the POST request
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

function createFetchMock(options?: { totalPages?: number }) {
  const totalPages = options?.totalPages ?? 2;

  return vi.fn((url: string, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : '';

    // Available years endpoint
    if (urlStr.includes('/api/reports/available-years')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { years: [2024, 2025] },
        }),
      });
    }

    // PDF generation POST endpoint
    if (urlStr.includes('/pdf') && init?.method === 'POST') {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { downloadUrl: `/api/reports/rw-1/pdf` },
            }),
          });
        }, 100);
      });
    }

    // Latest report fetch (limit=1 exactly, not limit=10)
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

    // Paginated reports fetch
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockReports,
        pagination: { page: 1, limit: 10, totalPages, totalCount: mockReports.length },
      }),
    });
  });
}

describe('ReportsList - Pagination, Filters, and PDF Download', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders year and month filter dropdowns with "All" as default option', async () => {
    globalThis.fetch = createFetchMock() as any;

    render(<ReportsList pdfExportEnabled={false} />);

    // Year dropdown should be present with "All Years" default
    const yearSelect = screen.getByLabelText('Filter by year') as HTMLSelectElement;
    expect(yearSelect).toBeInTheDocument();
    expect(yearSelect.value).toBe('');
    expect(screen.getByText('All Years')).toBeInTheDocument();

    // Month dropdown should be present with "All Months" default
    const monthSelect = screen.getByLabelText('Filter by month') as HTMLSelectElement;
    expect(monthSelect).toBeInTheDocument();
    expect(monthSelect.value).toBe('');
    expect(screen.getByText('All Months')).toBeInTheDocument();

    // Month dropdown should contain all 12 months
    await waitFor(() => {
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('December')).toBeInTheDocument();
    });
  });

  it('renders pagination controls (Previous/Next buttons) when multiple pages exist', async () => {
    globalThis.fetch = createFetchMock({ totalPages: 3 }) as any;

    render(<ReportsList pdfExportEnabled={false} />);

    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    });

    // Pagination controls should be visible
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();

    // Page info should be shown
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    // Previous should be disabled on page 1
    expect(prevButton).toBeDisabled();

    // Next should be enabled
    expect(nextButton).not.toBeDisabled();
  });

  it('renders a PDF download button on each report row when pdfExportEnabled is true', async () => {
    globalThis.fetch = createFetchMock({ totalPages: 1 }) as any;

    render(<ReportsList pdfExportEnabled={true} />);

    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    });

    // Download buttons should appear on report rows
    const downloadButtons = screen.getAllByLabelText('Download PDF');
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('does NOT render PDF download buttons when pdfExportEnabled is false', async () => {
    globalThis.fetch = createFetchMock({ totalPages: 1 }) as any;

    render(<ReportsList pdfExportEnabled={false} />);

    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    });

    // No download buttons should be present
    expect(screen.queryAllByLabelText('Download PDF')).toHaveLength(0);
  });

  it('PDF download button shows a loading/spinner state during the POST request', async () => {
    globalThis.fetch = createFetchMock({ totalPages: 1 }) as any;

    render(<ReportsList pdfExportEnabled={true} />);

    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    });

    // Click a download button
    const downloadButtons = screen.getAllByLabelText('Download PDF');
    expect(downloadButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(downloadButtons[0]);
    });

    // The spinner should appear (role="status" with aria-label="Loading")
    await waitFor(() => {
      const spinner = screen.queryByRole('status', { name: /loading/i });
      expect(spinner).toBeInTheDocument();
    });
  });
});
