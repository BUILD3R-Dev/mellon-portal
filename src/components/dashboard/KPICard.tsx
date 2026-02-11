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
        'rounded-xl border p-6',
        className
      )}
      style={{
        backgroundColor: 'var(--card-background, #FFFFFF)',
        borderColor: 'var(--card-border, #E5E7EB)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
      ) : (
        <p className="mt-2 text-3xl font-semibold" style={{ color: 'var(--foreground, #111827)' }}>{value}</p>
      )}
      {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{subtitle}</p>}
    </div>
  );
}
