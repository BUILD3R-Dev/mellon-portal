import type { APIRoute } from 'astro';
import { acceptInvite } from '@/lib/invites/accept';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, TENANT_COOKIE_NAME, TENANT_COOKIE_OPTIONS } from '@/lib/auth';

interface AcceptInviteRequestBody {
  token: string;
  name: string;
  password: string;
  passwordConfirmation: string;
  timezone: string;
}

interface AcceptSuccessResponse {
  success: true;
  data: {
    userId: string;
    redirectUrl: string;
  };
}

interface AcceptErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/invite/accept
 *
 * Accepts an invitation and creates the user account.
 *
 * Request body:
 * - token: string (required)
 * - name: string (required)
 * - password: string (required, min 8 characters)
 * - passwordConfirmation: string (required)
 * - timezone: string (required, IANA format)
 *
 * Response:
 * - 200: Registration successful with redirect URL
 * - 400: Validation error, invalid token, or expired token
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = (await request.json()) as AcceptInviteRequestBody;
    const { token, name, password, passwordConfirmation, timezone } = body;

    if (!token) {
      const response: AcceptErrorResponse = {
        success: false,
        error: 'Invitation token is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Accept invite
    const result = await acceptInvite({
      token,
      name,
      password,
      passwordConfirmation,
      timezone,
    });

    if (!result.success) {
      const response: AcceptErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set session cookie
    cookies.set(SESSION_COOKIE_NAME, result.sessionToken, SESSION_COOKIE_OPTIONS);

    // Set tenant cookie if applicable
    if (result.tenantId) {
      cookies.set(TENANT_COOKIE_NAME, result.tenantId, TENANT_COOKIE_OPTIONS);
    }

    const response: AcceptSuccessResponse = {
      success: true,
      data: {
        userId: result.userId,
        redirectUrl: result.redirectUrl,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    const response: AcceptErrorResponse = {
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
