/**
 * SyncStatusBanner component
 *
 * Displays the data sync status with freshness indicator.
 * Shows yellow/amber warning banner if data is stale (> 2 hours old).
 * Fetches sync status from API on mount.
 */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface SyncStatusData {
  lastSyncAt: string | null;
  status: 'success' | 'failed' | 'running' | null;
  isStale: boolean;
  recordsUpdated: number | null;
  errorMessage: string | null;
}

interface SyncStatusBannerProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats the time difference in a human-readable format
 */
function formatTimeDifference(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

/**
 * Formats the stale data warning message
 */
function formatStaleWarning(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Data may be stale - sync may be delayed';
  }
  return `Data is ${diffHours} hour${diffHours === 1 ? '' : 's'} old - sync may be delayed`;
}

export function SyncStatusBanner({ className }: SyncStatusBannerProps) {
  const [syncData, setSyncData] = React.useState<SyncStatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchSyncStatus() {
      try {
        const response = await fetch('/api/sync/status');
        const result = await response.json();

        if (result.success) {
          setSyncData(result.data);
        } else {
          setError(result.error || 'Failed to fetch sync status');
        }
      } catch (err) {
        setError('Failed to fetch sync status');
      } finally {
        setLoading(false);
      }
    }

    fetchSyncStatus();
  }, []);

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-lg px-4 py-3 flex items-center gap-3 border',
          className
        )}
        style={{
          backgroundColor: 'var(--background-secondary, #F9FAFB)',
          borderColor: 'var(--border, #E5E7EB)',
        }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
        <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Loading sync status...</p>
      </div>
    );
  }

  if (error || !syncData) {
    return (
      <div
        className={cn(
          'rounded-lg px-4 py-3 flex items-center gap-3 border',
          className
        )}
        style={{
          backgroundColor: 'var(--background-secondary, #F9FAFB)',
          borderColor: 'var(--border, #E5E7EB)',
        }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--foreground-muted, #9CA3AF)' }} />
        <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Sync status unavailable</p>
      </div>
    );
  }

  // Stale data - show amber/yellow warning
  if (syncData.isStale) {
    return (
      <div
        className={cn(
          'rounded-lg px-4 py-3 flex items-center gap-3 bg-amber-50 border border-amber-200',
          className
        )}
      >
        <div className="w-2 h-2 bg-amber-500 rounded-full" />
        <p className="text-sm text-amber-800">
          {syncData.lastSyncAt ? formatStaleWarning(syncData.lastSyncAt) : 'No sync data available - sync may be delayed'}
        </p>
      </div>
    );
  }

  // Running sync
  if (syncData.status === 'running') {
    return (
      <div
        className={cn(
          'rounded-lg px-4 py-3 flex items-center gap-3 border',
          className
        )}
        style={{
          backgroundColor: 'var(--card-background, #FFFFFF)',
          borderColor: 'var(--accent-color, #2563EB)',
        }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-color, #2563EB)' }} />
        <p className="text-sm" style={{ color: 'var(--accent-color, #2563EB)' }}>Sync in progress...</p>
      </div>
    );
  }

  // Fresh data - show green indicator
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 flex items-center gap-3 border',
        className
      )}
      style={{
        backgroundColor: 'var(--card-background, #FFFFFF)',
        borderColor: 'var(--accent-color, #2563EB)',
      }}
    >
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <p className="text-sm" style={{ color: 'var(--accent-color, #2563EB)' }}>
        Data last synced:{' '}
        <span className="font-medium">
          {syncData.lastSyncAt ? formatTimeDifference(syncData.lastSyncAt) : 'Never'}
        </span>
      </p>
    </div>
  );
}
