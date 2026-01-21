/**
 * Invite management module
 *
 * Provides functionality for creating, validating, and managing user invitations.
 */

import { db, users, memberships, tenants } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { sendEmail, generateInviteEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_INVITES = 10;

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Invite creation parameters
 */
export interface CreateInviteParams {
  email: string;
  role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer';
  tenantId?: string;
  adminUserId: string;
}

/**
 * Invite creation result types
 */
export type CreateInviteResult =
  | {
      success: true;
      userId: string;
      email: string;
      role: string;
      tenantName?: string;
      expiresAt: Date;
    }
  | {
      success: false;
      error: string;
      code:
        | 'VALIDATION_ERROR'
        | 'EMAIL_EXISTS'
        | 'TENANT_NOT_FOUND'
        | 'RATE_LIMIT_EXCEEDED'
        | 'EMAIL_SEND_ERROR'
        | 'DATABASE_ERROR';
    };

/**
 * Resend invite result types
 */
export type ResendInviteResult =
  | { success: true; email: string; expiresAt: Date }
  | {
      success: false;
      error: string;
      code: 'USER_NOT_FOUND' | 'USER_NOT_PENDING' | 'EMAIL_SEND_ERROR' | 'DATABASE_ERROR';
    };

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a cryptographically secure invite token
 */
export function generateInviteToken(): string {
  return crypto.randomUUID();
}

/**
 * Calculates invite expiration date (7 days from now)
 */
export function getInviteExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

/**
 * Checks if an invite token has expired
 */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Checks and updates rate limit for an admin
 */
export function checkRateLimit(adminUserId: string): { allowed: boolean; resetAt?: Date } {
  const now = Date.now();
  const record = rateLimitStore.get(adminUserId);

  if (!record || now > record.resetAt) {
    // Create new rate limit window
    rateLimitStore.set(adminUserId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_INVITES) {
    return { allowed: false, resetAt: new Date(record.resetAt) };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

/**
 * Resets rate limit for testing purposes
 */
export function resetRateLimit(adminUserId?: string): void {
  if (adminUserId) {
    rateLimitStore.delete(adminUserId);
  } else {
    rateLimitStore.clear();
  }
}

/**
 * Creates a new invite or re-invites an existing pending user
 */
export async function createInvite(params: CreateInviteParams): Promise<CreateInviteResult> {
  const { email, role, tenantId, adminUserId } = params;
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      error: 'Invalid email address format',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate role
  if (!['agency_admin', 'tenant_admin', 'tenant_viewer'].includes(role)) {
    return {
      success: false,
      error: 'Invalid role specified',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate tenantId requirement for tenant roles
  if ((role === 'tenant_admin' || role === 'tenant_viewer') && !tenantId) {
    return {
      success: false,
      error: 'Tenant ID is required for tenant roles',
      code: 'VALIDATION_ERROR',
    };
  }

  // Agency admins should not have a tenantId
  if (role === 'agency_admin' && tenantId) {
    return {
      success: false,
      error: 'Agency admin should not have a tenant ID',
      code: 'VALIDATION_ERROR',
    };
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit(adminUserId);
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Please try again after ${rateLimitCheck.resetAt?.toISOString()}`,
      code: 'RATE_LIMIT_EXCEEDED',
    };
  }

  try {
    // Look up tenant if tenantId provided
    let tenantName: string | undefined;
    if (tenantId) {
      const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

      if (!tenant) {
        return {
          success: false,
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
        };
      }
      tenantName = tenant.name;
    }

    // Check if email already exists
    const [existingUser] = await db
      .select({
        id: users.id,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiration();
    let userId: string;

    if (existingUser) {
      // Check if user is active
      if (existingUser.status === 'active') {
        return {
          success: false,
          error: 'A user with this email already exists',
          code: 'EMAIL_EXISTS',
        };
      }

      // Re-invite existing pending user
      await db
        .update(users)
        .set({
          inviteToken,
          inviteExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      userId = existingUser.id;
    } else {
      // Create new user with pending status
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          status: 'pending',
          inviteToken,
          inviteExpiresAt,
        })
        .returning({ id: users.id });

      userId = newUser.id;

      // Create membership
      await db.insert(memberships).values({
        userId,
        tenantId: tenantId || null,
        role,
      });
    }

    // Generate invite link
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
    const inviteLink = `${baseUrl}/invite/accept?token=${inviteToken}`;

    // Generate and send email
    const emailContent = generateInviteEmail({
      inviteLink,
      tenantName,
      recipientEmail: normalizedEmail,
      expirationDays: 7,
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
    });

    if (!emailResult.success) {
      // Note: User is still created but email failed
      console.error('Failed to send invite email:', emailResult.error);
      return {
        success: false,
        error: 'Failed to send invitation email. The invite was created but the email could not be delivered.',
        code: 'EMAIL_SEND_ERROR',
      };
    }

    return {
      success: true,
      userId,
      email: normalizedEmail,
      role,
      tenantName,
      expiresAt: inviteExpiresAt,
    };
  } catch (error) {
    console.error('Database error creating invite:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the invite',
      code: 'DATABASE_ERROR',
    };
  }
}

/**
 * Resends an invite for a pending user
 */
export async function resendInvite(userId: string): Promise<ResendInviteResult> {
  try {
    // Find user and verify status
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (user.status !== 'pending') {
      return {
        success: false,
        error: 'Can only resend invites for pending users',
        code: 'USER_NOT_PENDING',
      };
    }

    // Get user's membership to find tenant
    const [membership] = await db
      .select({
        tenantId: memberships.tenantId,
        role: memberships.role,
      })
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);

    let tenantName: string | undefined;
    if (membership?.tenantId) {
      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, membership.tenantId))
        .limit(1);
      tenantName = tenant?.name;
    }

    // Generate new token and expiration
    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiration();

    // Update user with new token
    await db
      .update(users)
      .set({
        inviteToken,
        inviteExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Generate invite link
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
    const inviteLink = `${baseUrl}/invite/accept?token=${inviteToken}`;

    // Generate and send email
    const emailContent = generateInviteEmail({
      inviteLink,
      tenantName,
      recipientEmail: user.email,
      expirationDays: 7,
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
    });

    if (!emailResult.success) {
      console.error('Failed to send invite email:', emailResult.error);
      return {
        success: false,
        error: 'Failed to send invitation email',
        code: 'EMAIL_SEND_ERROR',
      };
    }

    return {
      success: true,
      email: user.email,
      expiresAt: inviteExpiresAt,
    };
  } catch (error) {
    console.error('Database error resending invite:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while resending the invite',
      code: 'DATABASE_ERROR',
    };
  }
}

/**
 * Validates an invite token and returns user info
 */
export interface ValidateInviteResult {
  valid: boolean;
  expired?: boolean;
  user?: {
    id: string;
    email: string;
  };
  membership?: {
    role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer';
    tenantId: string | null;
    tenantName: string | null;
  };
}

export async function validateInviteToken(token: string): Promise<ValidateInviteResult> {
  try {
    // Find user by invite token
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        inviteExpiresAt: users.inviteExpiresAt,
      })
      .from(users)
      .where(and(eq(users.inviteToken, token), eq(users.status, 'pending')))
      .limit(1);

    if (!user) {
      return { valid: false };
    }

    // Check expiration
    if (user.inviteExpiresAt && isInviteExpired(user.inviteExpiresAt)) {
      return { valid: false, expired: true };
    }

    // Get membership info
    const [membership] = await db
      .select({
        role: memberships.role,
        tenantId: memberships.tenantId,
      })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);

    let tenantName: string | null = null;
    if (membership?.tenantId) {
      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, membership.tenantId))
        .limit(1);
      tenantName = tenant?.name || null;
    }

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
      },
      membership: membership
        ? {
            role: membership.role,
            tenantId: membership.tenantId,
            tenantName,
          }
        : undefined,
    };
  } catch (error) {
    console.error('Error validating invite token:', error);
    return { valid: false };
  }
}
