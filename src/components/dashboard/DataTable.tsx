/**
 * DataTable component
 *
 * A reusable table component for displaying tabular data.
 * Supports custom column rendering and status badges.
 */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface DataTableColumn {
  /** Column key that maps to data property */
  key: string;
  /** Column header label */
  label: string;
  /** Optional custom render function */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  /** Optional text alignment */
  align?: 'left' | 'center' | 'right';
  /** Optional column width */
  width?: string;
}

export interface DataTableProps {
  /** Column definitions */
  columns: DataTableColumn[];
  /** Data rows */
  data: Record<string, unknown>[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders a status badge with appropriate styling based on value
 */
export function StatusBadge({ value }: { value: string }) {
  const statusColors: Record<string, string> = {
    qualified: 'bg-green-100 text-green-800',
    contacted: 'bg-blue-100 text-blue-800',
    new: 'bg-gray-100 text-gray-800',
    hot: 'bg-red-100 text-red-800',
    warm: 'bg-amber-100 text-amber-800',
    cold: 'bg-sky-100 text-sky-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const colorClass = statusColors[value.toLowerCase()] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass
      )}
    >
      {value}
    </span>
  );
}

/**
 * DataTable renders a table with headers and data rows.
 */
export function DataTable({
  columns,
  data,
  loading,
  emptyMessage = 'No data available',
  className,
}: DataTableProps) {
  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.align !== 'center' && column.align !== 'right' && 'text-left'
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column) => {
                  const value = row[column.key];
                  const renderedValue = column.render
                    ? column.render(value, row)
                    : String(value ?? '');

                  return (
                    <td
                      key={column.key}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderedValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
