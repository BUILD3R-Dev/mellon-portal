import type { APIRoute } from 'astro';
import {
  validateSession,
  getUserMemberships,
  SESSION_COOKIE_NAME,
  TENANT_COOKIE_NAME,
} from '@/lib/auth';

interface SessionSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  session: {
    id: string;
    expiresAt: string;
  };
  currentTenantId: string | null;
  memberships: Array<{
    id: string;
    tenantId: string | null;
    role: string;
    tenantName: string | null;
  }>;
}

interface SessionErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * GET /api/auth/session
 *
 * Returns the current session and user information.
 *
 * Response:
 * - 200: Session is valid, returns user and session info
 * - 401: No valid session (not authenticated)
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get session token from cookie
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      const response: SessionErrorResponse = {
        success: false,
        error: 'Not authenticated',
        code: 'NO_SESSION',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate session and get user data
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      // Clear invalid session cookie
      cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

      const response: SessionErrorResponse = {
        success: false,
        error: 'Session expired or invalid',
        code: 'INVALID_SESSION',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user memberships
    const memberships = await getUserMemberships(sessionData.user.id);

    // Get current tenant context
    const currentTenantId = cookies.get(TENANT_COOKIE_NAME)?.value || null;

    const response: SessionSuccessResponse = {
      success: true,
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
      },
      session: {
        id: sessionData.id,
        expiresAt: sessionData.expiresAt.toISOString(),
      },
      currentTenantId,
      memberships: memberships.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        role: m.role,
        tenantName: m.tenant?.name || null,
      })),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Session check error:', error);

    const response: SessionErrorResponse = {
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
