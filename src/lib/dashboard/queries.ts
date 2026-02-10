/**
 * Dashboard data query helpers
 *
 * Contains reusable query functions for dashboard KPI, pipeline, and lead
 * trend data. These functions are shared between the dashboard API endpoints
 * and the PDF generation service.
 */

import { db, pipelineStageCounts, leadMetrics, reportWeeks } from '@/lib/db';
import { eq, and, isNull, isNotNull, desc, sql, gte } from 'drizzle-orm';

/**
 * Inactive/closed pipeline stages excluded from all pipeline counts.
 * These contacts are no longer actively progressing through the sales funnel.
 * Matched case-insensitively against stage values from ClientTether.
 */
export const INACTIVE_PIPELINE_STAGES = [
  'not interested',
  'never responded',
  'bad lead',
  'bad fit',
  'lost - territory not available',
  'future interest',
  'unknown',
];

/**
 * Early-funnel stages that are excluded from the "Priority Candidates" count.
 * Everything active that is NOT in this list is considered a priority candidate.
 * Matched case-insensitively against the stage values from ClientTether.
 */
export const EARLY_FUNNEL_STAGES = [
  'new lead',
  'inbound contact',
  'outbound call',
];

/** KPI data shape returned by getKPIData */
export interface KPIData {
  newLeads: number;
  totalPipeline: number;
  priorityCandidates: number;
  weightedPipelineValue: string;
}

/** A single pipeline-by-stage data point */
export interface PipelineByStagePoint {
  stage: string;
  count: number;
}

/** A single lead trend data point */
export interface LeadTrendPoint {
  source: string;
  leads: number;
}

/**
 * Returns the Monday of the current week at 00:00:00 UTC.
 */
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Returns the date 7 days ago at 00:00:00 UTC.
 */
function getRolling7Start(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - 7);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Gets KPI data for a tenant, optionally scoped to a specific report week.
 *
 * When reportWeekId is provided, queries snapshot data linked to that report week.
 * When omitted, queries live data (reportWeekId IS NULL).
 *
 * @param tenantId - The tenant ID
 * @param reportWeekId - Optional report week ID for snapshot data
 * @param timeWindow - Time window for new leads: 'report-week' (default) or 'rolling-7'
 * @returns KPI data object
 */
export async function getKPIData(
  tenantId: string,
  reportWeekId?: string,
  timeWindow: 'report-week' | 'rolling-7' = 'report-week'
): Promise<KPIData> {
  // Calculate new leads start date based on time window
  const newLeadsStartDate = timeWindow === 'rolling-7' ? getRolling7Start() : getMondayOfCurrentWeek();

  // Build lead metrics condition based on whether we want snapshot or live data
  if (reportWeekId) {
    // Snapshot mode: query data linked to the report week
    const newLeadsResult = await db
      .select({
        totalLeads: sql<number>`coalesce(sum(${leadMetrics.leads}), 0)`,
      })
      .from(leadMetrics)
      .where(
        and(
          eq(leadMetrics.tenantId, tenantId),
          eq(leadMetrics.reportWeekId, reportWeekId),
          eq(leadMetrics.dimensionType, 'status')
        )
      );

    const newLeads = Number(newLeadsResult[0]?.totalLeads ?? 0);

    // Pipeline stage counts for the snapshot
    const pipelineRows = await db
      .select()
      .from(pipelineStageCounts)
      .where(
        and(
          eq(pipelineStageCounts.tenantId, tenantId),
          eq(pipelineStageCounts.reportWeekId, reportWeekId)
        )
      );

    return calculateKPIs(newLeads, pipelineRows);
  }

  // Live mode: query current data (reportWeekId IS NULL)
  // Use sourceCreatedAt (actual CT lead creation date) for the time filter
  // since sync deletes/re-inserts all data, resetting createdAt each run
  const newLeadsResult = await db
    .select({
      totalLeads: sql<number>`coalesce(sum(${leadMetrics.leads}), 0)`,
    })
    .from(leadMetrics)
    .where(
      and(
        eq(leadMetrics.tenantId, tenantId),
        isNull(leadMetrics.reportWeekId),
        eq(leadMetrics.dimensionType, 'status'),
        gte(leadMetrics.sourceCreatedAt, newLeadsStartDate)
      )
    );

  const newLeads = Number(newLeadsResult[0]?.totalLeads ?? 0);

  const livePipelineRows = await db
    .select()
    .from(pipelineStageCounts)
    .where(
      and(
        eq(pipelineStageCounts.tenantId, tenantId),
        isNull(pipelineStageCounts.reportWeekId)
      )
    );

  return calculateKPIs(newLeads, livePipelineRows);
}

/**
 * Calculates KPI values from pipeline rows
 */
function calculateKPIs(
  newLeads: number,
  pipelineRows: Array<{ stage: string; count: number | null; dollarValue: string | null }>
): KPIData {
  let totalPipeline = 0;
  let priorityCandidates = 0;
  let weightedPipelineValue = 0;

  for (const row of pipelineRows) {
    const count = row.count ?? 0;
    const dollarValue = parseFloat(row.dollarValue ?? '0');
    const stageLower = row.stage.toLowerCase();

    // Skip inactive/closed stages entirely
    if (INACTIVE_PIPELINE_STAGES.includes(stageLower)) {
      continue;
    }

    totalPipeline += count;
    weightedPipelineValue += dollarValue;

    // Priority candidates = anything past early-funnel stages
    if (!EARLY_FUNNEL_STAGES.includes(stageLower)) {
      priorityCandidates += count;
    }
  }

  return {
    newLeads,
    totalPipeline,
    priorityCandidates,
    weightedPipelineValue: weightedPipelineValue.toFixed(2),
  };
}

/**
 * Gets pipeline-by-stage data for a tenant, optionally scoped to a report week.
 *
 * When reportWeekId is provided, queries snapshot data linked to that report week.
 * When omitted, queries live data (reportWeekId IS NULL).
 *
 * @param tenantId - The tenant ID
 * @param reportWeekId - Optional report week ID for snapshot data
 * @returns Array of pipeline stage/count pairs
 */
export async function getPipelineByStage(
  tenantId: string,
  reportWeekId?: string
): Promise<PipelineByStagePoint[]> {
  const conditions = [eq(pipelineStageCounts.tenantId, tenantId)];

  if (reportWeekId) {
    conditions.push(eq(pipelineStageCounts.reportWeekId, reportWeekId));
  } else {
    conditions.push(isNull(pipelineStageCounts.reportWeekId));
  }

  const stageRows = await db
    .select()
    .from(pipelineStageCounts)
    .where(and(...conditions));

  return stageRows
    .filter((row) => !INACTIVE_PIPELINE_STAGES.includes(row.stage.toLowerCase()))
    .map((row) => ({
      stage: row.stage,
      count: row.count ?? 0,
    }));
}

/**
 * Gets lead trend data for a tenant, showing historical weekly lead counts.
 *
 * Queries leadMetrics rows with a non-null reportWeekId, joined with
 * reportWeeks to get the weekEndingDate as a label.
 *
 * @param tenantId - The tenant ID
 * @param weeks - Number of historical weeks to include (default 4)
 * @returns Array of lead trend points sorted chronologically
 */
export async function getLeadTrends(
  tenantId: string,
  weeks: number = 4
): Promise<LeadTrendPoint[]> {
  const trendRows = await db
    .select({
      weekEndingDate: reportWeeks.weekEndingDate,
      leads: leadMetrics.leads,
    })
    .from(leadMetrics)
    .innerJoin(reportWeeks, eq(leadMetrics.reportWeekId, reportWeeks.id))
    .where(
      and(
        eq(leadMetrics.tenantId, tenantId),
        isNotNull(leadMetrics.reportWeekId)
      )
    )
    .orderBy(desc(reportWeeks.weekEndingDate))
    .limit(weeks);

  // Aggregate leads per week (multiple leadMetrics rows may share the same reportWeekId)
  const weekMap = new Map<string, number>();
  for (const row of trendRows) {
    const weekLabel = row.weekEndingDate;
    const existing = weekMap.get(weekLabel) ?? 0;
    weekMap.set(weekLabel, existing + (row.leads ?? 0));
  }

  // Convert map to array, sorted chronologically (ascending) for chart display
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, leads]) => ({
      source: weekLabel,
      leads,
    }));
}
