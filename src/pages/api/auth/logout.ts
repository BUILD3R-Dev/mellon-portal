import type { APIRoute } from 'astro';
import {
  deleteSession,
  SESSION_COOKIE_NAME,
  TENANT_COOKIE_NAME,
} from '@/lib/auth';

interface LogoutSuccessResponse {
  success: true;
  message: string;
}

interface LogoutErrorResponse {
  success: false;
  error: string;
}

/**
 * POST /api/auth/logout
 *
 * Destroys the current session and clears cookies.
 *
 * Response:
 * - 200: Logout successful
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Get session token from cookie
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;

    // Delete session from database if token exists
    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    // Clear session cookie
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

    // Clear tenant context cookie
    cookies.delete(TENANT_COOKIE_NAME, { path: '/' });

    const response: LogoutSuccessResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);

    const response: LogoutErrorResponse = {
      success: false,
      error: 'An unexpected error occurred during logout',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
