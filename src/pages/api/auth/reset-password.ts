import type { APIRoute } from 'astro';
import { resetPassword } from '@/lib/password-reset';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  TENANT_COOKIE_NAME,
  TENANT_COOKIE_OPTIONS,
} from '@/lib/auth';

interface ResetPasswordRequestBody {
  token: string;
  newPassword: string;
  passwordConfirmation: string;
}

interface ResetPasswordSuccessResponse {
  success: true;
  data: {
    userId: string;
    redirectUrl: string;
  };
}

interface ResetPasswordErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid reset token.
 * Creates a session and logs the user in automatically.
 *
 * Request body:
 * - token: string (required)
 * - newPassword: string (required, min 8 characters)
 * - passwordConfirmation: string (required)
 *
 * Response:
 * - 200: Password reset successful with redirect URL
 * - 400: Validation error, password mismatch, or password too short
 * - 404: Invalid or expired token
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = (await request.json()) as ResetPasswordRequestBody;
    const { token, newPassword, passwordConfirmation } = body;

    // Validate required fields
    if (!token) {
      const response: ResetPasswordErrorResponse = {
        success: false,
        error: 'Reset token is required',
        code: 'MISSING_TOKEN',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!newPassword || !passwordConfirmation) {
      const response: ResetPasswordErrorResponse = {
        success: false,
        error: 'Password and password confirmation are required',
        code: 'MISSING_PASSWORD',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Reset password
    const result = await resetPassword(token, newPassword, passwordConfirmation);

    if (!result.success) {
      // Determine appropriate status code
      let statusCode = 400;
      if (result.code === 'INVALID_TOKEN' || result.code === 'EXPIRED_TOKEN') {
        statusCode = 404;
      }

      const response: ResetPasswordErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set session cookie
    cookies.set(SESSION_COOKIE_NAME, result.sessionToken, SESSION_COOKIE_OPTIONS);

    // Set tenant cookie if applicable
    if (result.tenantId) {
      cookies.set(TENANT_COOKIE_NAME, result.tenantId, TENANT_COOKIE_OPTIONS);
    }

    const response: ResetPasswordSuccessResponse = {
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
    console.error('Reset password error:', error);

    const response: ResetPasswordErrorResponse = {
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
