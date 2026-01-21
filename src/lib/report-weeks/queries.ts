/**
 * Report Week database query helpers
 *
 * Contains reusable query functions for report week operations
 * including overlap detection and CRUD operations.
 */

import { db, reportWeeks, reportWeekManual } from '@/lib/db';
import { eq, and, ne, or, lte, gte, desc, sql } from 'drizzle-orm';

/**
 * Checks if any existing report week's period overlaps with the given dates
 * for the same tenant.
 *
 * Overlap logic: Two periods overlap if start1 < end2 AND start2 < end1
 * Adjacent weeks (ending Friday, starting next Monday) do NOT overlap.
 *
 * @param tenantId - The tenant ID to check
 * @param periodStart - The start of the new period
 * @param periodEnd - The end of the new period
 * @param excludeId - Optional ID to exclude (for edit operations)
 * @returns true if overlapping week exists, false otherwise
 */
export async function checkOverlappingWeeks(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  excludeId?: string
): Promise<boolean> {
  // Build the base condition
  const conditions = [
    eq(reportWeeks.tenantId, tenantId),
    // Overlap: existing.start < new.end AND new.start < existing.end
    sql`${reportWeeks.periodStartAt} < ${periodEnd}`,
    sql`${periodStart} < ${reportWeeks.periodEndAt}`,
  ];

  // Exclude the current report week when editing
  if (excludeId) {
    conditions.push(ne(reportWeeks.id, excludeId));
  }

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportWeeks)
    .where(and(...conditions));

  return (result[0]?.count || 0) > 0;
}

/**
 * Gets all report weeks for a tenant with optional filters
 *
 * @param tenantId - The tenant ID
 * @param options - Filter options
 * @returns Array of report weeks
 */
export async function getReportWeeksForTenant(
  tenantId: string,
  options?: {
    status?: 'draft' | 'published';
    year?: number;
    month?: number;
  }
) {
  const conditions = [eq(reportWeeks.tenantId, tenantId)];

  if (options?.status) {
    conditions.push(eq(reportWeeks.status, options.status));
  }

  if (options?.year) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${reportWeeks.weekEndingDate}) = ${options.year}`
    );
  }

  if (options?.month) {
    conditions.push(
      sql`EXTRACT(MONTH FROM ${reportWeeks.weekEndingDate}) = ${options.month}`
    );
  }

  return db
    .select()
    .from(reportWeeks)
    .where(and(...conditions))
    .orderBy(desc(reportWeeks.weekEndingDate));
}

/**
 * Gets a single report week by ID
 *
 * @param reportWeekId - The report week ID
 * @param tenantId - Optional tenant ID for validation
 * @returns The report week or undefined
 */
export async function getReportWeekById(
  reportWeekId: string,
  tenantId?: string
) {
  const conditions = [eq(reportWeeks.id, reportWeekId)];

  if (tenantId) {
    conditions.push(eq(reportWeeks.tenantId, tenantId));
  }

  const result = await db
    .select()
    .from(reportWeeks)
    .where(and(...conditions))
    .limit(1);

  return result[0];
}

/**
 * Creates a new report week along with its associated reportWeekManual record
 * Uses a transaction to ensure atomic creation of both records
 *
 * @param data - Report week data
 * @returns The created report week
 */
export async function createReportWeek(data: {
  tenantId: string;
  weekEndingDate: string;
  periodStartAt: Date;
  periodEndAt: Date;
}) {
  // Use transaction to ensure both records are created atomically
  const result = await db.transaction(async (tx) => {
    // Create the report week
    const [reportWeek] = await tx
      .insert(reportWeeks)
      .values({
        tenantId: data.tenantId,
        weekEndingDate: data.weekEndingDate,
        periodStartAt: data.periodStartAt,
        periodEndAt: data.periodEndAt,
        status: 'draft',
      })
      .returning();

    // Create the associated reportWeekManual record with null values
    await tx
      .insert(reportWeekManual)
      .values({
        reportWeekId: reportWeek.id,
        narrativeRich: null,
        initiativesRich: null,
        needsRich: null,
        discoveryDaysRich: null,
      });

    return reportWeek;
  });

  return result;
}

/**
 * Updates a report week
 *
 * @param reportWeekId - The report week ID
 * @param data - Fields to update
 * @returns The updated report week
 */
export async function updateReportWeek(
  reportWeekId: string,
  data: Partial<{
    weekEndingDate: string;
    periodStartAt: Date;
    periodEndAt: Date;
    status: 'draft' | 'published';
    publishedAt: Date | null;
    publishedBy: string | null;
  }>
) {
  const [reportWeek] = await db
    .update(reportWeeks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(reportWeeks.id, reportWeekId))
    .returning();

  return reportWeek;
}

/**
 * Deletes a report week
 *
 * @param reportWeekId - The report week ID
 * @returns true if deleted, false if not found
 */
export async function deleteReportWeek(reportWeekId: string): Promise<boolean> {
  const result = await db
    .delete(reportWeeks)
    .where(eq(reportWeeks.id, reportWeekId))
    .returning({ id: reportWeeks.id });

  return result.length > 0;
}

/**
 * Gets the reportWeekManual record by report week ID
 *
 * @param reportWeekId - The report week ID
 * @returns The reportWeekManual record or undefined
 */
export async function getReportWeekManualByReportWeekId(reportWeekId: string) {
  const result = await db
    .select()
    .from(reportWeekManual)
    .where(eq(reportWeekManual.reportWeekId, reportWeekId))
    .limit(1);

  return result[0];
}

/**
 * Updates the reportWeekManual record for a report week
 *
 * @param reportWeekId - The report week ID
 * @param data - Fields to update
 * @returns The updated reportWeekManual record
 */
export async function updateReportWeekManual(
  reportWeekId: string,
  data: Partial<{
    narrativeRich: string | null;
    initiativesRich: string | null;
    needsRich: string | null;
    discoveryDaysRich: string | null;
  }>
) {
  const [result] = await db
    .update(reportWeekManual)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(reportWeekManual.reportWeekId, reportWeekId))
    .returning();

  return result;
}
