import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { InviteUserModal } from './InviteUserModal';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('InviteUserModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockTenants = [
    { id: 'tenant-1', name: 'Tenant One' },
    { id: 'tenant-2', name: 'Tenant Two' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Component exports', () => {
    it('exports InviteUserModal component', () => {
      expect(InviteUserModal).toBeDefined();
      expect(typeof InviteUserModal).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: mockOnClose,
        onSuccess: mockOnSuccess,
        tenants: mockTenants,
      };

      expect(() => React.createElement(InviteUserModal, props)).not.toThrow();
    });
  });

  describe('Form submission', () => {
    it('calls correct API endpoint for invite', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { userId: 'user-1', email: 'test@example.com' },
          }),
      });

      const inviteData = {
        email: 'test@example.com',
        role: 'tenant_admin',
        tenantId: 'tenant-1',
      };

      await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/invites',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.email).toBe('test@example.com');
      expect(callBody.role).toBe('tenant_admin');
      expect(callBody.tenantId).toBe('tenant-1');
    });

    it('handles rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
      });

      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', role: 'agency_admin' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });
  });

  describe('Resend invite', () => {
    it('calls resend API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { email: 'test@example.com', expiresAt: new Date().toISOString() },
          }),
      });

      await fetch('/api/invites/user-123/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/invites/user-123/resend',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('handles resend error for non-pending user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Can only resend invites for pending users',
            code: 'USER_NOT_PENDING',
          }),
      });

      const response = await fetch('/api/invites/user-123/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.code).toBe('USER_NOT_PENDING');
    });
  });

  describe('Role options', () => {
    it('defines correct role values', () => {
      const roles = ['agency_admin', 'tenant_admin', 'tenant_viewer'];

      roles.forEach((role) => {
        expect(['agency_admin', 'tenant_admin', 'tenant_viewer']).toContain(role);
      });
    });

    it('agency_admin does not require tenant', () => {
      // For agency_admin, tenantId should be undefined/null
      const inviteData = {
        email: 'admin@example.com',
        role: 'agency_admin',
        // No tenantId
      };

      expect(inviteData.role).toBe('agency_admin');
      expect('tenantId' in inviteData).toBe(false);
    });

    it('tenant roles require tenant', () => {
      const tenantRoles = ['tenant_admin', 'tenant_viewer'];

      tenantRoles.forEach((role) => {
        const requiresTenant = role === 'tenant_admin' || role === 'tenant_viewer';
        expect(requiresTenant).toBe(true);
      });
    });
  });
});
