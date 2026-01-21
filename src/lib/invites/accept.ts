/**
 * Invite acceptance functionality
 *
 * Handles the registration process when a user accepts an invitation.
 */

import { db, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { hashPassword, createSession, getPostLoginRedirect } from '@/lib/auth';
import { isInviteExpired } from './index';
import crypto from 'crypto';

/**
 * Accept invite parameters
 */
export interface AcceptInviteParams {
  token: string;
  name: string;
  password: string;
  passwordConfirmation: string;
  timezone: string;
}

/**
 * Accept invite result types
 */
export type AcceptInviteResult =
  | {
      success: true;
      userId: string;
      sessionToken: string;
      redirectUrl: string;
      tenantId?: string;
    }
  | {
      success: false;
      error: string;
      code:
        | 'INVALID_TOKEN'
        | 'EXPIRED_TOKEN'
        | 'VALIDATION_ERROR'
        | 'PASSWORD_MISMATCH'
        | 'PASSWORD_TOO_SHORT'
        | 'DATABASE_ERROR';
    };

/**
 * Performs timing-safe token comparison
 * This prevents timing attacks that could enumerate valid tokens
 */
function timingSafeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const dummy = Buffer.from('a'.repeat(a.length));
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Validates password requirements
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

/**
 * Accepts an invitation and creates the user account
 */
export async function acceptInvite(params: AcceptInviteParams): Promise<AcceptInviteResult> {
  const { token, name, password, passwordConfirmation, timezone } = params;

  // Validate required fields
  if (!token || !name || !password || !passwordConfirmation || !timezone) {
    return {
      success: false,
      error: 'All fields are required',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate name
  const trimmedName = name.trim();
  if (trimmedName.length < 1) {
    return {
      success: false,
      error: 'Name is required',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: passwordValidation.error!,
      code: 'PASSWORD_TOO_SHORT',
    };
  }

  // Validate password confirmation
  if (password !== passwordConfirmation) {
    return {
      success: false,
      error: 'Passwords do not match',
      code: 'PASSWORD_MISMATCH',
    };
  }

  try {
    // Find user by token
    // Note: We fetch all pending users with tokens and compare timing-safely
    const pendingUsers = await db
      .select({
        id: users.id,
        email: users.email,
        inviteToken: users.inviteToken,
        inviteExpiresAt: users.inviteExpiresAt,
      })
      .from(users)
      .where(eq(users.status, 'pending'));

    // Find matching token using timing-safe comparison
    let matchedUser: (typeof pendingUsers)[0] | null = null;
    for (const user of pendingUsers) {
      if (user.inviteToken && timingSafeTokenCompare(user.inviteToken, token)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return {
        success: false,
        error: 'Invalid or expired invitation link',
        code: 'INVALID_TOKEN',
      };
    }

    // Check expiration
    if (matchedUser.inviteExpiresAt && isInviteExpired(matchedUser.inviteExpiresAt)) {
      return {
        success: false,
        error: 'This invitation has expired. Please request a new invitation.',
        code: 'EXPIRED_TOKEN',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update user record
    await db
      .update(users)
      .set({
        name: trimmedName,
        passwordHash,
        timezone,
        status: 'active',
        inviteToken: null,
        inviteExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, matchedUser.id));

    // Create session
    const session = await createSession(matchedUser.id);

    // Determine redirect URL based on memberships
    const { redirectUrl, tenantId } = await getPostLoginRedirect(matchedUser.id);

    return {
      success: true,
      userId: matchedUser.id,
      sessionToken: session.token,
      redirectUrl,
      tenantId,
    };
  } catch (error) {
    console.error('Database error accepting invite:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while completing registration',
      code: 'DATABASE_ERROR',
    };
  }
}
