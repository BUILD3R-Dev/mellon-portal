import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSyncRun,
  updateSyncRunStatus,
  storeRawSnapshot,
  fetchWithRetry,
  getTenantsWithWebKey,
  normalizePipelineStages,
  createWeeklySnapshot,
  syncTenant,
} from '../sync';

/**
 * Tests for sync worker functionality
 * Verifies sync run tracking, raw snapshot storage, retry logic, tenant filtering,
 * pipeline dollar values, weekly snapshots, and per-tenant access tokens
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

  describe('normalizePipelineStages dollar values', () => {
    it('sums value from opportunities and writes dollarValue per stage', async () => {
      const insertedValues: any[] = [];
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((vals: any) => {
            insertedValues.push(vals);
            return { returning: vi.fn().mockResolvedValue([vals]) };
          }),
        }),
      };

      const opportunities = [
        { id: '1', stage: 'New Lead', value: 50000, contact_type: '1' },
        { id: '2', stage: 'New Lead', value: 30000, contact_type: '1' },
        { id: '3', stage: 'FDD Sent', value: 90000, contact_type: '1' },
      ];

      await normalizePipelineStages(mockDb as any, 'tenant-abc', opportunities);

      const newLeadInsert = insertedValues.find((v) => v.stage === 'New Lead');
      const fddSentInsert = insertedValues.find((v) => v.stage === 'FDD Sent');

      expect(newLeadInsert).toBeDefined();
      expect(newLeadInsert.count).toBe(2);
      expect(newLeadInsert.dollarValue).toBe('80000');

      expect(fddSentInsert).toBeDefined();
      expect(fddSentInsert.count).toBe(1);
      expect(fddSentInsert.dollarValue).toBe('90000');
    });

    it('writes 0 for dollarValue when opportunities have no value field', async () => {
      const insertedValues: any[] = [];
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((vals: any) => {
            insertedValues.push(vals);
            return { returning: vi.fn().mockResolvedValue([vals]) };
          }),
        }),
      };

      const opportunities = [
        { id: '1', stage: 'New Lead', contact_type: '1' },
        { id: '2', stage: 'New Lead', contact_type: '1' },
      ];

      await normalizePipelineStages(mockDb as any, 'tenant-abc', opportunities);

      const newLeadInsert = insertedValues.find((v) => v.stage === 'New Lead');
      expect(newLeadInsert).toBeDefined();
      expect(newLeadInsert.count).toBe(2);
      expect(newLeadInsert.dollarValue).toBe('0');
    });
  });

  describe('createWeeklySnapshot', () => {
    it('inserts leadMetrics rows linked to a reportWeekId', async () => {
      const insertedValues: any[] = [];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: any) => {
            // Return different data depending on which table is queried
            const tableName = table?.constructor?.name || '';
            return {
              where: vi.fn().mockImplementation(() => {
                // First call is for leadMetrics, second for pipelineStageCounts
                const callCount = mockDb.select.mock.calls.length;
                if (callCount <= 1) {
                  // leadMetrics rows
                  return Promise.resolve([
                    {
                      id: 'lm-1',
                      tenantId: 'tenant-abc',
                      reportWeekId: null,
                      dimensionType: 'source',
                      dimensionValue: 'web',
                      clicks: 10,
                      impressions: 100,
                      cost: '50.00',
                      leads: 5,
                      qualifiedLeads: 2,
                    },
                  ]);
                }
                // pipelineStageCounts rows
                return Promise.resolve([]);
              }),
            };
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((vals: any) => {
            insertedValues.push(vals);
            return { returning: vi.fn().mockResolvedValue([vals]) };
          }),
        }),
      };

      const count = await createWeeklySnapshot(mockDb as any, 'tenant-abc', 'rw-123');

      expect(count).toBe(1);
      const leadMetricInsert = insertedValues.find((v) => v.dimensionType === 'source');
      expect(leadMetricInsert).toBeDefined();
      expect(leadMetricInsert.reportWeekId).toBe('rw-123');
      expect(leadMetricInsert.tenantId).toBe('tenant-abc');
      expect(leadMetricInsert.leads).toBe(5);
    });

    it('inserts pipelineStageCounts rows linked to a reportWeekId', async () => {
      const insertedValues: any[] = [];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => {
              const callCount = mockDb.select.mock.calls.length;
              if (callCount <= 1) {
                // leadMetrics rows - empty
                return Promise.resolve([]);
              }
              // pipelineStageCounts rows
              return Promise.resolve([
                {
                  id: 'psc-1',
                  tenantId: 'tenant-abc',
                  reportWeekId: null,
                  stage: 'New Lead',
                  count: 10,
                  dollarValue: '50000',
                },
                {
                  id: 'psc-2',
                  tenantId: 'tenant-abc',
                  reportWeekId: null,
                  stage: 'FDD Sent',
                  count: 3,
                  dollarValue: '90000',
                },
              ]);
            }),
          })),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((vals: any) => {
            insertedValues.push(vals);
            return { returning: vi.fn().mockResolvedValue([vals]) };
          }),
        }),
      };

      const count = await createWeeklySnapshot(mockDb as any, 'tenant-abc', 'rw-456');

      expect(count).toBe(2);

      const newLeadSnapshot = insertedValues.find((v) => v.stage === 'New Lead');
      expect(newLeadSnapshot).toBeDefined();
      expect(newLeadSnapshot.reportWeekId).toBe('rw-456');
      expect(newLeadSnapshot.count).toBe(10);
      expect(newLeadSnapshot.dollarValue).toBe('50000');

      const fddSentSnapshot = insertedValues.find((v) => v.stage === 'FDD Sent');
      expect(fddSentSnapshot).toBeDefined();
      expect(fddSentSnapshot.reportWeekId).toBe('rw-456');
      expect(fddSentSnapshot.count).toBe(3);
    });
  });

  describe('syncTenant per-tenant access token', () => {
    it('passes per-tenant clienttetherAccessToken to the client factory', async () => {
      // Mock the createClientTetherClient module
      const mockClient = {
        getLeads: vi.fn().mockResolvedValue({ data: [] }),
        getOpportunities: vi.fn().mockResolvedValue({ data: [] }),
        getSalesCycles: vi.fn().mockResolvedValue({ data: [] }),
        getNotes: vi.fn().mockResolvedValue({ data: [] }),
        getScheduledActivities: vi.fn().mockResolvedValue({ data: [] }),
      };

      // We need to mock the module-level import
      const clientModule = await import('../../src/lib/clienttether/client');
      const createClientSpy = vi.spyOn(clientModule, 'createClientTetherClient').mockReturnValue(mockClient as any);

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'snapshot-1' }]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };

      const tenant = {
        id: 'tenant-abc',
        name: 'Test Tenant',
        clienttetherWebKey: 'web-key-123',
        clienttetherAccessToken: 'tenant-specific-token',
        status: 'active' as const,
      };

      await syncTenant(mockDb as any, tenant);

      expect(createClientSpy).toHaveBeenCalledWith('web-key-123', 'tenant-specific-token');

      createClientSpy.mockRestore();
    });
  });
});
