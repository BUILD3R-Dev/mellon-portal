import { db, sessions, users, memberships, tenants } from '@/lib/db';
import { eq, and, gt, lt } from 'drizzle-orm';
import { generateSessionToken, getSessionExpiration, isSessionExpired } from './utils';

/**
 * Session data with user information
 */
export interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionWithUser extends SessionData {
  user: {
    id: string;
    email: string;
    name: string | null;
    status: 'active' | 'inactive' | 'pending';
  };
}

export interface MembershipWithTenant {
  id: string;
  userId: string;
  tenantId: string | null;
  role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer';
  tenant: {
    id: string;
    name: string;
  } | null;
}

/**
 * Creates a new session for a user
 * @param userId - The user ID to create session for
 * @returns The created session data with token
 */
export async function createSession(userId: string): Promise<SessionData> {
  const token = generateSessionToken();
  const expiresAt = getSessionExpiration(30); // 30 days

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      token,
      expiresAt,
    })
    .returning();

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  };
}

/**
 * Validates a session token and returns session with user data
 * @param token - The session token to validate
 * @returns Session with user data or null if invalid/expired
 */
export async function validateSession(token: string): Promise<SessionWithUser | null> {
  const result = await db
    .select({
      session: {
        id: sessions.id,
        userId: sessions.userId,
        token: sessions.token,
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
      },
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { session, user } = result[0];

  // Additional check: ensure user is still active
  if (user.status !== 'active') {
    // Invalidate the session if user is no longer active
    await deleteSession(token);
    return null;
  }

  return {
    ...session,
    user,
  };
}

/**
 * Gets a session by token without user data
 * @param token - The session token
 * @returns Session data or null
 */
export async function getSessionByToken(token: string): Promise<SessionData | null> {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const session = result[0];

  if (isSessionExpired(session.expiresAt)) {
    // Clean up expired session
    await deleteSession(token);
    return null;
  }

  return session;
}

/**
 * Deletes a session by token
 * @param token - The session token to delete
 * @returns true if session was deleted, false if not found
 */
export async function deleteSession(token: string): Promise<boolean> {
  const result = await db.delete(sessions).where(eq(sessions.token, token)).returning();

  return result.length > 0;
}

/**
 * Deletes all sessions for a user
 * @param userId - The user ID
 * @returns Number of sessions deleted
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await db.delete(sessions).where(eq(sessions.userId, userId)).returning();

  return result.length;
}

/**
 * Gets user memberships with tenant details for routing
 * @param userId - The user ID
 * @returns Array of memberships with tenant info
 */
export async function getUserMemberships(userId: string): Promise<MembershipWithTenant[]> {
  const result = await db
    .select({
      membership: {
        id: memberships.id,
        userId: memberships.userId,
        tenantId: memberships.tenantId,
        role: memberships.role,
      },
      tenant: {
        id: tenants.id,
        name: tenants.name,
      },
    })
    .from(memberships)
    .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId));

  return result.map(({ membership, tenant }) => ({
    ...membership,
    tenant: tenant?.id ? tenant : null,
  }));
}

/**
 * Determines the redirect URL after login based on user memberships
 * @param userId - The user ID
 * @returns The redirect URL and optional tenant context
 */
export async function getPostLoginRedirect(
  userId: string
): Promise<{ redirectUrl: string; tenantId?: string }> {
  const userMemberships = await getUserMemberships(userId);

  if (userMemberships.length === 0) {
    // No memberships - redirect to a generic dashboard
    return { redirectUrl: '/dashboard' };
  }

  // Check for agency admin (tenantId is null)
  const agencyMembership = userMemberships.find(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (agencyMembership) {
    return { redirectUrl: '/admin/dashboard' };
  }

  // Filter to tenant memberships only
  const tenantMemberships = userMemberships.filter((m) => m.tenantId !== null);

  if (tenantMemberships.length === 1) {
    // Single tenant - redirect directly to dashboard
    return {
      redirectUrl: '/dashboard',
      tenantId: tenantMemberships[0].tenantId!,
    };
  }

  if (tenantMemberships.length > 1) {
    // Multiple tenants - redirect to workspace selection
    return { redirectUrl: '/select-workspace' };
  }

  // Fallback
  return { redirectUrl: '/dashboard' };
}

/**
 * Cleans up expired sessions from the database
 * Can be called periodically as a maintenance task
 * @returns Number of expired sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning();

  return result.length;
}
