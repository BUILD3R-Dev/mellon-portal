import type { APIRoute } from 'astro';
import {
  validateSession,
  SESSION_COOKIE_NAME,
  getUserMemberships,
  requireTenantAdmin,
  createUnauthorizedResponse,
} from '@/lib/auth';
import { db, users, memberships } from '@/lib/db';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface UsersResponse {
  success: true;
  data: TenantUser[];
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * GET /api/tenants/[id]/users
 *
 * Returns list of users for a tenant.
 * Requires Tenant Admin or Agency Admin role.
 *
 * Query parameters:
 * - status: 'active' | 'inactive' | 'pending' (optional filter)
 * - search: string (optional search by name/email)
 *
 * Response:
 * - 200: Array of tenant users
 * - 401: Unauthorized
 * - 403: Forbidden (not authorized for this tenant)
 * - 404: Tenant not found
 */
export const GET: APIRoute = async ({ cookies, params, url }) => {
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

    // Get tenant ID from params
    const tenantId = params.id;
    if (!tenantId) {
      const response: ErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check authorization - requires Tenant Admin or Agency Admin
    const userMemberships = await getUserMemberships(session.userId);
    const authResult = requireTenantAdmin(userMemberships, tenantId);

    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    // Parse query parameters
    const statusFilter = url.searchParams.get('status');
    const searchQuery = url.searchParams.get('search');

    // Build query
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: memberships.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId));

    // Execute base query
    let results = await query;

    // Apply status filter in JS (Drizzle ORM complexity)
    if (statusFilter && ['active', 'inactive', 'pending'].includes(statusFilter)) {
      results = results.filter((r) => r.status === statusFilter);
    }

    // Apply search filter in JS
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.email.toLowerCase().includes(search) ||
          (r.name && r.name.toLowerCase().includes(search))
      );
    }

    // Transform and sort results
    const tenantUsers: TenantUser[] = results
      .map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));

    const response: UsersResponse = {
      success: true,
      data: tenantUsers,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
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
