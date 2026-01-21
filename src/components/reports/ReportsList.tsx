/**
 * ReportsList component
 *
 * Displays a list of published reports for tenant users.
 * Features the "Latest Report" prominently at the top with highlighted styling.
 * Reports are ordered by weekEndingDate descending.
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
  /** Array of reports to display */
  reports: Report[];
  /** Additional CSS classes */
  className?: string;
}

export function ReportsList({ reports, className }: ReportsListProps) {
  // Reports should already be sorted descending by weekEndingDate from the API
  const latestReport = reports[0];
  const olderReports = reports.slice(1);

  if (reports.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
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
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Latest Report - Prominent Display */}
      {latestReport && (
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Week ending {formatWeekEndingDate(latestReport.weekEndingDate)}
                </span>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Previous Reports */}
      {olderReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Previous Reports</h2>
          <div className="space-y-2">
            {olderReports.map((report) => (
              <Card
                key={report.id}
                className="transition-shadow hover:shadow-sm"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{report.weekPeriod}</p>
                      <p className="text-sm text-gray-500">
                        Week ending {formatWeekEndingDate(report.weekEndingDate)}
                      </p>
                    </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Formats a week ending date string (YYYY-MM-DD) for display
 */
function formatWeekEndingDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
