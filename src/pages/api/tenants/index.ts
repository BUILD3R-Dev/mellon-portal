import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants, tenantBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface TenantData {
  id: string;
  name: string;
  status: string;
  timezone: string;
  createdAt: string;
  branding: {
    id: string;
    themeId: string;
    accentColorOverride: string | null;
    tenantLogoUrl: string | null;
  } | null;
}

interface TenantListResponse {
  success: true;
  data: TenantData[];
}

interface TenantCreateResponse {
  success: true;
  data: TenantData;
}

interface TenantErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Validates agency admin authorization
 */
async function validateAgencyAdmin(cookies: any): Promise<{ isAuthorized: boolean; userId?: string; errorResponse?: Response }> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const response: TenantErrorResponse = {
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    const response: TenantErrorResponse = {
      success: false,
      error: 'Invalid or expired session',
      code: 'UNAUTHORIZED',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const userMemberships = await getUserMemberships(session.userId);
  const isAgencyAdmin = userMemberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

  if (!isAgencyAdmin) {
    const response: TenantErrorResponse = {
      success: false,
      error: 'Only agency administrators can access this resource',
      code: 'FORBIDDEN',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { isAuthorized: true, userId: session.userId };
}

/**
 * GET /api/tenants
 *
 * Returns list of all tenants with branding data. Only accessible by agency admins.
 *
 * Query parameters:
 * - status: 'active' | 'inactive' | 'suspended' (optional filter)
 *
 * Response:
 * - 200: List of tenants
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    // Get optional status filter from query params
    const statusFilter = url.searchParams.get('status');
    const validStatuses = ['active', 'inactive', 'suspended'];

    // Build base query
    const baseQuery = db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        brandingId: tenantBranding.id,
        themeId: tenantBranding.themeId,
        accentColorOverride: tenantBranding.accentColorOverride,
        tenantLogoUrl: tenantBranding.tenantLogoUrl,
      })
      .from(tenants)
      .leftJoin(tenantBranding, eq(tenants.id, tenantBranding.tenantId));

    // Execute query with optional status filter
    let allTenants;
    if (statusFilter && validStatuses.includes(statusFilter)) {
      allTenants = await baseQuery
        .where(eq(tenants.status, statusFilter as 'active' | 'inactive' | 'suspended'))
        .orderBy(tenants.name);
    } else {
      allTenants = await baseQuery.orderBy(tenants.name);
    }

    const tenantsData: TenantData[] = allTenants.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      timezone: t.timezone,
      createdAt: t.createdAt.toISOString(),
      branding: t.brandingId
        ? {
            id: t.brandingId,
            themeId: t.themeId || 'light',
            accentColorOverride: t.accentColorOverride,
            tenantLogoUrl: t.tenantLogoUrl,
          }
        : null,
    }));

    const response: TenantListResponse = {
      success: true,
      data: tenantsData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    const response: TenantErrorResponse = {
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

/**
 * POST /api/tenants
 *
 * Creates a new tenant with initial branding record. Only accessible by agency admins.
 *
 * Request body:
 * - name: string (required, max 255 chars)
 * - timezone: string (optional, default: 'America/New_York')
 * - status: 'active' | 'inactive' (optional, default: 'active')
 *
 * Response:
 * - 201: Created tenant with branding
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    // Parse request body
    const body = await request.json();
    const { name, timezone = 'America/New_York', status = 'active' } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Name is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (name.length > 255) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Name must be 255 characters or less',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Invalid status value',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: name.trim(),
        timezone,
        status,
      })
      .returning();

    // Create default branding record
    const [newBranding] = await db
      .insert(tenantBranding)
      .values({
        tenantId: newTenant.id,
        themeId: 'light',
        accentColorOverride: null,
        tenantLogoUrl: null,
      })
      .returning();

    const tenantData: TenantData = {
      id: newTenant.id,
      name: newTenant.name,
      status: newTenant.status,
      timezone: newTenant.timezone,
      createdAt: newTenant.createdAt.toISOString(),
      branding: {
        id: newBranding.id,
        themeId: newBranding.themeId,
        accentColorOverride: newBranding.accentColorOverride,
        tenantLogoUrl: newBranding.tenantLogoUrl,
      },
    };

    const response: TenantCreateResponse = {
      success: true,
      data: tenantData,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    const response: TenantErrorResponse = {
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
