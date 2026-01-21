import type { APIRoute } from 'astro';
import { requestPasswordReset } from '@/lib/password-reset';

interface ForgotPasswordRequestBody {
  email: string;
}

interface ForgotPasswordSuccessResponse {
  success: true;
  message: string;
}

interface ForgotPasswordErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/auth/forgot-password
 *
 * Initiates a password reset flow by generating a token and sending an email.
 * Always returns success to prevent email enumeration.
 *
 * Request body:
 * - email: string (required)
 *
 * Response:
 * - 200: Always returns success message (regardless of whether email exists)
 * - 400: Missing required fields or invalid email format
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = (await request.json()) as ForgotPasswordRequestBody;
    const { email } = body;

    // Validate required fields
    if (!email) {
      const response: ForgotPasswordErrorResponse = {
        success: false,
        error: 'Email is required',
        code: 'MISSING_FIELDS',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Request password reset
    const result = await requestPasswordReset(email);

    if (!result.success && result.code === 'VALIDATION_ERROR') {
      const response: ForgotPasswordErrorResponse = {
        success: false,
        error: result.error,
        code: result.code,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Always return success message to prevent email enumeration
    const response: ForgotPasswordSuccessResponse = {
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset link shortly',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    // Still return success to prevent enumeration
    const response: ForgotPasswordSuccessResponse = {
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset link shortly',
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
