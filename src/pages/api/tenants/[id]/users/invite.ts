import type { APIRoute } from 'astro';
import {
  validateSession,
  SESSION_COOKIE_NAME,
  getUserMemberships,
  requireTenantAdmin,
  createUnauthorizedResponse,
} from '@/lib/auth';
import { createInvite } from '@/lib/invites';

interface InviteRequest {
  email: string;
  role: 'tenant_admin' | 'tenant_viewer';
}

interface InviteResponse {
  success: true;
  data: {
    userId: string;
    email: string;
    role: string;
    tenantName?: string;
    expiresAt: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/tenants/[id]/users/invite
 *
 * Invites a new user to a tenant.
 * Requires Tenant Admin or Agency Admin role.
 *
 * For Tenant Admins:
 * - Can only invite to their own tenant
 * - Can only assign tenant_admin or tenant_viewer roles
 *
 * For Agency Admins:
 * - Can invite to any tenant
 * - Can assign any role (but agency_admin should not have tenantId)
 *
 * Request body:
 * - email: string (required)
 * - role: 'tenant_admin' | 'tenant_viewer' (required)
 *
 * Response:
 * - 201: User invited successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 429: Rate limit exceeded
 */
export const POST: APIRoute = async ({ cookies, params, request }) => {
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

    // Determine if user is agency admin or tenant admin
    const isAgencyAdmin = userMemberships.some(
      (m) => m.role === 'agency_admin' && m.tenantId === null
    );

    // Parse request body
    const body: InviteRequest = await request.json();
    const { email, role } = body;

    // Validate required fields
    if (!email || !role) {
      const response: ErrorResponse = {
        success: false,
        error: 'Email and role are required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate role - Tenant Admins can only assign tenant roles
    const allowedRoles = ['tenant_admin', 'tenant_viewer'];
    if (!allowedRoles.includes(role)) {
      const response: ErrorResponse = {
        success: false,
        error: 'Invalid role. Must be tenant_admin or tenant_viewer',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the invite
    const result = await createInvite({
      email,
      role,
      tenantId,
      adminUserId: session.userId,
    });

    if (!result.success) {
      // Handle specific error codes
      let statusCode = 400;
      if (result.code === 'RATE_LIMIT_EXCEEDED') {
        statusCode = 429;
      }

      const response: ErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: InviteResponse = {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        role: result.role,
        tenantName: result.tenantName,
        expiresAt: result.expiresAt.toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating invite:', error);
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
