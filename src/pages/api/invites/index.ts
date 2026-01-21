import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { createInvite } from '@/lib/invites';

interface CreateInviteRequestBody {
  email: string;
  role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer';
  tenantId?: string;
}

interface InviteSuccessResponse {
  success: true;
  data: {
    userId: string;
    email: string;
    role: string;
    tenantName?: string;
    expiresAt: string;
  };
}

interface InviteErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/invites
 *
 * Creates a new user invite. Only agency admins can create invites.
 *
 * Request body:
 * - email: string (required)
 * - role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer' (required)
 * - tenantId: string (required for tenant roles)
 *
 * Response:
 * - 200: Invite created successfully
 * - 400: Validation error or email exists
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 * - 429: Rate limit exceeded
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate request
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: InviteErrorResponse = {
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
      const response: InviteErrorResponse = {
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is an agency admin
    const userMemberships = await getUserMemberships(session.userId);
    const isAgencyAdmin = userMemberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    if (!isAgencyAdmin) {
      const response: InviteErrorResponse = {
        success: false,
        error: 'Only agency administrators can create invites',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = (await request.json()) as CreateInviteRequestBody;
    const { email, role, tenantId } = body;

    if (!email || !role) {
      const response: InviteErrorResponse = {
        success: false,
        error: 'Email and role are required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create invite
    const result = await createInvite({
      email,
      role,
      tenantId,
      adminUserId: session.userId,
    });

    if (!result.success) {
      // Map error codes to HTTP status codes
      let statusCode = 400;
      if (result.code === 'RATE_LIMIT_EXCEEDED') {
        statusCode = 429;
      } else if (result.code === 'TENANT_NOT_FOUND') {
        statusCode = 404;
      }

      const response: InviteErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: InviteSuccessResponse = {
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
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    const response: InviteErrorResponse = {
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
