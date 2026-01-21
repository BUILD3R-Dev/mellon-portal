import type { APIRoute } from 'astro';
import {
  validateSession,
  getUserMemberships,
  SESSION_COOKIE_NAME,
  TENANT_COOKIE_NAME,
  TENANT_COOKIE_OPTIONS,
} from '@/lib/auth';

interface SetWorkspaceRequestBody {
  tenantId: string;
}

interface SetWorkspaceSuccessResponse {
  success: true;
  tenantId: string;
  tenantName: string;
  redirectUrl: string;
}

interface SetWorkspaceErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/auth/set-workspace
 *
 * Sets the active workspace/tenant context for the user.
 *
 * Request body:
 * - tenantId: string (required)
 *
 * Response:
 * - 200: Workspace set successfully
 * - 400: Missing tenantId
 * - 401: Not authenticated
 * - 403: User is not a member of the specified tenant
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get session token from cookie
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      const response: SetWorkspaceErrorResponse = {
        success: false,
        error: 'Not authenticated',
        code: 'NO_SESSION',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate session
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

      const response: SetWorkspaceErrorResponse = {
        success: false,
        error: 'Session expired or invalid',
        code: 'INVALID_SESSION',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json() as SetWorkspaceRequestBody;
    const { tenantId } = body;

    if (!tenantId) {
      const response: SetWorkspaceErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'MISSING_TENANT_ID',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user has membership for this tenant
    const memberships = await getUserMemberships(sessionData.user.id);
    const membership = memberships.find((m) => m.tenantId === tenantId);

    if (!membership) {
      const response: SetWorkspaceErrorResponse = {
        success: false,
        error: 'You do not have access to this workspace',
        code: 'ACCESS_DENIED',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set tenant context cookie
    cookies.set(TENANT_COOKIE_NAME, tenantId, TENANT_COOKIE_OPTIONS);

    const response: SetWorkspaceSuccessResponse = {
      success: true,
      tenantId,
      tenantName: membership.tenant?.name || 'Unknown',
      redirectUrl: '/dashboard',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Set workspace error:', error);

    const response: SetWorkspaceErrorResponse = {
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
