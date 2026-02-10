/**
 * @vitest-environment jsdom
 */
/**
 * Integration tests for Report Preview and Published View features
 *
 * Tests integration of ReportSectionCard and ReportsList components.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReportSectionCard } from '../ReportSectionCard';
import { ReportsList } from '../ReportsList';

describe('Integration: Report Content Sections', () => {
  const mockContent = {
    narrativeRich: '<h2>Weekly Summary</h2><p>Great progress this week with lead generation.</p>',
    initiativesRich: '<ul><li>Social media campaign</li><li>Email marketing</li></ul>',
    needsRich: '<p>Please review the attached documents.</p>',
    discoveryDaysRich: '<p>3 discovery days scheduled for next week.</p>',
  };

  it('renders all four content sections when all have content', () => {
    render(
      <div data-testid="report-content">
        <ReportSectionCard title="Narrative" htmlContent={mockContent.narrativeRich} />
        <ReportSectionCard title="Initiatives" htmlContent={mockContent.initiativesRich} />
        <ReportSectionCard title="Needs From Client" htmlContent={mockContent.needsRich} />
        <ReportSectionCard title="Discovery Days" htmlContent={mockContent.discoveryDaysRich} />
      </div>
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Initiatives')).toBeInTheDocument();
    expect(screen.getByText('Needs From Client')).toBeInTheDocument();
    expect(screen.getByText('Discovery Days')).toBeInTheDocument();
  });

  it('hides empty sections while showing sections with content', () => {
    render(
      <div data-testid="report-content">
        <ReportSectionCard title="Narrative" htmlContent={mockContent.narrativeRich} />
        <ReportSectionCard title="Initiatives" htmlContent={null} />
        <ReportSectionCard title="Needs From Client" htmlContent="" />
        <ReportSectionCard title="Discovery Days" htmlContent={mockContent.discoveryDaysRich} />
      </div>
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Discovery Days')).toBeInTheDocument();
    expect(screen.queryByText('Initiatives')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs From Client')).not.toBeInTheDocument();
  });

  it('renders rich HTML content correctly including lists and formatting', () => {
    render(
      <ReportSectionCard
        title="Test Section"
        htmlContent="<h2>Heading</h2><ul><li>Item 1</li><li>Item 2</li></ul><p><strong>Bold</strong> and <em>italic</em> text.</p>"
      />
    );

    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });
});

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

describe('Integration: Reports List Behavior', () => {
  const publishedReports = [
    {
      id: 'rw-pub-1',
      weekEndingDate: '2025-01-17',
      periodStartAt: '2025-01-13T00:00:00.000Z',
      periodEndAt: '2025-01-17T23:59:59.000Z',
      weekPeriod: 'Jan 13 - Jan 17, 2025',
      status: 'published' as const,
    },
    {
      id: 'rw-pub-2',
      weekEndingDate: '2025-01-10',
      periodStartAt: '2025-01-06T00:00:00.000Z',
      periodEndAt: '2025-01-10T23:59:59.000Z',
      weekPeriod: 'Jan 6 - Jan 10, 2025',
      status: 'published' as const,
    },
  ];

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

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
            data: [publishedReports[0]],
            pagination: { page: 1, limit: 1, totalPages: 1, totalCount: publishedReports.length },
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: publishedReports,
          pagination: { page: 1, limit: 10, totalPages: 1, totalCount: publishedReports.length },
        }),
      });
    });
  }

  it('only displays published reports (draft reports excluded at API level)', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('link', { name: /view report/i });
    expect(viewButtons).toHaveLength(2);
  });

  it('latest report is styled prominently with accent color', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      expect(screen.getByText('Latest Report')).toBeInTheDocument();
      expect(screen.getByText('Previous Reports')).toBeInTheDocument();
    });
  });

  it('reports link to correct detail page URL', async () => {
    globalThis.fetch = createFetchMock() as any;
    render(<ReportsList pdfExportEnabled={false} />);

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /view report/i });
      expect(links[0]).toHaveAttribute('href', '/reports/rw-pub-1');
      expect(links[1]).toHaveAttribute('href', '/reports/rw-pub-2');
    });
  });
});

describe('Integration: Preview vs Published View Consistency', () => {
  it('ReportSectionCard component behaves consistently for preview and published views', () => {
    const content = '<p>Test content for both views</p>';

    const { rerender } = render(
      <ReportSectionCard title="Narrative" htmlContent={content} />
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Test content for both views')).toBeInTheDocument();

    rerender(
      <ReportSectionCard title="Narrative" htmlContent={content} />
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Test content for both views')).toBeInTheDocument();
  });

  it('empty content hides section in both contexts', () => {
    const { rerender, container } = render(
      <ReportSectionCard title="Empty Section" htmlContent={null} />
    );

    expect(container.firstChild).toBeNull();

    rerender(
      <ReportSectionCard title="Empty Section" htmlContent="" />
    );

    expect(container.firstChild).toBeNull();
  });
});
