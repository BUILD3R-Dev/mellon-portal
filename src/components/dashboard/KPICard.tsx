/**
 * KPICard component
 *
 * A reusable card component for displaying KPI metrics.
 * Used across dashboard pages for consistent metric display.
 */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface KPICardProps {
  /** The metric label */
  label: string;
  /** The metric value (formatted string) */
  value: string;
  /** Optional subtitle below the value */
  subtitle?: string;
  /** Whether the card is in loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * KPICard renders a metric card with label, value, and optional subtitle.
 * Follows the styling pattern from dashboard.astro KPI cards.
 */
export function KPICard({ label, value, subtitle, loading, className }: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6',
        className
      )}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      )}
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
