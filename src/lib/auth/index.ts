/**
 * Authentication module exports
 *
 * This module provides all authentication-related functionality including:
 * - User validation and credential verification
 * - Session creation, validation, and deletion
 * - Post-login routing logic
 * - Cookie configuration
 * - Authorization and role-based access control
 */

// Better Auth configuration
export { auth } from './auth';
export type { Session, User } from './auth';

// User validation
export {
  validateUserCredentials,
  validateUserStatus,
  findUserByEmail,
  findUserById,
  verifyPassword,
  hashPassword,
} from './validate-user';
export type { ValidateUserResult, UserForAuth } from './validate-user';

// Session management
export {
  createSession,
  validateSession,
  getSessionByToken,
  deleteSession,
  deleteAllUserSessions,
  getUserMemberships,
  getPostLoginRedirect,
  cleanupExpiredSessions,
} from './session';
export type { SessionData, SessionWithUser, MembershipWithTenant } from './session';

// Authorization utilities
export {
  requireAgencyAdmin,
  requireTenantAdmin,
  requireTenantAccess,
  hasRole,
  getEffectiveRole,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from './authorization';
export type { AuthorizationResult } from './authorization';

// Utilities
export {
  generateSessionToken,
  hashSessionToken,
  getSessionExpiration,
  isSessionExpired,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  TENANT_COOKIE_NAME,
  TENANT_COOKIE_OPTIONS,
} from './utils';
