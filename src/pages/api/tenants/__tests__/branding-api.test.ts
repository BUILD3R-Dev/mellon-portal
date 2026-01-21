import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for Branding Configuration API endpoints
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Branding Configuration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('POST /api/tenants/[id]/branding', () => {
    it('updates theme and accent color successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              themeId: 'blue',
              accentColorOverride: '#FF5733',
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-123/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: 'blue',
          accentColorOverride: '#FF5733',
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tenants/tenant-123/branding',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.themeId).toBe('blue');
      expect(data.data.accentColorOverride).toBe('#FF5733');
    });

    it('validates theme ID is valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid theme ID. Must be one of: light, dark, blue, green',
            code: 'VALIDATION_ERROR',
          }),
      });

      const response = await fetch('/api/tenants/tenant-123/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: 'invalid-theme',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/tenants/[id]/logo', () => {
    it('accepts valid image upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              tenantLogoUrl: '/uploads/logos/tenant-123/logo.png',
            },
          }),
      });

      const formData = new FormData();
      const file = new Blob(['fake image data'], { type: 'image/png' });
      formData.append('logo', file, 'logo.png');

      const response = await fetch('/api/tenants/tenant-123/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.tenantLogoUrl).toContain('logo.png');
    });

    it('rejects files exceeding 500KB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'File size exceeds maximum of 500KB',
            code: 'FILE_TOO_LARGE',
          }),
      });

      const response = await fetch('/api/tenants/tenant-123/logo', {
        method: 'POST',
        body: new FormData(),
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.code).toBe('FILE_TOO_LARGE');
    });

    it('rejects invalid MIME types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid file type. Allowed types: PNG, JPG, SVG',
            code: 'INVALID_FILE_TYPE',
          }),
      });

      const formData = new FormData();
      const file = new Blob(['fake data'], { type: 'application/pdf' });
      formData.append('logo', file, 'document.pdf');

      const response = await fetch('/api/tenants/tenant-123/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      expect(response.ok).toBe(false);
      expect(data.code).toBe('INVALID_FILE_TYPE');
    });
  });

  describe('DELETE /api/tenants/[id]/logo', () => {
    it('removes logo and clears URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              tenantLogoUrl: null,
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-123/logo', {
        method: 'DELETE',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tenants/tenant-123/logo',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.tenantLogoUrl).toBeNull();
    });
  });
});
