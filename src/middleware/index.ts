import { defineMiddleware, sequence } from 'astro:middleware';
import { validateSession, SESSION_COOKIE_NAME, TENANT_COOKIE_NAME, getEffectiveRole } from '@/lib/auth';
import type { SessionWithUser, MembershipWithTenant } from '@/lib/auth';
import { getUserMemberships } from '@/lib/auth/session';

/**
 * Route patterns that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/reports',
  '/select-workspace',
  '/profile',
];

/**
 * Routes that require Agency Admin role
 */
const AGENCY_ADMIN_ROUTES = ['/admin'];

/**
 * Routes that require a tenant context (selected workspace)
 */
const TENANT_REQUIRED_ROUTES = ['/dashboard', '/reports'];

/**
 * Check if a path matches any protected route pattern
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

/**
 * Check if a path requires Agency Admin role
 */
function isAgencyAdminRoute(pathname: string): boolean {
  return AGENCY_ADMIN_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

/**
 * Check if a path requires tenant context
 */
function isTenantRequiredRoute(pathname: string): boolean {
  return TENANT_REQUIRED_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

/**
 * Authentication middleware
 *
 * - Validates session on protected routes
 * - Redirects unauthenticated users to /login with return URL
 * - Attaches user and session data to Astro.locals
 */
const authMiddleware = defineMiddleware(async ({ cookies, locals, url, redirect }, next) => {
  const pathname = url.pathname;

  // Get session token from cookie
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

  // Always try to validate session if token exists (for both protected and public routes)
  if (sessionToken) {
    const session = await validateSession(sessionToken);

    if (session) {
      // Get user memberships for context
      const memberships = await getUserMemberships(session.user.id);

      // Attach session data to locals
      locals.session = session;
      locals.user = session.user;
      locals.tenantId = tenantId || null;
      locals.memberships = memberships;
      locals.isAuthenticated = true;

      // Calculate role flags for convenience in templates
      locals.isAgencyAdmin = memberships.some(
        (m) => m.role === 'agency_admin' && m.tenantId === null
      );
      locals.isTenantAdmin = locals.isAgencyAdmin || memberships.some(
        (m) => m.role === 'tenant_admin' && m.tenantId === tenantId
      );
      locals.isTenantViewer = memberships.some(
        (m) => m.role === 'tenant_viewer' && m.tenantId === tenantId
      );
      locals.effectiveRole = getEffectiveRole(memberships, tenantId || null);
    } else {
      // Clear invalid session cookie
      cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
      locals.isAuthenticated = false;
      locals.isAgencyAdmin = false;
      locals.isTenantAdmin = false;
      locals.isTenantViewer = false;
      locals.effectiveRole = null;
    }
  } else {
    locals.isAuthenticated = false;
    locals.isAgencyAdmin = false;
    locals.isTenantAdmin = false;
    locals.isTenantViewer = false;
    locals.effectiveRole = null;
  }

  // Check if this is a protected route
  if (isProtectedRoute(pathname)) {
    if (!locals.isAuthenticated) {
      // Build return URL for redirect after login
      const returnUrl = encodeURIComponent(pathname + url.search);
      return redirect(`/login?returnUrl=${returnUrl}`);
    }
  }

  // Continue to next middleware or route handler
  return next();
});

/**
 * RBAC middleware for role-based route protection
 *
 * - Redirects non-agency-admins away from /admin/* routes
 * - Redirects users without tenant context away from tenant-required routes
 */
const rbacMiddleware = defineMiddleware(async ({ locals, url, redirect }, next) => {
  const pathname = url.pathname;

  // Skip RBAC checks for unauthenticated users (handled by auth middleware)
  if (!locals.isAuthenticated) {
    return next();
  }

  // Check agency admin routes
  if (isAgencyAdminRoute(pathname)) {
    if (!locals.isAgencyAdmin) {
      // Redirect non-agency-admins to dashboard
      return redirect('/dashboard');
    }
  }

  // Check tenant-required routes (but not admin routes)
  if (isTenantRequiredRoute(pathname) && !isAgencyAdminRoute(pathname)) {
    // Agency admins without tenant context should select a workspace
    if (locals.isAgencyAdmin && !locals.tenantId) {
      return redirect('/select-workspace');
    }

    // Non-agency users without proper tenant context
    if (!locals.isAgencyAdmin && !locals.tenantId) {
      // Check if user has exactly one tenant membership
      const tenantMemberships = locals.memberships?.filter((m) => m.tenantId !== null) || [];

      if (tenantMemberships.length === 1) {
        // Auto-redirect to the single tenant context would require setting cookie
        // For now, redirect to workspace selection
        return redirect('/select-workspace');
      } else if (tenantMemberships.length > 1) {
        return redirect('/select-workspace');
      } else {
        // No tenant memberships at all - this shouldn't happen normally
        return redirect('/select-workspace');
      }
    }
  }

  return next();
});

/**
 * Redirect authenticated users away from login page
 */
const loginRedirectMiddleware = defineMiddleware(async ({ locals, url, redirect }, next) => {
  const pathname = url.pathname;

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (pathname === '/login' && locals.isAuthenticated) {
    // Check if there's a returnUrl to honor
    const returnUrl = url.searchParams.get('returnUrl');
    if (returnUrl) {
      return redirect(decodeURIComponent(returnUrl));
    }

    // Agency admins go to admin dashboard
    if (locals.isAgencyAdmin) {
      return redirect('/admin/dashboard');
    }

    return redirect('/dashboard');
  }

  return next();
});

// Export the middleware sequence
export const onRequest = sequence(authMiddleware, rbacMiddleware, loginRedirectMiddleware);

// Type declarations for Astro.locals
declare global {
  namespace App {
    interface Locals {
      session?: SessionWithUser;
      user?: SessionWithUser['user'];
      tenantId?: string | null;
      memberships?: MembershipWithTenant[];
      isAuthenticated: boolean;
      isAgencyAdmin: boolean;
      isTenantAdmin: boolean;
      isTenantViewer: boolean;
      effectiveRole: 'agency_admin' | 'tenant_admin' | 'tenant_viewer' | null;
    }
  }
}
