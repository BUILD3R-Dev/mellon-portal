import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSyncRun,
  updateSyncRunStatus,
  storeRawSnapshot,
  fetchWithRetry,
  getTenantsWithWebKey,
} from '../sync';

/**
 * Tests for sync worker functionality
 * Verifies sync run tracking, raw snapshot storage, retry logic, and tenant filtering
 */
describe('Sync Worker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sync run tracking', () => {
    it('creates sync_run record at start with status running', async () => {
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'sync-run-123',
                tenantId: 'tenant-abc',
                status: 'running',
                startedAt: new Date(),
              },
            ]),
          }),
        }),
      };

      const result = await createSyncRun(mockDb as any, 'tenant-abc');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'sync-run-123',
        tenantId: 'tenant-abc',
        status: 'running',
      });
    });

    it('updates sync_run status on completion', async () => {
      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'sync-run-123',
                  status: 'success',
                  finishedAt: new Date(),
                  recordsUpdated: 42,
                },
              ]),
            }),
          }),
        }),
      };

      const result = await updateSyncRunStatus(
        mockDb as any,
        'sync-run-123',
        'success',
        { recordsUpdated: 42 }
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 'success',
        recordsUpdated: 42,
      });
    });
  });

  describe('raw snapshot storage', () => {
    it('stores raw snapshots before normalization', async () => {
      const mockPayload = { leads: [{ id: '1', name: 'Test Lead' }] };
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'snapshot-123',
                tenantId: 'tenant-abc',
                endpoint: '/leads',
                payloadJson: mockPayload,
                fetchedAt: new Date(),
              },
            ]),
          }),
        }),
      };

      const result = await storeRawSnapshot(
        mockDb as any,
        'tenant-abc',
        '/leads',
        mockPayload
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toMatchObject({
        endpoint: '/leads',
        payloadJson: mockPayload,
      });
    });
  });

  describe('retry logic', () => {
    it('implements exponential backoff with 1s, 2s, 4s delays', async () => {
      const mockFn = vi.fn();
      mockFn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const resultPromise = fetchWithRetry(mockFn, 3);

      // First call fails immediately
      await vi.advanceTimersByTimeAsync(0);

      // Wait for first retry delay (1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      // Wait for second retry delay (2000ms)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });

      // Verify the delays used (1s, 2s for the two retries)
      const timeoutCalls = setTimeoutSpy.mock.calls;
      expect(timeoutCalls.length).toBeGreaterThanOrEqual(2);
      expect(timeoutCalls[0][1]).toBe(1000); // First retry: 1s
      expect(timeoutCalls[1][1]).toBe(2000); // Second retry: 2s
    });
  });

  describe('tenant filtering', () => {
    it('processes only tenants with clienttetherWebKey', async () => {
      const mockTenants = [
        { id: 'tenant-1', name: 'Tenant 1', clienttetherWebKey: 'key-1', status: 'active' },
        { id: 'tenant-2', name: 'Tenant 2', clienttetherWebKey: null, status: 'active' },
        { id: 'tenant-3', name: 'Tenant 3', clienttetherWebKey: 'key-3', status: 'active' },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              mockTenants[0],
              mockTenants[2],
            ]),
          }),
        }),
      };

      const result = await getTenantsWithWebKey(mockDb as any);

      expect(result).toHaveLength(2);
      expect(result.every((t: any) => t.clienttetherWebKey !== null)).toBe(true);
      expect(result.map((t: any) => t.id)).toEqual(['tenant-1', 'tenant-3']);
    });
  });
});
