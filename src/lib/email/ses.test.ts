import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendEmail, createSESClient, resetSESClient } from './ses';

// Mock AWS SDK with proper class syntax
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: class MockSESClient {
      send = mockSend;
    },
    SendEmailCommand: class MockSendEmailCommand {
      constructor(public params: unknown) {}
    },
  };
});

describe('Email Service - SES', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetSESClient();
    mockSend.mockClear();
    process.env = {
      ...originalEnv,
      AWS_SES_REGION: 'us-east-1',
      AWS_SES_ACCESS_KEY: 'test-access-key',
      AWS_SES_SECRET_KEY: 'test-secret-key',
      AWS_SES_FROM_EMAIL: 'noreply@example.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSESClient', () => {
    it('initializes SES client with environment variables', () => {
      const client = createSESClient();
      expect(client).not.toBeNull();
    });

    it('returns null when required environment variables are missing', () => {
      delete process.env.AWS_SES_REGION;
      resetSESClient();

      const client = createSESClient();
      expect(client).toBeNull();
    });
  });

  describe('sendEmail', () => {
    it('returns success for valid inputs', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'test-message-id-123' });

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test text',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toBe('test-message-id-123');
      }
    });

    it('returns validation error for invalid email address', async () => {
      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test text',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.error).toContain('Invalid recipient email');
      }
    });

    it('handles SES send errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('SES rate limit exceeded'));

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test text',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SEND_ERROR');
        expect(result.error).toContain('SES rate limit exceeded');
      }
    });

    it('returns configuration error when SES is not configured', async () => {
      delete process.env.AWS_SES_ACCESS_KEY;
      resetSESClient();

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test text',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('CONFIGURATION_ERROR');
      }
    });
  });
});
