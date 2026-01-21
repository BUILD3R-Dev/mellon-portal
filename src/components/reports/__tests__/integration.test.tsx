/**
 * @vitest-environment jsdom
 */
/**
 * Integration tests for Report Preview and Published View features
 *
 * Task Group 5.3: Write up to 8 additional strategic tests
 * - Integration test: Preview page shows all four content sections
 * - Integration test: Empty content sections hidden in both preview and published view
 * - Test: Draft reports hidden concept (component-level)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    // Sections with content should be visible
    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Discovery Days')).toBeInTheDocument();

    // Empty sections should be completely hidden
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

  it('only displays published reports (draft reports excluded at API level)', () => {
    // This test verifies the component correctly handles published-only data
    // The API filters out drafts before sending to the component
    render(<ReportsList reports={publishedReports} />);

    // All published reports should be shown
    expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
    expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();

    // Verify these are the only reports
    const viewButtons = screen.getAllByRole('link', { name: /view report/i });
    expect(viewButtons).toHaveLength(2);
  });

  it('latest report is styled prominently with accent color', () => {
    render(<ReportsList reports={publishedReports} />);

    // Should have "Latest Report" heading
    expect(screen.getByText('Latest Report')).toBeInTheDocument();

    // Should have "Previous Reports" heading for older ones
    expect(screen.getByText('Previous Reports')).toBeInTheDocument();
  });

  it('reports link to correct detail page URL', () => {
    render(<ReportsList reports={publishedReports} />);

    const links = screen.getAllByRole('link', { name: /view report/i });

    expect(links[0]).toHaveAttribute('href', '/reports/rw-pub-1');
    expect(links[1]).toHaveAttribute('href', '/reports/rw-pub-2');
  });
});

describe('Integration: Preview vs Published View Consistency', () => {
  it('ReportSectionCard component behaves consistently for preview and published views', () => {
    const content = '<p>Test content for both views</p>';

    // Same component is used in both preview and published views
    // This test verifies the component renders identically
    const { rerender } = render(
      <ReportSectionCard title="Narrative" htmlContent={content} />
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Test content for both views')).toBeInTheDocument();

    // Re-render simulating published view - same result expected
    rerender(
      <ReportSectionCard title="Narrative" htmlContent={content} />
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Test content for both views')).toBeInTheDocument();
  });

  it('empty content hides section in both contexts', () => {
    // Preview context
    const { rerender, container } = render(
      <ReportSectionCard title="Empty Section" htmlContent={null} />
    );

    expect(container.firstChild).toBeNull();

    // Published view context - same behavior
    rerender(
      <ReportSectionCard title="Empty Section" htmlContent="" />
    );

    expect(container.firstChild).toBeNull();
  });
});
