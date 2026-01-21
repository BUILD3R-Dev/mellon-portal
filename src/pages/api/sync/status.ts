/**
 * GET /api/sync/status
 *
 * Returns the sync status for the authenticated tenant user.
 * Includes lastSyncAt timestamp, status, and isStale flag.
 * isStale is true if the last successful sync is older than 2 hours.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, syncRuns } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

interface SyncStatusData {
  lastSyncAt: string | null;
  status: 'success' | 'failed' | 'running' | null;
  isStale: boolean;
  recordsUpdated: number | null;
  errorMessage: string | null;
}

interface SyncStatusResponse {
  success: true;
  data: SyncStatusData;
}

interface SyncStatusErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

// Two hours in milliseconds
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: SyncStatusErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      const response: SyncStatusErrorResponse = {
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user memberships to determine tenant access
    const memberships = await getUserMemberships(session.userId);

    // Check if user is agency admin (they need a specific tenant context)
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    // Get tenant context from cookie
    const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

    // If no tenant context set, user cannot view sync status
    if (!tenantId) {
      const response: SyncStatusErrorResponse = {
        success: false,
        error: 'No tenant context selected',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this tenant (either agency admin or member)
    const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);

    if (!hasTenantAccess) {
      const response: SyncStatusErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query latest sync_run for current tenant
    const latestSyncRuns = await db
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.tenantId, tenantId))
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);

    const latestSync = latestSyncRuns[0] || null;

    // Calculate isStale flag
    let isStale = false;
    let lastSyncAt: string | null = null;

    if (latestSync) {
      // Use finishedAt for successful syncs, startedAt for running/failed
      const syncTime = latestSync.finishedAt || latestSync.startedAt;
      lastSyncAt = syncTime.toISOString();

      // Only check staleness for successful syncs
      if (latestSync.status === 'success' && latestSync.finishedAt) {
        const timeSinceSync = Date.now() - latestSync.finishedAt.getTime();
        isStale = timeSinceSync > STALE_THRESHOLD_MS;
      } else if (latestSync.status === 'failed') {
        // If last sync failed, consider data stale
        isStale = true;
      }
    } else {
      // No sync has ever run - data is stale
      isStale = true;
    }

    const statusData: SyncStatusData = {
      lastSyncAt,
      status: latestSync?.status || null,
      isStale,
      recordsUpdated: latestSync?.recordsUpdated || null,
      errorMessage: latestSync?.errorMessage || null,
    };

    const response: SyncStatusResponse = {
      success: true,
      data: statusData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    const response: SyncStatusErrorResponse = {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
