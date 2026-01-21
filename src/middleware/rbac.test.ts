import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MembershipWithTenant } from '@/lib/auth/session';
import { getEffectiveRole } from '@/lib/auth/authorization';

// Helper to create mock memberships
function createMockMembership(overrides: Partial<MembershipWithTenant> = {}): MembershipWithTenant {
  return {
    id: 'membership-123',
    userId: 'user-123',
    tenantId: null,
    role: 'agency_admin',
    tenant: null,
    ...overrides,
  };
}

describe('Route-Level RBAC', () => {
  describe('getEffectiveRole', () => {
    it('returns agency_admin for agency admin users regardless of tenant context', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];

      // Without tenant context
      expect(getEffectiveRole(memberships, null)).toBe('agency_admin');

      // With tenant context
      expect(getEffectiveRole(memberships, 'tenant-123')).toBe('agency_admin');
    });

    it('returns tenant_admin for tenant admin within their tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];

      expect(getEffectiveRole(memberships, 'tenant-123')).toBe('tenant_admin');
    });

    it('returns tenant_viewer for tenant viewer within their tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];

      expect(getEffectiveRole(memberships, 'tenant-123')).toBe('tenant_viewer');
    });

    it('returns null for tenant user accessing a different tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-456' }),
      ];

      expect(getEffectiveRole(memberships, 'tenant-123')).toBe(null);
    });

    it('returns null for empty memberships', () => {
      expect(getEffectiveRole([], 'tenant-123')).toBe(null);
      expect(getEffectiveRole([], null)).toBe(null);
    });
  });

  describe('Route classification', () => {
    // Test route patterns - these match the middleware constants
    const AGENCY_ADMIN_ROUTES = ['/admin'];
    const TENANT_REQUIRED_ROUTES = ['/dashboard', '/reports'];

    function isAgencyAdminRoute(pathname: string): boolean {
      return AGENCY_ADMIN_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );
    }

    function isTenantRequiredRoute(pathname: string): boolean {
      return TENANT_REQUIRED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );
    }

    it('identifies /admin as agency admin route', () => {
      expect(isAgencyAdminRoute('/admin')).toBe(true);
      expect(isAgencyAdminRoute('/admin/dashboard')).toBe(true);
      expect(isAgencyAdminRoute('/admin/tenants')).toBe(true);
      expect(isAgencyAdminRoute('/admin/users')).toBe(true);
    });

    it('does not identify non-admin routes as agency admin routes', () => {
      expect(isAgencyAdminRoute('/dashboard')).toBe(false);
      expect(isAgencyAdminRoute('/profile')).toBe(false);
      expect(isAgencyAdminRoute('/reports')).toBe(false);
    });

    it('identifies tenant-required routes', () => {
      expect(isTenantRequiredRoute('/dashboard')).toBe(true);
      expect(isTenantRequiredRoute('/reports')).toBe(true);
      expect(isTenantRequiredRoute('/reports/weekly')).toBe(true);
    });

    it('does not identify admin routes as tenant-required', () => {
      expect(isTenantRequiredRoute('/admin')).toBe(false);
      expect(isTenantRequiredRoute('/admin/dashboard')).toBe(false);
    });
  });

  describe('Role flags', () => {
    it('correctly determines isAgencyAdmin flag', () => {
      const agencyMemberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];
      const tenantMemberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];

      const isAgencyAdmin = (memberships: MembershipWithTenant[]) =>
        memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

      expect(isAgencyAdmin(agencyMemberships)).toBe(true);
      expect(isAgencyAdmin(tenantMemberships)).toBe(false);
    });

    it('correctly determines isTenantAdmin flag for tenant context', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];

      const isTenantAdmin = (memberships: MembershipWithTenant[], tenantId: string | null) =>
        memberships.some(
          (m) => m.role === 'agency_admin' || (m.role === 'tenant_admin' && m.tenantId === tenantId)
        );

      expect(isTenantAdmin(memberships, 'tenant-123')).toBe(true);
      expect(isTenantAdmin(memberships, 'tenant-456')).toBe(false);
    });

    it('correctly determines isTenantViewer flag for tenant context', () => {
      const viewerMemberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];
      const adminMemberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];

      const isTenantViewer = (memberships: MembershipWithTenant[], tenantId: string | null) =>
        memberships.some((m) => m.role === 'tenant_viewer' && m.tenantId === tenantId);

      expect(isTenantViewer(viewerMemberships, 'tenant-123')).toBe(true);
      expect(isTenantViewer(adminMemberships, 'tenant-123')).toBe(false);
    });
  });
});
