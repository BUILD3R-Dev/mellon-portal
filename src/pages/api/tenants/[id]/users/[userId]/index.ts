import type { APIRoute } from 'astro';
import {
  validateSession,
  SESSION_COOKIE_NAME,
  getUserMemberships,
  requireTenantAdmin,
  createUnauthorizedResponse,
  deleteAllUserSessions,
} from '@/lib/auth';
import { db, users, memberships } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

interface SuccessResponse {
  success: true;
  data: {
    userId: string;
    removed: true;
    warning: string;
    sessionsInvalidated: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * DELETE /api/tenants/[id]/users/[userId]
 *
 * Removes a user from a tenant (permanently deletes the membership).
 * If the user has no other memberships, sets their status to inactive.
 * Invalidates all user sessions.
 * Requires Tenant Admin or Agency Admin role.
 *
 * Warning: This action cannot be undone.
 *
 * Response:
 * - 200: User removed from tenant
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: User not found in tenant
 */
export const DELETE: APIRoute = async ({ cookies, params }) => {
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

    // Get IDs from params
    const tenantId = params.id;
    const targetUserId = params.userId;

    if (!tenantId || !targetUserId) {
      const response: ErrorResponse = {
        success: false,
        error: 'Tenant ID and User ID are required',
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

    // Prevent self-removal
    if (targetUserId === session.userId) {
      const response: ErrorResponse = {
        success: false,
        error: 'You cannot remove yourself from the tenant',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the target user belongs to this tenant
    const [membership] = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
      })
      .from(memberships)
      .where(and(eq(memberships.userId, targetUserId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (!membership) {
      const response: ErrorResponse = {
        success: false,
        error: 'User not found in this tenant',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if current user is trying to remove an agency admin (not allowed)
    const targetMemberships = await getUserMemberships(targetUserId);
    const isTargetAgencyAdmin = targetMemberships.some(
      (m) => m.role === 'agency_admin' && m.tenantId === null
    );

    if (isTargetAgencyAdmin) {
      const response: ErrorResponse = {
        success: false,
        error: 'Cannot remove an agency administrator through tenant management',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the membership
    await db
      .delete(memberships)
      .where(and(eq(memberships.userId, targetUserId), eq(memberships.tenantId, tenantId)));

    // Check if user has other memberships
    const remainingMemberships = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, targetUserId));

    // If no other memberships, set user status to inactive
    if (remainingMemberships.length === 0) {
      await db
        .update(users)
        .set({
          status: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId));
    }

    // Invalidate all user sessions
    const sessionsInvalidated = await deleteAllUserSessions(targetUserId);

    const response: SuccessResponse = {
      success: true,
      data: {
        userId: targetUserId,
        removed: true,
        warning: 'This action cannot be undone. The user has been permanently removed from this tenant.',
        sessionsInvalidated,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
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
