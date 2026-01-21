import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants, tenantBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface BrandingResponse {
  success: true;
  data: {
    themeId: string;
    accentColorOverride: string | null;
    tenantLogoUrl: string | null;
  };
}

interface BrandingErrorResponse {
  success: false;
  error: string;
  code: string;
}

const VALID_THEMES = ['light', 'dark', 'blue', 'green'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validates agency admin authorization
 */
async function validateAgencyAdmin(cookies: any): Promise<{ isAuthorized: boolean; userId?: string; errorResponse?: Response }> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const response: BrandingErrorResponse = {
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
    const response: BrandingErrorResponse = {
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
    const response: BrandingErrorResponse = {
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
 * POST /api/tenants/[id]/branding
 *
 * Updates branding settings (theme and accent color) for a tenant.
 * Only accessible by agency admins.
 *
 * Request body:
 * - themeId: 'light' | 'dark' | 'blue' | 'green' (optional)
 * - accentColorOverride: string (hex color, e.g., '#FF5733') or null (optional)
 *
 * Response:
 * - 200: Updated branding data
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const POST: APIRoute = async ({ cookies, params, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: BrandingErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if tenant exists
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      const response: BrandingErrorResponse = {
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { themeId, accentColorOverride } = body;

    // Validation
    const updates: Record<string, any> = {};

    if (themeId !== undefined) {
      if (!VALID_THEMES.includes(themeId)) {
        const response: BrandingErrorResponse = {
          success: false,
          error: `Invalid theme ID. Must be one of: ${VALID_THEMES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.themeId = themeId;
    }

    if (accentColorOverride !== undefined) {
      if (accentColorOverride !== null && !HEX_COLOR_REGEX.test(accentColorOverride)) {
        const response: BrandingErrorResponse = {
          success: false,
          error: 'Invalid accent color format. Must be a hex color (e.g., #FF5733) or null',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.accentColorOverride = accentColorOverride;
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    // Check if branding record exists
    const existingBranding = await db
      .select({ id: tenantBranding.id })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    let updatedBranding;

    if (existingBranding.length === 0) {
      // Create new branding record
      const [newBranding] = await db
        .insert(tenantBranding)
        .values({
          tenantId,
          themeId: themeId || 'light',
          accentColorOverride: accentColorOverride || null,
        })
        .returning();
      updatedBranding = newBranding;
    } else {
      // Update existing branding record
      const [updated] = await db
        .update(tenantBranding)
        .set(updates)
        .where(eq(tenantBranding.tenantId, tenantId))
        .returning();
      updatedBranding = updated;
    }

    const response: BrandingResponse = {
      success: true,
      data: {
        themeId: updatedBranding.themeId,
        accentColorOverride: updatedBranding.accentColorOverride,
        tenantLogoUrl: updatedBranding.tenantLogoUrl,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    const response: BrandingErrorResponse = {
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
