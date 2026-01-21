import { randomBytes, createHash } from 'crypto';

/**
 * Authentication utility functions
 */

/**
 * Generates a cryptographically secure session token
 * @returns A 32-byte random hex string (64 characters)
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hashes a session token for secure storage comparison
 * @param token - The raw session token
 * @returns SHA-256 hash of the token
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates session expiration date
 * @param daysFromNow - Number of days until expiration (default: 30)
 * @returns Date object representing expiration time
 */
export function getSessionExpiration(daysFromNow: number = 30): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysFromNow);
  return expiresAt;
}

/**
 * Checks if a session has expired
 * @param expiresAt - The session expiration date
 * @returns true if the session has expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_NAME = 'mellon_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
};

/**
 * Cookie configuration for tenant context
 */
export const TENANT_COOKIE_NAME = 'mellon_tenant';

export const TENANT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
};
