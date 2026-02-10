/**
 * ReportsList component
 *
 * Displays a paginated list of published reports for tenant users.
 * Features the "Latest Report" prominently at the top with highlighted styling.
 * Includes year/month filter dropdowns and optional PDF download buttons.
 * Fetches data client-side from GET /api/reports with pagination.
 */
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

export interface Report {
  id: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
}

export interface ReportsListProps {
  /** Whether PDF export feature is enabled for this tenant */
  pdfExportEnabled: boolean;
  /** Optional initial reports for SSR hydration */
  initialReports?: Report[];
  /** Additional CSS classes */
  className?: string;
}

const MONTH_NAMES = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function ReportsList({ pdfExportEnabled, initialReports, className }: ReportsListProps) {
  const [reports, setReports] = React.useState<Report[]>(initialReports || []);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [year, setYear] = React.useState<number | null>(null);
  const [month, setMonth] = React.useState<number | null>(null);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  const [latestReport, setLatestReport] = React.useState<Report | null>(null);
  const [downloadingIds, setDownloadingIds] = React.useState<Set<string>>(new Set());

  // Fetch available years on mount
  React.useEffect(() => {
    async function fetchYears() {
      try {
        const res = await fetch('/api/reports/available-years');
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.years)) {
          setAvailableYears(json.data.years);
        }
      } catch {
        // Silently fail; dropdown will show "All Years" only
      }
    }
    fetchYears();
  }, []);

  // Fetch the latest report (page 1, no filters) on mount for the prominent card
  React.useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch('/api/reports?page=1&limit=1');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setLatestReport(json.data[0]);
        }
      } catch {
        // Silently fail
      }
    }
    fetchLatest();
  }, []);

  // Fetch reports when page, year, or month changes
  React.useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '10');
        if (year !== null) {
          params.set('year', String(year));
        }
        if (month !== null) {
          params.set('month', String(month));
        }
        const res = await fetch(`/api/reports?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setReports(Array.isArray(json.data) ? json.data : []);
          setTotalPages(json.pagination?.totalPages ?? 1);
        }
      } catch {
        setReports([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [page, year, month]);

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setYear(val === '' ? null : parseInt(val, 10));
    setPage(1);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setMonth(val === '' ? null : parseInt(val, 10));
    setPage(1);
  }

  async function handleDownloadPdf(reportId: string) {
    setDownloadingIds((prev) => new Set(prev).add(reportId));
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.downloadUrl) {
        // Trigger browser download
        const link = document.createElement('a');
        link.href = json.data.downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Silently fail
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  }

  const hasFilters = year !== null || month !== null;
  const showLatestCard = latestReport && !hasFilters && page === 1;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3" role="group" aria-label="Report filters">
        <select
          value={year === null ? '' : String(year)}
          onChange={handleYearChange}
          aria-label="Filter by year"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month === null ? '' : String(month)}
          onChange={handleMonthChange}
          aria-label="Filter by month"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Months</option>
          {MONTH_NAMES.map((m) => (
            <option key={m.value} value={String(m.value)}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500">No published reports yet</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <>
          {/* Latest Report - Prominent Display (only on page 1 with no filters) */}
          {showLatestCard && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">Latest Report</h2>
              <Card
                className="border-2 transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--accent-color, #2563EB)' }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{latestReport.weekPeriod}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      Week ending {formatWeekEndingDate(latestReport.weekEndingDate)}
                    </span>
                    <div className="flex items-center gap-2">
                      {pdfExportEnabled && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(latestReport.id)}
                          disabled={downloadingIds.has(latestReport.id)}
                          aria-label="Download PDF"
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {downloadingIds.has(latestReport.id) ? (
                            <LoadingSpinner />
                          ) : (
                            <DownloadIcon />
                          )}
                        </button>
                      )}
                      <a
                        href={`/reports/${latestReport.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'var(--accent-color, #2563EB)',
                          color: 'var(--accent-text, #FFFFFF)',
                        }}
                      >
                        View Report
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {showLatestCard ? 'Previous Reports' : 'Reports'}
            </h2>
            <div className="space-y-2">
              {reports
                .filter((report) => !(showLatestCard && report.id === latestReport?.id))
                .map((report) => (
                  <Card key={report.id} className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{report.weekPeriod}</p>
                          <p className="text-sm text-gray-500">
                            Week ending {formatWeekEndingDate(report.weekEndingDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pdfExportEnabled && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(report.id)}
                              disabled={downloadingIds.has(report.id)}
                              aria-label="Download PDF"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              {downloadingIds.has(report.id) ? (
                                <LoadingSpinner />
                              ) : (
                                <DownloadIcon />
                              )}
                            </button>
                          )}
                          <a
                            href={`/reports/${report.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View Report
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** SVG download icon */
function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

/** Loading spinner for download state */
function LoadingSpinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/** Formats a week ending date string (YYYY-MM-DD) for display */
function formatWeekEndingDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
