/**
 * Tests for report week query functions
 *
 * Task Group 2.1: Write 3 focused tests for reportWeekManual eager creation
 * - Test that creating a report week also creates reportWeekManual record
 * - Test that reportWeekManual fields are initialized as null
 * - Test that getReportWeekManualByReportWeekId returns correct data
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => {
  const mockReportWeek = {
    id: 'test-report-week-id',
    tenantId: 'test-tenant-id',
    weekEndingDate: '2024-01-19',
    periodStartAt: new Date('2024-01-13'),
    periodEndAt: new Date('2024-01-20'),
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    publishedBy: null,
  };

  const mockReportWeekManual = {
    id: 'test-manual-id',
    reportWeekId: 'test-report-week-id',
    narrativeRich: null,
    initiativesRich: null,
    needsRich: null,
    discoveryDaysRich: null,
    updatedAt: new Date(),
  };

  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn()
      .mockResolvedValueOnce([mockReportWeek])
      .mockResolvedValueOnce([mockReportWeekManual]),
  };

  return {
    db: {
      transaction: vi.fn(async (callback) => callback(mockTx)),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockReportWeekManual]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    },
    reportWeeks: {
      id: 'id',
      tenantId: 'tenant_id',
    },
    reportWeekManual: {
      id: 'id',
      reportWeekId: 'report_week_id',
    },
  };
});

describe('createReportWeek with eager reportWeekManual creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates both report week and reportWeekManual record atomically', async () => {
    const { createReportWeek } = await import('../queries');
    const { db } = await import('@/lib/db');

    const data = {
      tenantId: 'test-tenant-id',
      weekEndingDate: '2024-01-19',
      periodStartAt: new Date('2024-01-13'),
      periodEndAt: new Date('2024-01-20'),
    };

    const result = await createReportWeek(data);

    // Verify transaction was used
    expect(db.transaction).toHaveBeenCalled();

    // Verify report week was created with correct data
    expect(result).toBeDefined();
    expect(result.id).toBe('test-report-week-id');
    expect(result.tenantId).toBe('test-tenant-id');
  });

  it('initializes reportWeekManual fields as null', async () => {
    const { createReportWeek } = await import('../queries');
    const { db } = await import('@/lib/db');

    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn()
        .mockResolvedValueOnce([{
          id: 'test-report-week-id',
          tenantId: 'test-tenant-id',
        }])
        .mockResolvedValueOnce([{
          id: 'test-manual-id',
          reportWeekId: 'test-report-week-id',
          narrativeRich: null,
          initiativesRich: null,
          needsRich: null,
          discoveryDaysRich: null,
        }]),
    };

    (db.transaction as any).mockImplementation(async (callback: any) => callback(mockTx));

    const data = {
      tenantId: 'test-tenant-id',
      weekEndingDate: '2024-01-19',
      periodStartAt: new Date('2024-01-13'),
      periodEndAt: new Date('2024-01-20'),
    };

    await createReportWeek(data);

    // Verify that reportWeekManual was created with null values
    expect(mockTx.values).toHaveBeenCalledWith(expect.objectContaining({
      narrativeRich: null,
      initiativesRich: null,
      needsRich: null,
      discoveryDaysRich: null,
    }));
  });

  it('uses transaction for atomic creation', async () => {
    const { db } = await import('@/lib/db');
    const { createReportWeek } = await import('../queries');

    const data = {
      tenantId: 'test-tenant-id',
      weekEndingDate: '2024-01-19',
      periodStartAt: new Date('2024-01-13'),
      periodEndAt: new Date('2024-01-20'),
    };

    await createReportWeek(data);

    // Verify transaction was called
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('getReportWeekManualByReportWeekId', () => {
  it('returns reportWeekManual record by report week ID', async () => {
    const { getReportWeekManualByReportWeekId } = await import('../queries');

    const result = await getReportWeekManualByReportWeekId('test-report-week-id');

    expect(result).toBeDefined();
    expect(result.reportWeekId).toBe('test-report-week-id');
    expect(result.narrativeRich).toBeNull();
  });
});

describe('updateReportWeekManual', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import('@/lib/db');

    (db.update as any).mockReturnThis();
    (db.set as any).mockReturnThis();
    (db.where as any).mockReturnThis();
    (db.where as any).mockImplementation(function(this: any) {
      return {
        returning: vi.fn().mockResolvedValue([{
          id: 'test-manual-id',
          reportWeekId: 'test-report-week-id',
          narrativeRich: '<p>Updated narrative</p>',
          initiativesRich: null,
          needsRich: null,
          discoveryDaysRich: null,
          updatedAt: new Date(),
        }]),
      };
    });
  });

  it('updates reportWeekManual fields', async () => {
    const { updateReportWeekManual } = await import('../queries');

    const result = await updateReportWeekManual('test-report-week-id', {
      narrativeRich: '<p>Updated narrative</p>',
    });

    expect(result).toBeDefined();
    expect(result.narrativeRich).toBe('<p>Updated narrative</p>');
  });
});
