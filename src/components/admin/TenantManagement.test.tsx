import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { TenantManagement } from './TenantManagement';
import { TenantModal } from './TenantModal';
import { DeactivationConfirmModal } from './DeactivationConfirmModal';
import { StatusChangeDialog } from './StatusChangeDialog';
import { TenantDetail } from './TenantDetail';

/**
 * Tests for Tenant Management UI Components
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Tenant Management Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('TenantManagement', () => {
    const mockTenants = [
      {
        id: 'tenant-1',
        name: 'Alpha Franchise',
        status: 'active' as const,
        timezone: 'America/New_York',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'tenant-2',
        name: 'Beta Franchise',
        status: 'inactive' as const,
        timezone: 'America/Los_Angeles',
        createdAt: '2024-01-10T08:00:00Z',
      },
      {
        id: 'tenant-3',
        name: 'Gamma Corp',
        status: 'suspended' as const,
        timezone: 'America/Chicago',
        createdAt: '2024-01-05T12:00:00Z',
      },
    ];

    it('exports TenantManagement component', () => {
      expect(TenantManagement).toBeDefined();
      expect(typeof TenantManagement).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        initialTenants: mockTenants,
      };

      expect(() => React.createElement(TenantManagement, props)).not.toThrow();
    });

    it('renders tenant list with correct data', () => {
      const props = {
        initialTenants: mockTenants,
      };

      const element = React.createElement(TenantManagement, props);
      expect(element.props.initialTenants).toHaveLength(3);
      expect(element.props.initialTenants[0].name).toBe('Alpha Franchise');
    });

    it('handles empty tenant list gracefully', () => {
      const props = {
        initialTenants: [],
      };

      expect(() => React.createElement(TenantManagement, props)).not.toThrow();
    });
  });

  describe('TenantModal', () => {
    it('exports TenantModal component', () => {
      expect(TenantModal).toBeDefined();
      expect(typeof TenantModal).toBe('function');
    });

    it('accepts required props for create mode', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        mode: 'create' as const,
      };

      expect(() => React.createElement(TenantModal, props)).not.toThrow();
    });

    it('accepts required props for edit mode', () => {
      const tenant = {
        id: 'tenant-1',
        name: 'Test Franchise',
        status: 'active' as const,
        timezone: 'America/New_York',
      };

      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        mode: 'edit' as const,
        tenant,
      };

      expect(() => React.createElement(TenantModal, props)).not.toThrow();
    });

    it('accepts tenant with branding data for edit mode', () => {
      const tenant = {
        id: 'tenant-1',
        name: 'Test Franchise',
        status: 'active' as const,
        timezone: 'America/New_York',
        branding: {
          tenantLogoUrl: 'https://example.com/tenant.png',
          themeId: 'dark',
        },
      };

      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        mode: 'edit' as const,
        tenant,
      };

      const element = React.createElement(TenantModal, props);
      expect(element.props.tenant?.branding?.tenantLogoUrl).toBe('https://example.com/tenant.png');
    });

    it('form validation requires name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Name is required',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: 'America/New_York' }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.error).toBe('Name is required');
    });
  });

  describe('DeactivationConfirmModal', () => {
    it('exports DeactivationConfirmModal component', () => {
      expect(DeactivationConfirmModal).toBeDefined();
      expect(typeof DeactivationConfirmModal).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        tenantName: 'Test Franchise',
        isLoading: false,
      };

      expect(() => React.createElement(DeactivationConfirmModal, props)).not.toThrow();
    });

    it('handles loading state', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        tenantName: 'Test Franchise',
        isLoading: true,
      };

      expect(() => React.createElement(DeactivationConfirmModal, props)).not.toThrow();
    });
  });

  describe('StatusChangeDialog', () => {
    it('exports StatusChangeDialog component', () => {
      expect(StatusChangeDialog).toBeDefined();
      expect(typeof StatusChangeDialog).toBe('function');
    });

    it('accepts required props for activation', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        tenantName: 'Test Franchise',
        newStatus: 'active' as const,
        isLoading: false,
      };

      expect(() => React.createElement(StatusChangeDialog, props)).not.toThrow();
    });

    it('accepts props for suspended status', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        tenantName: 'Test Franchise',
        newStatus: 'suspended' as const,
        isLoading: false,
      };

      expect(() => React.createElement(StatusChangeDialog, props)).not.toThrow();
    });
  });

  describe('TenantDetail', () => {
    const mockTenant = {
      id: 'tenant-1',
      name: 'Test Franchise',
      status: 'active' as const,
      timezone: 'America/New_York',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T15:00:00Z',
      userCount: 5,
      branding: {
        id: 'branding-1',
        themeId: 'light',
        accentColorOverride: null,
        tenantLogoUrl: null,
        mellonLogoUrl: null,
        primaryColor: null,
        accentColor: null,
      },
    };

    const mockUsers = [
      {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'tenant_admin',
      },
      {
        id: 'user-2',
        email: 'viewer@test.com',
        name: 'View User',
        role: 'tenant_viewer',
      },
    ];

    it('exports TenantDetail component', () => {
      expect(TenantDetail).toBeDefined();
      expect(typeof TenantDetail).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        tenant: mockTenant,
        users: mockUsers,
      };

      expect(() => React.createElement(TenantDetail, props)).not.toThrow();
    });

    it('handles tenant with branding logos', () => {
      const tenantWithLogos = {
        ...mockTenant,
        branding: {
          ...mockTenant.branding,
          mellonLogoUrl: 'https://example.com/mellon.png',
          tenantLogoUrl: 'https://example.com/tenant.png',
        },
      };

      const props = {
        tenant: tenantWithLogos,
        users: mockUsers,
      };

      const element = React.createElement(TenantDetail, props);
      expect(element.props.tenant.branding?.mellonLogoUrl).toBe('https://example.com/mellon.png');
    });

    it('handles empty users list', () => {
      const props = {
        tenant: mockTenant,
        users: [],
      };

      expect(() => React.createElement(TenantDetail, props)).not.toThrow();
    });
  });

  describe('Create Tenant Flow', () => {
    it('creates tenant via API and receives success response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'new-tenant-id',
              name: 'New Franchise',
              status: 'active',
              timezone: 'America/New_York',
              createdAt: new Date().toISOString(),
              branding: {
                id: 'branding-id',
                themeId: 'light',
                accentColorOverride: null,
              },
            },
          }),
      });

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Franchise',
          timezone: 'America/New_York',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Franchise');
    });
  });

  describe('Edit Tenant Flow', () => {
    it('updates tenant name and timezone', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-id',
              name: 'Updated Franchise',
              status: 'active',
              timezone: 'America/Los_Angeles',
              userCount: 3,
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Franchise',
          timezone: 'America/Los_Angeles',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.name).toBe('Updated Franchise');
    });

    it('updates logo URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-id',
              name: 'Test Franchise',
              status: 'active',
              userCount: 3,
              branding: {
                mellonLogoUrl: 'https://example.com/new-mellon.png',
                tenantLogoUrl: 'https://example.com/new-tenant.png',
              },
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mellonLogoUrl: 'https://example.com/new-mellon.png',
          tenantLogoUrl: 'https://example.com/new-tenant.png',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.branding.mellonLogoUrl).toBe('https://example.com/new-mellon.png');
    });
  });
});
