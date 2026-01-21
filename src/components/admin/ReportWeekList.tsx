import * as React from 'react';
import { ReportWeekModal } from './ReportWeekModal';
import { PublishConfirmDialog } from './PublishConfirmDialog';
import { UnpublishConfirmDialog } from './UnpublishConfirmDialog';
import { DeleteReportWeekDialog } from './DeleteReportWeekDialog';

interface ReportWeek {
  id: string;
  tenantId: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportWeekListProps {
  tenantId: string;
  tenantName: string;
  tenantTimezone: string;
  initialReportWeeks: ReportWeek[];
}

type SortField = 'weekEndingDate' | 'status' | 'publishedAt';
type SortDirection = 'asc' | 'desc';

/**
 * Status badge component for report week status
 */
function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Formats date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Sort indicator component
 */
function SortIndicator({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  if (field !== currentField) {
    return (
      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Get available years from report weeks for filter dropdown
 */
function getAvailableYears(reportWeeks: ReportWeek[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  reportWeeks.forEach((rw) => {
    const year = new Date(rw.weekEndingDate + 'T12:00:00Z').getUTCFullYear();
    years.add(year);
  });

  return Array.from(years).sort((a, b) => b - a);
}

export function ReportWeekList({
  tenantId,
  tenantName,
  tenantTimezone,
  initialReportWeeks,
}: ReportWeekListProps) {
  const [reportWeeks, setReportWeeks] = React.useState<ReportWeek[]>(initialReportWeeks);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingReportWeek, setEditingReportWeek] = React.useState<ReportWeek | null>(null);
  const [publishingReportWeek, setPublishingReportWeek] = React.useState<ReportWeek | null>(null);
  const [unpublishingReportWeek, setUnpublishingReportWeek] = React.useState<ReportWeek | null>(
    null
  );
  const [deletingReportWeek, setDeletingReportWeek] = React.useState<ReportWeek | null>(null);

  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isUnpublishing, setIsUnpublishing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [notification, setNotification] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'draft' | 'published'>('all');
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = React.useState<SortField>('weekEndingDate');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const availableYears = React.useMemo(() => getAvailableYears(reportWeeks), [reportWeeks]);

  // Filter and sort report weeks
  const filteredReportWeeks = React.useMemo(() => {
    let result = [...reportWeeks];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((rw) => rw.status === statusFilter);
    }

    // Apply year filter
    if (yearFilter !== 'all') {
      const year = parseInt(yearFilter, 10);
      result = result.filter((rw) => {
        const rwYear = new Date(rw.weekEndingDate + 'T12:00:00Z').getUTCFullYear();
        return rwYear === year;
      });
    }

    // Apply month filter
    if (monthFilter !== 'all') {
      const month = parseInt(monthFilter, 10);
      result = result.filter((rw) => {
        const rwMonth = new Date(rw.weekEndingDate + 'T12:00:00Z').getUTCMonth() + 1;
        return rwMonth === month;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'weekEndingDate':
          comparison =
            new Date(a.weekEndingDate).getTime() - new Date(b.weekEndingDate).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'publishedAt':
          const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [reportWeeks, statusFilter, yearFilter, monthFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCreateSuccess = (data: ReportWeek) => {
    setReportWeeks((prev) =>
      [...prev, data].sort(
        (a, b) => new Date(b.weekEndingDate).getTime() - new Date(a.weekEndingDate).getTime()
      )
    );
    setNotification({
      type: 'success',
      message: `Report week for ${data.weekPeriod} created successfully`,
    });
  };

  const handleEditSuccess = (data: ReportWeek) => {
    setReportWeeks((prev) =>
      prev
        .map((rw) => (rw.id === data.id ? data : rw))
        .sort(
          (a, b) => new Date(b.weekEndingDate).getTime() - new Date(a.weekEndingDate).getTime()
        )
    );
    setNotification({
      type: 'success',
      message: `Report week updated successfully`,
    });
  };

  const handlePublish = async () => {
    if (!publishingReportWeek) return;

    setIsPublishing(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/report-weeks/${publishingReportWeek.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'published' }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to publish report week',
        });
        return;
      }

      setReportWeeks((prev) => prev.map((rw) => (rw.id === data.data.id ? data.data : rw)));

      setNotification({
        type: 'success',
        message: `Report week published successfully`,
      });
    } catch (error) {
      console.error('Publish error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to publish report week. Please try again.',
      });
    } finally {
      setIsPublishing(false);
      setPublishingReportWeek(null);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishingReportWeek) return;

    setIsUnpublishing(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/report-weeks/${unpublishingReportWeek.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'draft' }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to unpublish report week',
        });
        return;
      }

      setReportWeeks((prev) => prev.map((rw) => (rw.id === data.data.id ? data.data : rw)));

      setNotification({
        type: 'success',
        message: `Report week unpublished successfully`,
      });
    } catch (error) {
      console.error('Unpublish error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to unpublish report week. Please try again.',
      });
    } finally {
      setIsUnpublishing(false);
      setUnpublishingReportWeek(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingReportWeek) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/report-weeks/${deletingReportWeek.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to delete report week',
        });
        return;
      }

      setReportWeeks((prev) => prev.filter((rw) => rw.id !== deletingReportWeek.id));

      setNotification({
        type: 'success',
        message: `Report week deleted successfully`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete report week. Please try again.',
      });
    } finally {
      setIsDeleting(false);
      setDeletingReportWeek(null);
    }
  };

  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Report Weeks</h2>
          <p className="text-sm text-gray-500">Manage weekly reporting periods for {tenantName}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Report Week
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-40">
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="sm:w-32">
          <label htmlFor="year-filter" className="sr-only">
            Filter by year
          </label>
          <select
            id="year-filter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="all">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-40">
          <label htmlFor="month-filter" className="sr-only">
            Filter by month
          </label>
          <select
            id="month-filter"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="all">All Months</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm">{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Report Weeks Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('weekEndingDate')}
                >
                  <div className="flex items-center gap-2">
                    Week Ending
                    <SortIndicator
                      field="weekEndingDate"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Week Period
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIndicator
                      field="status"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('publishedAt')}
                >
                  <div className="flex items-center gap-2">
                    Published
                    <SortIndicator
                      field="publishedAt"
                      currentField={sortField}
                      direction={sortDirection}
                    />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReportWeeks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-12 h-12 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {statusFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all' ? (
                        <>
                          <p className="text-gray-900 font-medium">
                            No report weeks match your filters
                          </p>
                          <p className="text-sm">Try adjusting your filter criteria</p>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('all');
                              setYearFilter('all');
                              setMonthFilter('all');
                            }}
                            className="mt-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            Clear filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-900 font-medium">No report weeks yet</p>
                          <p className="text-sm">
                            Get started by creating your first report week for this tenant
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            Create your first report week
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReportWeeks.map((reportWeek) => (
                  <tr key={reportWeek.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(reportWeek.weekEndingDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{reportWeek.weekPeriod}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={reportWeek.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(reportWeek.publishedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Content button - available for both draft and published */}
                        <a
                          href={`/admin/tenants/${tenantId}/report-weeks/${reportWeek.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
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
                          {reportWeek.status === 'published' ? 'View Content' : 'Edit Content'}
                        </a>

                        {reportWeek.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingReportWeek(reportWeek)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit Dates
                            </button>
                            <button
                              type="button"
                              onClick={() => setPublishingReportWeek(reportWeek)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Publish
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingReportWeek(reportWeek)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                        {reportWeek.status === 'published' && (
                          <button
                            type="button"
                            onClick={() => setUnpublishingReportWeek(reportWeek)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results summary */}
      {reportWeeks.length > 0 && (
        <p className="text-sm text-gray-500">
          Showing {filteredReportWeeks.length} of {reportWeeks.length} report week
          {reportWeeks.length !== 1 ? 's' : ''}
          {(statusFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all') &&
            ' (filtered)'}
        </p>
      )}

      {/* Create Modal */}
      <ReportWeekModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        mode="create"
        tenantId={tenantId}
        tenantTimezone={tenantTimezone}
      />

      {/* Edit Modal */}
      {editingReportWeek && (
        <ReportWeekModal
          isOpen={true}
          onClose={() => setEditingReportWeek(null)}
          onSuccess={handleEditSuccess}
          mode="edit"
          tenantId={tenantId}
          tenantTimezone={tenantTimezone}
          reportWeek={editingReportWeek}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <PublishConfirmDialog
        isOpen={!!publishingReportWeek}
        onClose={() => setPublishingReportWeek(null)}
        onConfirm={handlePublish}
        weekPeriod={publishingReportWeek?.weekPeriod || ''}
        isLoading={isPublishing}
      />

      {/* Unpublish Confirmation Dialog */}
      <UnpublishConfirmDialog
        isOpen={!!unpublishingReportWeek}
        onClose={() => setUnpublishingReportWeek(null)}
        onConfirm={handleUnpublish}
        weekPeriod={unpublishingReportWeek?.weekPeriod || ''}
        isLoading={isUnpublishing}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteReportWeekDialog
        isOpen={!!deletingReportWeek}
        onClose={() => setDeletingReportWeek(null)}
        onConfirm={handleDelete}
        weekPeriod={deletingReportWeek?.weekPeriod || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}
