import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, deleteAllUserSessions } from '@/lib/auth';
import { db, tenants, tenantBranding, memberships } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';

interface TenantData {
  id: string;
  name: string;
  status: string;
  timezone: string;
  clienttetherWebKey: string | null;
  clienttetherAccessToken: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  branding: {
    id: string;
    themeId: string;
    accentColorOverride: string | null;
    tenantLogoUrl: string | null;
    mellonLogoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  } | null;
}

interface TenantResponse {
  success: true;
  data: TenantData & { sessionsInvalidated?: number };
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
 * GET /api/tenants/[id]
 *
 * Returns tenant details including full branding configuration and user count.
 * Only accessible by agency admins.
 *
 * Response:
 * - 200: Tenant with branding data and user count
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch tenant with branding
    const result = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
        timezone: tenants.timezone,
        clienttetherWebKey: tenants.clienttetherWebKey,
        clienttetherAccessToken: tenants.clienttetherAccessToken,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        brandingId: tenantBranding.id,
        themeId: tenantBranding.themeId,
        accentColorOverride: tenantBranding.accentColorOverride,
        tenantLogoUrl: tenantBranding.tenantLogoUrl,
        mellonLogoUrl: tenantBranding.mellonLogoUrl,
        primaryColor: tenantBranding.primaryColor,
        accentColor: tenantBranding.accentColor,
      })
      .from(tenants)
      .leftJoin(tenantBranding, eq(tenants.id, tenantBranding.tenantId))
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (result.length === 0) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user count for this tenant
    const userCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));

    const userCount = userCountResult[0]?.count || 0;

    const tenant = result[0];
    const tenantData: TenantData = {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      timezone: tenant.timezone,
      clienttetherWebKey: tenant.clienttetherWebKey,
      clienttetherAccessToken: tenant.clienttetherAccessToken,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      userCount,
      branding: tenant.brandingId
        ? {
            id: tenant.brandingId,
            themeId: tenant.themeId || 'light',
            accentColorOverride: tenant.accentColorOverride,
            tenantLogoUrl: tenant.tenantLogoUrl,
            mellonLogoUrl: tenant.mellonLogoUrl,
            primaryColor: tenant.primaryColor,
            accentColor: tenant.accentColor,
          }
        : null,
    };

    const response: TenantResponse = {
      success: true,
      data: tenantData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
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
 * PATCH /api/tenants/[id]
 *
 * Updates tenant name, timezone, status, and/or logo URLs.
 * When status changes to 'inactive', all user sessions for that tenant are invalidated.
 * Only accessible by agency admins.
 *
 * Request body:
 * - name: string (optional, max 255 chars)
 * - timezone: string (optional)
 * - status: 'active' | 'inactive' | 'suspended' (optional)
 * - mellonLogoUrl: string (optional, URL for Mellon logo)
 * - tenantLogoUrl: string (optional, URL for tenant logo)
 *
 * Response:
 * - 200: Updated tenant data
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if tenant exists and get current status
    const existingTenant = await db
      .select({
        id: tenants.id,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      const response: TenantErrorResponse = {
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const previousStatus = existingTenant[0].status;

    // Parse request body
    const body = await request.json();
    const { name, timezone, status, mellonLogoUrl, tenantLogoUrl, themeId, clienttetherWebKey, clienttetherAccessToken } = body;

    // Validation for tenant fields
    const tenantUpdates: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        const response: TenantErrorResponse = {
          success: false,
          error: 'Name cannot be empty',
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

      tenantUpdates.name = name.trim();
    }

    if (timezone !== undefined) {
      tenantUpdates.timezone = timezone;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
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
      tenantUpdates.status = status;
    }

    if (clienttetherWebKey !== undefined) {
      tenantUpdates.clienttetherWebKey = clienttetherWebKey;
    }

    if (clienttetherAccessToken !== undefined) {
      tenantUpdates.clienttetherAccessToken = clienttetherAccessToken;
    }

    // Validate themeId if provided
    if (themeId !== undefined) {
      const validThemes = ['light', 'dark'];
      if (!validThemes.includes(themeId)) {
        const response: TenantErrorResponse = {
          success: false,
          error: 'Invalid theme. Must be "light" or "dark".',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Add updatedAt timestamp
    tenantUpdates.updatedAt = new Date();

    // Update tenant
    const [updatedTenant] = await db
      .update(tenants)
      .set(tenantUpdates)
      .where(eq(tenants.id, tenantId))
      .returning();

    // Handle branding updates if logo URLs or theme provided
    if (mellonLogoUrl !== undefined || tenantLogoUrl !== undefined || themeId !== undefined) {
      // Check if branding record exists
      const existingBranding = await db
        .select({ id: tenantBranding.id })
        .from(tenantBranding)
        .where(eq(tenantBranding.tenantId, tenantId))
        .limit(1);

      const brandingUpdates: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (mellonLogoUrl !== undefined) {
        brandingUpdates.mellonLogoUrl = mellonLogoUrl;
      }
      if (tenantLogoUrl !== undefined) {
        brandingUpdates.tenantLogoUrl = tenantLogoUrl;
      }
      if (themeId !== undefined) {
        brandingUpdates.themeId = themeId;
      }

      if (existingBranding.length === 0) {
        // Create new branding record
        await db.insert(tenantBranding).values({
          tenantId,
          themeId: themeId || 'light',
          ...brandingUpdates,
        });
      } else {
        // Update existing branding record
        await db
          .update(tenantBranding)
          .set(brandingUpdates)
          .where(eq(tenantBranding.tenantId, tenantId));
      }
    }

    // Handle session cleanup when deactivating tenant
    let sessionsInvalidated = 0;
    if (status === 'inactive' && previousStatus !== 'inactive') {
      // Get all users belonging to this tenant
      const tenantMemberships = await db
        .select({
          userId: memberships.userId,
        })
        .from(memberships)
        .where(eq(memberships.tenantId, tenantId));

      // Delete all sessions for each user
      for (const membership of tenantMemberships) {
        const deletedCount = await deleteAllUserSessions(membership.userId);
        sessionsInvalidated += deletedCount;
      }
    }

    // Get user count
    const userCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));

    const userCount = userCountResult[0]?.count || 0;

    // Fetch updated branding
    const brandingResult = await db
      .select({
        id: tenantBranding.id,
        themeId: tenantBranding.themeId,
        accentColorOverride: tenantBranding.accentColorOverride,
        tenantLogoUrl: tenantBranding.tenantLogoUrl,
        mellonLogoUrl: tenantBranding.mellonLogoUrl,
        primaryColor: tenantBranding.primaryColor,
        accentColor: tenantBranding.accentColor,
      })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    const tenantData: TenantData & { sessionsInvalidated?: number } = {
      id: updatedTenant.id,
      name: updatedTenant.name,
      status: updatedTenant.status,
      timezone: updatedTenant.timezone,
      clienttetherWebKey: updatedTenant.clienttetherWebKey,
      clienttetherAccessToken: updatedTenant.clienttetherAccessToken,
      createdAt: updatedTenant.createdAt.toISOString(),
      updatedAt: updatedTenant.updatedAt.toISOString(),
      userCount,
      branding: brandingResult.length > 0
        ? {
            id: brandingResult[0].id,
            themeId: brandingResult[0].themeId || 'light',
            accentColorOverride: brandingResult[0].accentColorOverride,
            tenantLogoUrl: brandingResult[0].tenantLogoUrl,
            mellonLogoUrl: brandingResult[0].mellonLogoUrl,
            primaryColor: brandingResult[0].primaryColor,
            accentColor: brandingResult[0].accentColor,
          }
        : null,
    };

    if (status === 'inactive' && previousStatus !== 'inactive') {
      tenantData.sessionsInvalidated = sessionsInvalidated;
    }

    const response: TenantResponse = {
      success: true,
      data: tenantData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
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
