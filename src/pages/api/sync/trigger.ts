/**
 * POST /api/sync/trigger
 *
 * Triggers an immediate sync for the current tenant.
 * Only accessible by agency admins.
 * Runs the sync in the request lifecycle and returns results.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, tenants } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { syncTenant, createSyncRun, updateSyncRunStatus } from '../../../../worker/sync';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Require agency admin
    const memberships = await getUserMemberships(session.userId);
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    if (!isAgencyAdmin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only agency administrators can trigger syncs',
        code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Get tenant context
    const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;
    if (!tenantId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No tenant context selected',
        code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch tenant with CT credentials
    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        clienttetherWebKey: tenants.clienttetherWebKey,
        clienttetherAccessToken: tenants.clienttetherAccessToken,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenantRows.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const tenant = tenantRows[0];

    if (!tenant.clienttetherWebKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tenant does not have ClientTether credentials configured. Set them in the Edit Tenant form.',
        code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Create sync run record
    const syncRun = await createSyncRun(db as any, tenantId);

    // Run the sync
    try {
      const recordsUpdated = await syncTenant(db as any, {
        id: tenant.id,
        name: tenant.name,
        clienttetherWebKey: tenant.clienttetherWebKey,
        clienttetherAccessToken: tenant.clienttetherAccessToken,
      });

      await updateSyncRunStatus(db as any, syncRun.id, 'success', { recordsUpdated });

      return new Response(JSON.stringify({
        success: true,
        data: {
          syncRunId: syncRun.id,
          recordsUpdated,
          status: 'success',
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (syncError: any) {
      await updateSyncRunStatus(db as any, syncRun.id, 'failed', { errorMessage: syncError.message });

      return new Response(JSON.stringify({
        success: false,
        error: `Sync failed: ${syncError.message}`,
        code: 'SYNC_ERROR',
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
