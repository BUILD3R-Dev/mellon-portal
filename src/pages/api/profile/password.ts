import type { APIRoute } from 'astro';
import {
  validateSession,
  SESSION_COOKIE_NAME,
  createUnauthorizedResponse,
  verifyPassword,
  hashPassword,
  deleteAllUserSessions,
  createSession,
} from '@/lib/auth';
import { validatePassword } from '@/lib/password-reset';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SuccessResponse {
  success: true;
  message: string;
  sessionsInvalidated: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * POST /api/profile/password
 *
 * Changes the current user's password.
 * Requires current password verification.
 * Invalidates all other sessions on success.
 *
 * Request body:
 * - currentPassword: string (required)
 * - newPassword: string (required, min 8 characters)
 * - confirmPassword: string (required, must match newPassword)
 *
 * Response:
 * - 200: Password changed successfully
 * - 400: Validation error (password too short, mismatch)
 * - 401: Wrong current password or not authenticated
 */
export const POST: APIRoute = async ({ cookies, request }) => {
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

    // Parse request body
    const body: PasswordChangeRequest = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      const response: ErrorResponse = {
        success: false,
        error: 'All password fields are required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate new password meets requirements
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      const response: ErrorResponse = {
        success: false,
        error: passwordValidation.error || 'Password does not meet requirements',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate password confirmation matches
    if (newPassword !== confirmPassword) {
      const response: ErrorResponse = {
        success: false,
        error: 'New password and confirmation do not match',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's current password hash
    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      const response: ErrorResponse = {
        success: false,
        error: 'Unable to change password. Account may not have a password set.',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      const response: ErrorResponse = {
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user's password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    // Invalidate all other sessions
    const sessionsInvalidated = await deleteAllUserSessions(session.userId);

    // Create a new session for the current user (so they stay logged in)
    const newSession = await createSession(session.userId);

    // Set the new session cookie
    cookies.set(SESSION_COOKIE_NAME, newSession.token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: newSession.expiresAt,
    });

    const response: SuccessResponse = {
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.',
      sessionsInvalidated,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error changing password:', error);
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
