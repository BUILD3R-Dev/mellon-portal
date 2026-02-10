/**
 * Dashboard data query helpers
 *
 * Contains reusable query functions for dashboard KPI, pipeline, and lead
 * trend data. These functions are shared between the dashboard API endpoints
 * and the PDF generation service.
 */

import { db, pipelineStageCounts, leadMetrics, reportWeeks } from '@/lib/db';
import { eq, and, isNull, isNotNull, desc, sql } from 'drizzle-orm';

/**
 * Active pipeline stages in ClientTether pipeline order.
 * Derived from CT read_sales_cycle_list API (sales_cycle_active_status = "1").
 * Stages not in this list are considered inactive and excluded from pipeline counts.
 * "New Lead" is a virtual stage for contacts with blank sales_cycle.
 */
export const ACTIVE_PIPELINE_STAGES = [
  'New Lead',
  'Outbound Call',
  'Inbound Contact',
  'Initial Call Scheduled',
  'Initial Call Complete',
  'QR Sent',
  'QR Returned',
  'FDD Sent',
  'FDD Signed',
  'FDD Review Call Scheduled',
  'FDD Review Call Complete',
  'Deal Structure',
  'Discovery Day Booked',
  'Discovery Day Completed',
  'FA Requested',
  'FA Sent',
  'FA Signed',
  'Future Interest',
];

/** Lowercase lookup set for fast active stage checking */
const ACTIVE_STAGES_LOWER = new Set(ACTIVE_PIPELINE_STAGES.map((s) => s.toLowerCase()));

/** Check if a stage is active (in the CT pipeline) */
export function isActiveStage(stage: string): boolean {
  return ACTIVE_STAGES_LOWER.has(stage.toLowerCase());
}

/**
 * Early-funnel stages excluded from the "Priority Candidates" count.
 * Everything active that is NOT in this list is considered a priority candidate.
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

  // Live mode: read the pre-computed new leads count from the sync worker.
  // The sync worker counts individual leads by their CT creation date,
  // regardless of current pipeline stage.
  const newLeadsDimensionType = timeWindow === 'rolling-7' ? 'new_rolling_7' : 'new_this_week';
  const newLeadsResult = await db
    .select({
      totalLeads: sql<number>`coalesce(sum(${leadMetrics.leads}), 0)`,
    })
    .from(leadMetrics)
    .where(
      and(
        eq(leadMetrics.tenantId, tenantId),
        isNull(leadMetrics.reportWeekId),
        eq(leadMetrics.dimensionType, newLeadsDimensionType)
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
    if (!isActiveStage(row.stage)) {
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
    .filter((row) => isActiveStage(row.stage))
    .sort((a, b) => {
      const aIdx = ACTIVE_PIPELINE_STAGES.findIndex((s) => s.toLowerCase() === a.stage.toLowerCase());
      const bIdx = ACTIVE_PIPELINE_STAGES.findIndex((s) => s.toLowerCase() === b.stage.toLowerCase());
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    })
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
