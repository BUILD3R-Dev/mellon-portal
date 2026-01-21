import type { APIRoute } from 'astro';
import {
  validateUserCredentials,
  createSession,
  getPostLoginRedirect,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  TENANT_COOKIE_NAME,
  TENANT_COOKIE_OPTIONS,
} from '@/lib/auth';

interface LoginRequestBody {
  email: string;
  password: string;
}

interface LoginSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  redirectUrl: string;
}

interface LoginErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/auth/login
 *
 * Authenticates user credentials and creates a session.
 *
 * Request body:
 * - email: string (required)
 * - password: string (required)
 *
 * Response:
 * - 200: Login successful with user info and redirect URL
 * - 400: Missing required fields
 * - 401: Invalid credentials
 * - 403: Account pending or inactive
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json() as LoginRequestBody;
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      const response: LoginErrorResponse = {
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_FIELDS',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate user credentials and status
    const validationResult = await validateUserCredentials(email, password);

    if (!validationResult.success) {
      // Determine appropriate status code based on error
      let statusCode = 401;
      if (validationResult.code === 'PENDING_USER' || validationResult.code === 'INACTIVE_USER') {
        statusCode = 403;
      }

      const response: LoginErrorResponse = {
        success: false,
        error: validationResult.error,
        code: validationResult.code,
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { user } = validationResult;

    // Create session
    const session = await createSession(user.id);

    // Determine post-login redirect
    const { redirectUrl, tenantId } = await getPostLoginRedirect(user.id);

    // Set session cookie
    cookies.set(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

    // Set tenant cookie if applicable (single tenant membership)
    if (tenantId) {
      cookies.set(TENANT_COOKIE_NAME, tenantId, TENANT_COOKIE_OPTIONS);
    }

    // Return success response
    const response: LoginSuccessResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirectUrl,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);

    const response: LoginErrorResponse = {
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
