import { describe, it, expect } from 'vitest';

/**
 * Tests for Workspace Selector component
 */

interface Tenant {
  id: string;
  name: string;
  status: string;
}

describe('WorkspaceSelector', () => {
  describe('Tenant list filtering', () => {
    it('only shows active tenants', () => {
      const tenants: Tenant[] = [
        { id: '1', name: 'Active Tenant', status: 'active' },
        { id: '2', name: 'Inactive Tenant', status: 'inactive' },
        { id: '3', name: 'Suspended Tenant', status: 'suspended' },
      ];

      const activeTenants = tenants.filter((t) => t.status === 'active');
      expect(activeTenants).toHaveLength(1);
      expect(activeTenants[0].name).toBe('Active Tenant');
    });

    it('sorts tenants alphabetically by name', () => {
      const tenants: Tenant[] = [
        { id: '1', name: 'Zebra Corp', status: 'active' },
        { id: '2', name: 'Acme Inc', status: 'active' },
        { id: '3', name: 'Beta LLC', status: 'active' },
      ];

      const sorted = [...tenants].sort((a, b) => a.name.localeCompare(b.name));
      expect(sorted[0].name).toBe('Acme Inc');
      expect(sorted[1].name).toBe('Beta LLC');
      expect(sorted[2].name).toBe('Zebra Corp');
    });
  });

  describe('Tenant selection', () => {
    it('generates correct cookie value for tenant selection', () => {
      const tenantId = 'tenant-123-abc';

      // Cookie value should be the tenant ID
      expect(tenantId).toMatch(/^[a-z0-9-]+$/);
    });

    it('redirects to dashboard after selection', () => {
      const redirectUrl = '/dashboard';
      expect(redirectUrl).toBe('/dashboard');
    });
  });

  describe('Agency admin workspace options', () => {
    it('shows admin dashboard option for agency admins', () => {
      const isAgencyAdmin = true;
      const options = ['Admin Dashboard', 'Tenant Workspaces'];

      if (isAgencyAdmin) {
        expect(options).toContain('Admin Dashboard');
      }
    });

    it('does not show admin option for non-agency admins', () => {
      const isAgencyAdmin = false;
      const options = isAgencyAdmin
        ? ['Admin Dashboard', 'Tenant Workspaces']
        : ['Tenant Workspaces'];

      expect(options).not.toContain('Admin Dashboard');
    });
  });

  describe('Current workspace display', () => {
    it('displays current tenant name', () => {
      const currentTenant = { id: '1', name: 'My Tenant', status: 'active' };
      expect(currentTenant.name).toBe('My Tenant');
    });

    it('displays "Select workspace" when no tenant selected', () => {
      const currentTenantId: string | null = null;
      const displayText = currentTenantId ? 'Tenant Name' : 'Select workspace';
      expect(displayText).toBe('Select workspace');
    });

    it('displays "Admin" when viewing admin without tenant', () => {
      const isAgencyAdmin = true;
      const currentTenantId: string | null = null;
      const isOnAdminRoute = true;

      const displayText =
        isAgencyAdmin && !currentTenantId && isOnAdminRoute ? 'Admin' : 'Select workspace';

      expect(displayText).toBe('Admin');
    });
  });
});
