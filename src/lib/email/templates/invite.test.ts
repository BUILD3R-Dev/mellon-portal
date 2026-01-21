import { describe, it, expect } from 'vitest';
import { generateInviteEmail } from './invite';

describe('Invite Email Template', () => {
  const baseParams = {
    inviteLink: 'https://example.com/invite/accept?token=abc123',
    recipientEmail: 'user@example.com',
    expirationDays: 7,
  };

  describe('generateInviteEmail', () => {
    it('generates correct subject line', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.subject).toBe("You've been invited to Mellon Portal");
    });

    it('includes invite link in HTML body', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.htmlBody).toContain(baseParams.inviteLink);
    });

    it('includes invite link in text body', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.textBody).toContain(baseParams.inviteLink);
    });

    it('includes tenant name when provided', () => {
      const paramsWithTenant = {
        ...baseParams,
        tenantName: 'Acme Corp',
      };

      const result = generateInviteEmail(paramsWithTenant);
      expect(result.htmlBody).toContain('Acme Corp');
      expect(result.textBody).toContain('Acme Corp');
    });

    it('uses admin message when no tenant name provided', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.textBody).toContain('as an administrator');
    });

    it('includes expiration notice with correct days', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.htmlBody).toContain('expire in 7 days');
      expect(result.textBody).toContain('expire in 7 days');
    });

    it('includes recipient email in footer', () => {
      const result = generateInviteEmail(baseParams);
      expect(result.htmlBody).toContain(baseParams.recipientEmail);
      expect(result.textBody).toContain(baseParams.recipientEmail);
    });

    it('escapes HTML special characters in tenant name', () => {
      const paramsWithSpecialChars = {
        ...baseParams,
        tenantName: '<script>alert("xss")</script>',
      };

      const result = generateInviteEmail(paramsWithSpecialChars);
      expect(result.htmlBody).not.toContain('<script>');
      expect(result.htmlBody).toContain('&lt;script&gt;');
    });
  });
});
