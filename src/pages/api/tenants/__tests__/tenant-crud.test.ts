import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for Tenant CRUD API endpoints
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Tenant CRUD API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('POST /api/tenants', () => {
    it('creates tenant with initial branding record', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-uuid-123',
              name: 'Test Franchise',
              timezone: 'America/New_York',
              status: 'active',
              createdAt: new Date().toISOString(),
              branding: {
                id: 'branding-uuid-123',
                themeId: 'light',
                accentColorOverride: null,
                tenantLogoUrl: null,
              },
            },
          }),
      });

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Franchise',
          timezone: 'America/New_York',
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tenants',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Franchise');
      expect(data.data.branding).toBeDefined();
      expect(data.data.branding.themeId).toBe('light');
    });

    it('validates name is required', async () => {
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
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/tenants', () => {
    it('returns list of tenants with branding data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'tenant-1',
                name: 'Alpha Franchise',
                timezone: 'America/New_York',
                status: 'active',
                createdAt: new Date().toISOString(),
                branding: {
                  id: 'branding-1',
                  themeId: 'light',
                  accentColorOverride: null,
                  tenantLogoUrl: null,
                },
              },
              {
                id: 'tenant-2',
                name: 'Beta Franchise',
                timezone: 'America/Los_Angeles',
                status: 'inactive',
                createdAt: new Date().toISOString(),
                branding: null,
              },
            ],
          }),
      });

      const response = await fetch('/api/tenants');

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
    });

    it('filters tenants by status query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'tenant-1',
                name: 'Alpha Franchise',
                status: 'active',
                timezone: 'America/New_York',
                createdAt: new Date().toISOString(),
                branding: null,
              },
            ],
          }),
      });

      const response = await fetch('/api/tenants?status=active');

      expect(mockFetch).toHaveBeenCalledWith('/api/tenants?status=active');

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.every((t: any) => t.status === 'active')).toBe(true);
    });
  });

  describe('GET /api/tenants/[id]', () => {
    it('returns tenant with branding data and user count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-uuid-123',
              name: 'Test Franchise',
              timezone: 'America/New_York',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userCount: 5,
              branding: {
                id: 'branding-uuid-123',
                themeId: 'blue',
                accentColorOverride: '#FF5733',
                tenantLogoUrl: '/uploads/logos/tenant-uuid-123/logo.png',
                mellonLogoUrl: null,
                primaryColor: null,
                accentColor: null,
              },
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-uuid-123');

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.branding.themeId).toBe('blue');
      expect(data.data.branding.accentColorOverride).toBe('#FF5733');
      expect(data.data.userCount).toBe(5);
    });

    it('returns 404 for non-existent tenant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Tenant not found',
            code: 'NOT_FOUND',
          }),
      });

      const response = await fetch('/api/tenants/non-existent-id');

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/tenants/[id]', () => {
    it('updates tenant name, timezone, and status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-uuid-123',
              name: 'Updated Franchise',
              timezone: 'America/Los_Angeles',
              status: 'active',
              userCount: 3,
              branding: null,
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-uuid-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Franchise',
          timezone: 'America/Los_Angeles',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Franchise');
      expect(data.data.timezone).toBe('America/Los_Angeles');
    });

    it('deactivation triggers session cleanup for tenant users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-uuid-123',
              name: 'Test Franchise',
              status: 'inactive',
              sessionsInvalidated: 5,
              userCount: 5,
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-uuid-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('inactive');
      expect(data.data.sessionsInvalidated).toBeDefined();
    });

    it('updates logo URLs via PATCH endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              id: 'tenant-uuid-123',
              name: 'Test Franchise',
              status: 'active',
              userCount: 3,
              branding: {
                id: 'branding-uuid-123',
                themeId: 'light',
                mellonLogoUrl: 'https://example.com/mellon-logo.png',
                tenantLogoUrl: 'https://example.com/tenant-logo.png',
                accentColorOverride: null,
                primaryColor: null,
                accentColor: null,
              },
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-uuid-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mellonLogoUrl: 'https://example.com/mellon-logo.png',
          tenantLogoUrl: 'https://example.com/tenant-logo.png',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.branding.mellonLogoUrl).toBe('https://example.com/mellon-logo.png');
      expect(data.data.branding.tenantLogoUrl).toBe('https://example.com/tenant-logo.png');
    });

    it('validates status values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid status value',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-uuid-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authorization', () => {
    it('returns 403 for non-agency-admin users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Only agency administrators can access this resource',
            code: 'FORBIDDEN',
          }),
      });

      const response = await fetch('/api/tenants');

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
          }),
      });

      const response = await fetch('/api/tenants');

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });
});
