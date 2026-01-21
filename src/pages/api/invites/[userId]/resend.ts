import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { resendInvite } from '@/lib/invites';

interface ResendSuccessResponse {
  success: true;
  data: {
    email: string;
    expiresAt: string;
  };
}

interface ResendErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/invites/{userId}/resend
 *
 * Resends an invite for a pending user. Only agency admins can resend invites.
 *
 * Response:
 * - 200: Invite resent successfully
 * - 400: User not in pending status
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: User not found
 */
export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const { userId } = params;

    if (!userId) {
      const response: ResendErrorResponse = {
        success: false,
        error: 'User ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Authenticate request
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: ResendErrorResponse = {
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
      const response: ResendErrorResponse = {
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
      const response: ResendErrorResponse = {
        success: false,
        error: 'Only agency administrators can resend invites',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Resend invite
    const result = await resendInvite(userId);

    if (!result.success) {
      // Map error codes to HTTP status codes
      let statusCode = 400;
      if (result.code === 'USER_NOT_FOUND') {
        statusCode = 404;
      }

      const response: ResendErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: ResendSuccessResponse = {
      success: true,
      data: {
        email: result.email,
        expiresAt: result.expiresAt.toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    const response: ResendErrorResponse = {
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
