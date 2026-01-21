import { describe, it, expect } from 'vitest';
import type { MembershipWithTenant } from './session';
import {
  requireAgencyAdmin,
  requireTenantAdmin,
  requireTenantAccess,
  hasRole,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from './authorization';

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

describe('Authorization Utilities', () => {
  describe('requireAgencyAdmin', () => {
    it('returns authorized for agency admin user', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];
      const result = requireAgencyAdmin(memberships);
      expect(result.isAuthorized).toBe(true);
      expect(result.membership).toBeDefined();
      expect(result.membership?.role).toBe('agency_admin');
    });

    it('returns forbidden for tenant admin user', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];
      const result = requireAgencyAdmin(memberships);
      expect(result.isAuthorized).toBe(false);
      expect(result.errorResponse).toBeDefined();
    });

    it('returns forbidden for tenant viewer user', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];
      const result = requireAgencyAdmin(memberships);
      expect(result.isAuthorized).toBe(false);
    });

    it('returns unauthorized for empty memberships', () => {
      const result = requireAgencyAdmin([]);
      expect(result.isAuthorized).toBe(false);
      expect(result.errorResponse).toBeDefined();
    });
  });

  describe('requireTenantAdmin', () => {
    it('returns authorized for tenant admin of the specified tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];
      const result = requireTenantAdmin(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(true);
      expect(result.membership?.role).toBe('tenant_admin');
    });

    it('returns authorized for agency admin (has access to all tenants)', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];
      const result = requireTenantAdmin(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(true);
    });

    it('returns forbidden for tenant admin of a different tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-456' }),
      ];
      const result = requireTenantAdmin(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(false);
    });

    it('returns forbidden for tenant viewer', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];
      const result = requireTenantAdmin(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(false);
    });
  });

  describe('requireTenantAccess', () => {
    it('returns authorized for tenant admin of the tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];
      const result = requireTenantAccess(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(true);
    });

    it('returns authorized for tenant viewer of the tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];
      const result = requireTenantAccess(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(true);
    });

    it('returns authorized for agency admin (has access to all tenants)', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];
      const result = requireTenantAccess(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(true);
    });

    it('returns forbidden for user without access to the tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-456' }),
      ];
      const result = requireTenantAccess(memberships, 'tenant-123');
      expect(result.isAuthorized).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true for matching role', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'agency_admin', tenantId: null }),
      ];
      expect(hasRole(memberships, 'agency_admin')).toBe(true);
    });

    it('returns true for matching role and tenant', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_admin', tenantId: 'tenant-123' }),
      ];
      expect(hasRole(memberships, 'tenant_admin', 'tenant-123')).toBe(true);
    });

    it('returns false for non-matching role', () => {
      const memberships: MembershipWithTenant[] = [
        createMockMembership({ role: 'tenant_viewer', tenantId: 'tenant-123' }),
      ];
      expect(hasRole(memberships, 'tenant_admin', 'tenant-123')).toBe(false);
    });
  });

  describe('Error response helpers', () => {
    it('createUnauthorizedResponse returns 401 status', async () => {
      const response = createUnauthorizedResponse();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('createForbiddenResponse returns 403 status', async () => {
      const response = createForbiddenResponse();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('FORBIDDEN');
    });
  });
});
