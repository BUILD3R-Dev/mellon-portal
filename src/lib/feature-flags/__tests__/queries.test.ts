/**
 * Tests for feature flags and dashboard data query functions
 *
 * Task Group 2.1: 6 focused tests for query layer
 * - isFeatureEnabled returns true for an enabled flag
 * - isFeatureEnabled returns false for a disabled or non-existent flag
 * - setFeatureFlag creates a new flag and updates an existing one (upsert)
 * - getFeatureFlagsForTenant returns all flags for a tenant
 * - getKPIDataForReportWeek returns correct KPI shape for a given report week
 * - getPipelineDataForReportWeek returns pipeline-by-stage and lead trends data
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module for feature flag tests
vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
    },
    featureFlags: {
      tenantId: 'tenant_id',
      featureKey: 'feature_key',
      enabled: 'enabled',
    },
    pipelineStageCounts: {
      tenantId: 'tenant_id',
      reportWeekId: 'report_week_id',
      stage: 'stage',
    },
    leadMetrics: {
      tenantId: 'tenant_id',
      reportWeekId: 'report_week_id',
      dimensionType: 'dimension_type',
      leads: 'leads',
      createdAt: 'created_at',
    },
    reportWeeks: {
      id: 'id',
      weekEndingDate: 'week_ending_date',
    },
  };
});

import { db } from '@/lib/db';

describe('isFeatureEnabled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true for an enabled flag', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ enabled: true }]),
        }),
      }),
    } as any);

    const { isFeatureEnabled } = await import('../queries');
    const result = await isFeatureEnabled('tenant-abc', 'pdf_export');

    expect(result).toBe(true);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns false for a disabled or non-existent flag', async () => {
    // Test disabled flag
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ enabled: false }]),
        }),
      }),
    } as any);

    const { isFeatureEnabled } = await import('../queries');
    let result = await isFeatureEnabled('tenant-abc', 'pdf_export');
    expect(result).toBe(false);

    // Test non-existent flag (empty result)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    result = await isFeatureEnabled('tenant-abc', 'nonexistent_flag');
    expect(result).toBe(false);
  });
});

describe('setFeatureFlag', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a new flag and updates an existing one (upsert)', async () => {
    const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });

    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any);

    const { setFeatureFlag } = await import('../queries');

    // Create a new flag
    await setFeatureFlag('tenant-abc', 'pdf_export', true);

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      tenantId: 'tenant-abc',
      featureKey: 'pdf_export',
      enabled: true,
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          enabled: true,
        }),
      })
    );

    // Update existing flag (call again with different value)
    vi.clearAllMocks();

    const mockOnConflictDoUpdate2 = vi.fn().mockResolvedValue(undefined);
    const mockValues2 = vi.fn().mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate2,
    });

    vi.mocked(db.insert).mockReturnValue({
      values: mockValues2,
    } as any);

    await setFeatureFlag('tenant-abc', 'pdf_export', false);

    expect(mockValues2).toHaveBeenCalledWith({
      tenantId: 'tenant-abc',
      featureKey: 'pdf_export',
      enabled: false,
    });
    expect(mockOnConflictDoUpdate2).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });
});

describe('getFeatureFlagsForTenant', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns all flags for a tenant', async () => {
    const mockFlags = [
      { featureKey: 'pdf_export', enabled: true },
      { featureKey: 'advanced_analytics', enabled: false },
    ];

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockFlags),
      }),
    } as any);

    const { getFeatureFlagsForTenant } = await import('../queries');
    const result = await getFeatureFlagsForTenant('tenant-abc');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ featureKey: 'pdf_export', enabled: true });
    expect(result[1]).toEqual({ featureKey: 'advanced_analytics', enabled: false });
  });
});

describe('getKPIData (dashboard queries)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns correct KPI shape for a given report week', async () => {
    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // New leads aggregation for snapshot mode
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalLeads: 15 }]),
          }),
        };
      }
      // Pipeline stage counts for snapshot mode
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { stage: 'New Lead', count: 40, dollarValue: '80000.00' },
            { stage: 'QR Returned', count: 8, dollarValue: '45000.00' },
            { stage: 'FDD Sent', count: 3, dollarValue: '70000.00' },
          ]),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { getKPIData } = await import('../../dashboard/queries');
    const result = await getKPIData('tenant-abc', 'report-week-123');

    expect(result).toHaveProperty('newLeads');
    expect(result).toHaveProperty('totalPipeline');
    expect(result).toHaveProperty('priorityCandidates');
    expect(result).toHaveProperty('weightedPipelineValue');

    expect(result.newLeads).toBe(15);
    // 40 + 8 + 3 = 51
    expect(result.totalPipeline).toBe(51);
    // QR Returned (8) + FDD Sent (3) = 11
    expect(result.priorityCandidates).toBe(11);
    // All stages in FULL_PIPELINE: 80000 + 45000 + 70000 = 195000
    expect(result.weightedPipelineValue).toBe('195000.00');
  });
});

describe('getPipelineByStage and getLeadTrends (dashboard queries)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns pipeline-by-stage and lead trends data', async () => {
    let selectCallCount = 0;

    const mockSelect = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Pipeline by stage query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { stage: 'New Lead', count: 25, dollarValue: '50000.00' },
              { stage: 'FDD Sent', count: 7, dollarValue: '35000.00' },
            ]),
          }),
        };
      }
      // Lead trends query (with join)
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { weekEndingDate: '2026-02-07', leads: 20 },
                  { weekEndingDate: '2026-01-31', leads: 18 },
                  { weekEndingDate: '2026-01-24', leads: 12 },
                ]),
              }),
            }),
          }),
        }),
      };
    });

    vi.mocked(db.select).mockImplementation(mockSelect);

    const { getPipelineByStage, getLeadTrends } = await import('../../dashboard/queries');

    // Test pipeline by stage
    const pipelineData = await getPipelineByStage('tenant-abc');
    expect(Array.isArray(pipelineData)).toBe(true);
    expect(pipelineData).toHaveLength(2);
    expect(pipelineData[0]).toEqual({ stage: 'New Lead', count: 25 });
    expect(pipelineData[1]).toEqual({ stage: 'FDD Sent', count: 7 });

    // Test lead trends
    const leadTrends = await getLeadTrends('tenant-abc', 3);
    expect(Array.isArray(leadTrends)).toBe(true);
    expect(leadTrends).toHaveLength(3);

    // Should be sorted chronologically ascending
    expect(leadTrends[0]).toEqual({ source: '2026-01-24', leads: 12 });
    expect(leadTrends[1]).toEqual({ source: '2026-01-31', leads: 18 });
    expect(leadTrends[2]).toEqual({ source: '2026-02-07', leads: 20 });
  });
});
