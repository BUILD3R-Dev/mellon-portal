/**
 * Authorization utilities for role-based access control
 *
 * Provides reusable functions for checking user permissions across the application.
 * These functions work with the memberships data attached to Astro.locals by middleware.
 */

import type { MembershipWithTenant } from './session';

/**
 * Authorization result returned by role-checking functions
 */
export interface AuthorizationResult {
  isAuthorized: boolean;
  membership?: MembershipWithTenant;
  errorResponse?: Response;
}

/**
 * Standard error response structure for API endpoints
 */
interface ErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR';
}

/**
 * Creates a 401 Unauthorized response for missing or invalid sessions
 */
export function createUnauthorizedResponse(message = 'Authentication required'): Response {
  const response: ErrorResponse = {
    success: false,
    error: message,
    code: 'UNAUTHORIZED',
  };
  return new Response(JSON.stringify(response), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a 403 Forbidden response for insufficient permissions
 * Message intentionally does not reveal if the resource exists (security best practice)
 */
export function createForbiddenResponse(message = 'Access denied'): Response {
  const response: ErrorResponse = {
    success: false,
    error: message,
    code: 'FORBIDDEN',
  };
  return new Response(JSON.stringify(response), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Generic helper to check if user has a specific role
 *
 * @param memberships - User's memberships array
 * @param role - The role to check for
 * @param tenantId - Optional tenant ID to check against (null for agency admin)
 * @returns True if user has the specified role
 */
export function hasRole(
  memberships: MembershipWithTenant[],
  role: 'agency_admin' | 'tenant_admin' | 'tenant_viewer',
  tenantId?: string | null
): boolean {
  return memberships.some((m) => {
    if (m.role !== role) return false;
    if (tenantId === undefined) return true;
    return m.tenantId === tenantId;
  });
}

/**
 * Checks if user is an Agency Admin
 * Agency Admins have role 'agency_admin' with null tenantId
 *
 * @param memberships - User's memberships array
 * @returns Authorization result with isAuthorized flag
 */
export function requireAgencyAdmin(memberships: MembershipWithTenant[]): AuthorizationResult {
  if (!memberships || memberships.length === 0) {
    return {
      isAuthorized: false,
      errorResponse: createUnauthorizedResponse('Authentication required'),
    };
  }

  const agencyMembership = memberships.find(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (!agencyMembership) {
    return {
      isAuthorized: false,
      errorResponse: createForbiddenResponse('Access denied'),
    };
  }

  return {
    isAuthorized: true,
    membership: agencyMembership,
  };
}

/**
 * Checks if user is a Tenant Admin for the specified tenant OR an Agency Admin
 * Agency Admins have full access to all tenants
 *
 * @param memberships - User's memberships array
 * @param tenantId - The tenant ID to check access for
 * @returns Authorization result with isAuthorized flag
 */
export function requireTenantAdmin(
  memberships: MembershipWithTenant[],
  tenantId: string
): AuthorizationResult {
  if (!memberships || memberships.length === 0) {
    return {
      isAuthorized: false,
      errorResponse: createUnauthorizedResponse('Authentication required'),
    };
  }

  // Check if user is an Agency Admin (has access to all tenants)
  const agencyMembership = memberships.find(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (agencyMembership) {
    return {
      isAuthorized: true,
      membership: agencyMembership,
    };
  }

  // Check if user is a Tenant Admin for this specific tenant
  const tenantAdminMembership = memberships.find(
    (m) => m.role === 'tenant_admin' && m.tenantId === tenantId
  );

  if (tenantAdminMembership) {
    return {
      isAuthorized: true,
      membership: tenantAdminMembership,
    };
  }

  return {
    isAuthorized: false,
    errorResponse: createForbiddenResponse('Access denied'),
  };
}

/**
 * Checks if user has any access to the specified tenant (admin or viewer) OR is an Agency Admin
 * Agency Admins have full access to all tenants
 *
 * @param memberships - User's memberships array
 * @param tenantId - The tenant ID to check access for
 * @returns Authorization result with isAuthorized flag
 */
export function requireTenantAccess(
  memberships: MembershipWithTenant[],
  tenantId: string
): AuthorizationResult {
  if (!memberships || memberships.length === 0) {
    return {
      isAuthorized: false,
      errorResponse: createUnauthorizedResponse('Authentication required'),
    };
  }

  // Check if user is an Agency Admin (has access to all tenants)
  const agencyMembership = memberships.find(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (agencyMembership) {
    return {
      isAuthorized: true,
      membership: agencyMembership,
    };
  }

  // Check if user has any membership for this tenant
  const tenantMembership = memberships.find((m) => m.tenantId === tenantId);

  if (tenantMembership) {
    return {
      isAuthorized: true,
      membership: tenantMembership,
    };
  }

  return {
    isAuthorized: false,
    errorResponse: createForbiddenResponse('Access denied'),
  };
}

/**
 * Gets the effective role for the current tenant context
 * Used for determining what actions a user can take
 *
 * Role hierarchy: agency_admin > tenant_admin > tenant_viewer
 *
 * @param memberships - User's memberships array
 * @param tenantId - The current tenant context
 * @returns The effective role for the context, or null if no access
 */
export function getEffectiveRole(
  memberships: MembershipWithTenant[],
  tenantId: string | null
): 'agency_admin' | 'tenant_admin' | 'tenant_viewer' | null {
  if (!memberships || memberships.length === 0) {
    return null;
  }

  // Agency Admin always has highest access
  const isAgencyAdmin = memberships.some(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (isAgencyAdmin) {
    return 'agency_admin';
  }

  // If no tenant context, user has no effective role
  if (!tenantId) {
    return null;
  }

  // Find the membership for this tenant
  const tenantMembership = memberships.find((m) => m.tenantId === tenantId);

  return tenantMembership?.role || null;
}
