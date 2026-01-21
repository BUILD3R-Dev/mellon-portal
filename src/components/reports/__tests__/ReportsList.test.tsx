/**
 * @vitest-environment jsdom
 */
/**
 * Tests for ReportsList component
 *
 * Task Group 3.1: Write 4-5 focused tests for reports list
 * - Test reports list page renders "Latest Report" prominently
 * - Test reports list orders by weekEndingDate descending
 * - Test reports list links to individual report view
 * - Test empty state message when no reports
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsList } from '../ReportsList';

describe('ReportsList', () => {
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

  it('renders "Latest Report" prominently at the top', () => {
    render(<ReportsList reports={mockReports} />);

    // Find the "Latest Report" heading
    expect(screen.getByText('Latest Report')).toBeInTheDocument();

    // The latest report (Jan 13-17) should be highlighted
    expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
  });

  it('displays reports in descending chronological order', () => {
    render(<ReportsList reports={mockReports} />);

    // Get all report links
    const reportLinks = screen.getAllByRole('link', { name: /view report/i });

    // First report link should be for the latest report (rw-1)
    expect(reportLinks[0]).toHaveAttribute('href', '/reports/rw-1');

    // Second link for rw-2
    expect(reportLinks[1]).toHaveAttribute('href', '/reports/rw-2');

    // Third link for rw-3
    expect(reportLinks[2]).toHaveAttribute('href', '/reports/rw-3');
  });

  it('links each report to individual report view', () => {
    render(<ReportsList reports={mockReports} />);

    // Check that links go to /reports/[reportWeekId]
    const reportLinks = screen.getAllByRole('link', { name: /view report/i });

    reportLinks.forEach((link, index) => {
      expect(link).toHaveAttribute('href', `/reports/${mockReports[index].id}`);
    });
  });

  it('shows empty state message when no reports', () => {
    render(<ReportsList reports={[]} />);

    expect(screen.getByText(/no published reports yet/i)).toBeInTheDocument();
  });

  it('shows week period dates for each report', () => {
    render(<ReportsList reports={mockReports} />);

    expect(screen.getByText('Jan 13 - Jan 17, 2025')).toBeInTheDocument();
    expect(screen.getByText('Jan 6 - Jan 10, 2025')).toBeInTheDocument();
    expect(screen.getByText('Dec 30 - Jan 3, 2025')).toBeInTheDocument();
  });
});
