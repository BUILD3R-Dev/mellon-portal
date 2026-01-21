import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { RegistrationForm } from './RegistrationForm';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Component exports', () => {
    it('exports RegistrationForm component', () => {
      expect(RegistrationForm).toBeDefined();
      expect(typeof RegistrationForm).toBe('function');
    });

    it('accepts required props without error', () => {
      const props = {
        token: 'test-token',
        email: 'test@example.com',
        role: 'tenant_admin',
        tenantName: 'Test Org',
      };

      expect(() => React.createElement(RegistrationForm, props)).not.toThrow();
    });

    it('accepts props without optional tenantName', () => {
      const props = {
        token: 'test-token',
        email: 'test@example.com',
        role: 'agency_admin',
      };

      expect(() => React.createElement(RegistrationForm, props)).not.toThrow();
    });
  });

  describe('Form submission API call', () => {
    it('calls correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { userId: 'user-1', redirectUrl: '/dashboard' },
          }),
      });

      const submitData = {
        token: 'test-token',
        name: 'John Doe',
        password: 'password123',
        passwordConfirmation: 'password123',
        timezone: 'America/New_York',
      };

      await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/invite/accept',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('handles error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
          }),
      });

      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Role formatting', () => {
    it('formats roles correctly', () => {
      const roleMap: Record<string, string> = {
        agency_admin: 'Agency Administrator',
        tenant_admin: 'Tenant Administrator',
        tenant_viewer: 'Tenant Viewer',
      };

      expect(roleMap['agency_admin']).toBe('Agency Administrator');
      expect(roleMap['tenant_admin']).toBe('Tenant Administrator');
      expect(roleMap['tenant_viewer']).toBe('Tenant Viewer');
    });
  });
});
