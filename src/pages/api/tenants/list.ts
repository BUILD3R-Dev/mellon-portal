import type { APIRoute } from 'astro';
import {
  validateSession,
  SESSION_COOKIE_NAME,
  getUserMemberships,
  createUnauthorizedResponse,
} from '@/lib/auth';
import { db, tenants, memberships } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';

interface TenantListItem {
  id: string;
  name: string;
  status: string;
}

interface TenantListResponse {
  success: true;
  data: TenantListItem[];
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * GET /api/tenants/list
 *
 * Returns list of tenants the current user has access to.
 * For Agency Admins: returns all active tenants
 * For Tenant users: returns only their assigned tenants
 *
 * Query parameters:
 * - status: 'active' | 'all' (default: 'active')
 *
 * Response:
 * - 200: Array of tenant summaries
 * - 401: Unauthorized
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return createUnauthorizedResponse();
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return createUnauthorizedResponse('Invalid or expired session');
    }

    // Get user memberships
    const userMemberships = await getUserMemberships(session.userId);

    // Check if user is agency admin
    const isAgencyAdmin = userMemberships.some(
      (m) => m.role === 'agency_admin' && m.tenantId === null
    );

    // Parse query parameters
    const statusFilter = url.searchParams.get('status') || 'active';

    let tenantsList: TenantListItem[];

    if (isAgencyAdmin) {
      // Agency admins can see all tenants
      let query = db
        .select({
          id: tenants.id,
          name: tenants.name,
          status: tenants.status,
        })
        .from(tenants);

      const results =
        statusFilter === 'active'
          ? await query.where(eq(tenants.status, 'active'))
          : await query;

      tenantsList = results
        .map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Non-agency users can only see their assigned tenants
      const userTenantIds = userMemberships
        .filter((m) => m.tenantId !== null)
        .map((m) => m.tenantId as string);

      if (userTenantIds.length === 0) {
        tenantsList = [];
      } else {
        const results = await db
          .select({
            id: tenants.id,
            name: tenants.name,
            status: tenants.status,
          })
          .from(tenants)
          .where(
            statusFilter === 'active'
              ? and(inArray(tenants.id, userTenantIds), eq(tenants.status, 'active'))
              : inArray(tenants.id, userTenantIds)
          );

        tenantsList = results
          .map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    const response: TenantListResponse = {
      success: true,
      data: tenantsList,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching tenant list:', error);
    const response: ErrorResponse = {
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
