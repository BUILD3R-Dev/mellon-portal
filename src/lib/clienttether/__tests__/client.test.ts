import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientTetherClient, createClientTetherClient } from '../client';

describe('ClientTether API Client', () => {
  const mockConfig = {
    apiUrl: 'https://api.clienttether.com',
    accessToken: 'test-access-token',
    webKey: 'test-web-key',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getNotes', () => {
    it('returns expected response shape with notes data', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          contact_id: 'contact-123',
          date: '2026-01-20T10:00:00Z',
          author: 'John Doe',
          content: 'Test note content',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNotes),
      });

      const client = new ClientTetherClient(mockConfig);
      const result = await client.getNotes({ contactId: 'contact-123' });

      expect(result.data).toEqual(mockNotes);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getScheduledActivities', () => {
    it('returns expected response shape with activities data', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'call',
          scheduled_at: '2026-01-25T14:00:00Z',
          contact_name: 'Jane Smith',
          description: 'Follow-up call',
          status: 'scheduled',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      const client = new ClientTetherClient(mockConfig);
      const result = await client.getScheduledActivities({
        startDate: '2026-01-20',
        endDate: '2026-01-31',
      });

      expect(result.data).toEqual(mockActivities);
      expect(result.error).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns error for failed API calls', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const client = new ClientTetherClient(mockConfig);
      const result = await client.getNotes();

      expect(result.data).toBeNull();
      expect(result.error).toContain('API Error: 401');
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('webKey header', () => {
    it('includes X-Web-Key header in requests when webKey is provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = new ClientTetherClient(mockConfig);
      await client.getNotes();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Web-Key': 'test-web-key',
          }),
        })
      );
    });

    it('does not include X-Web-Key header when webKey is not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = new ClientTetherClient({
        apiUrl: mockConfig.apiUrl,
        accessToken: mockConfig.accessToken,
      });
      await client.getNotes();

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1] as RequestInit).headers as Record<string, string>;
      expect(headers['X-Web-Key']).toBeUndefined();
    });
  });
});
