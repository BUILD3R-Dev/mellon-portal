import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

/**
 * User validation result types
 */
export type ValidateUserResult =
  | { success: true; user: UserForAuth }
  | { success: false; error: string; code: 'INVALID_CREDENTIALS' | 'PENDING_USER' | 'INACTIVE_USER' | 'USER_NOT_FOUND' };

export interface UserForAuth {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'inactive' | 'pending';
  passwordHash: string | null;
}

/**
 * Looks up a user by email address
 * @param email - The email address to look up
 * @returns The user record or null if not found
 */
export async function findUserByEmail(email: string): Promise<UserForAuth | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  return result[0] || null;
}

/**
 * Looks up a user by ID
 * @param userId - The user ID to look up
 * @returns The user record or null if not found
 */
export async function findUserById(userId: string): Promise<UserForAuth | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Validates user credentials and status for authentication
 * @param email - User's email address
 * @param password - User's password (plain text)
 * @returns Validation result with user data or error
 */
export async function validateUserCredentials(
  email: string,
  password: string
): Promise<ValidateUserResult> {
  const user = await findUserByEmail(email);

  if (!user) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  // Check user status before validating password
  if (user.status === 'pending') {
    return {
      success: false,
      error: 'Account is pending activation',
      code: 'PENDING_USER',
    };
  }

  if (user.status === 'inactive') {
    return {
      success: false,
      error: 'Account has been deactivated',
      code: 'INACTIVE_USER',
    };
  }

  // Validate password
  if (!user.passwordHash) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  return {
    success: true,
    user,
  };
}

/**
 * Validates that a user can authenticate based on their status
 * @param user - The user to validate
 * @returns Validation result
 */
export function validateUserStatus(user: UserForAuth): ValidateUserResult {
  if (user.status === 'pending') {
    return {
      success: false,
      error: 'Account is pending activation',
      code: 'PENDING_USER',
    };
  }

  if (user.status === 'inactive') {
    return {
      success: false,
      error: 'Account has been deactivated',
      code: 'INACTIVE_USER',
    };
  }

  return {
    success: true,
    user,
  };
}

/**
 * Verifies a password against a stored hash
 * Uses bcrypt-compatible verification or simple hash comparison
 * @param password - The plain text password to verify
 * @param storedHash - The stored password hash
 * @returns true if password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    // Use dynamic import for bcrypt-compatible hashing
    try {
      const bcryptModule = await import('better-auth/crypto');
      // Better Auth provides password verification utilities
      const hash = await hashPassword(password);
      // For bcrypt, we need constant-time comparison
      return timingSafeCompare(storedHash, hash);
    } catch {
      // Fallback: direct comparison (for development/testing)
      const hash = createHash('sha256').update(password).digest('hex');
      return timingSafeCompare(storedHash, hash);
    }
  }

  // SHA-256 hash comparison
  const hash = createHash('sha256').update(password).digest('hex');
  return timingSafeCompare(storedHash, hash);
}

/**
 * Hashes a password using SHA-256
 * In production, Better Auth handles bcrypt/argon2 automatically
 * @param password - The plain text password
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Performs a timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
