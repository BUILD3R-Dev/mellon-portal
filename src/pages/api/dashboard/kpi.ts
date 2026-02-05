/**
 * GET /api/dashboard/kpi
 *
 * Returns all four KPI values for the authenticated tenant user's dashboard.
 * Queries from locally synced pipelineStageCounts and leadMetrics tables.
 * Accepts a `timeWindow` query parameter: 'report-week' (default) or 'rolling-7'.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, pipelineStageCounts, leadMetrics } from '@/lib/db';
import { eq, and, isNull, sql, inArray, gte } from 'drizzle-orm';

/** Stages used for Priority Candidates: QR Returned through FA Sent */
const PRIORITY_STAGES = [
  'QR Returned',
  'FDD Sent',
  'FDD Signed',
  'FDD Review Call Sched.',
  'FDD Review Call Compl.',
  'FA Sent',
];

/** Full pipeline stages used for Weighted Pipeline Value: New Lead through FA Sent */
const FULL_PIPELINE_STAGES = [
  'New Lead',
  'Outbound Call',
  'Inbound Contact',
  'Initial Call Scheduled',
  'Initial Call Complete',
  'QR',
  'QR Returned',
  'FDD Sent',
  'FDD Signed',
  'FDD Review Call Sched.',
  'FDD Review Call Compl.',
  'FA Sent',
];

interface KPIData {
  newLeads: number;
  totalPipeline: number;
  priorityCandidates: number;
  weightedPipelineValue: string;
}

interface KPIResponse {
  success: true;
  data: KPIData;
}

interface KPIErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

/**
 * Returns the Monday of the current week at 00:00:00 UTC.
 */
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Sunday is 0, so go back 6 days
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

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: KPIErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      const response: KPIErrorResponse = {
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user memberships to determine tenant access
    const memberships = await getUserMemberships(session.userId);

    // Check if user is agency admin (they need a specific tenant context)
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    // Get tenant context from cookie
    const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

    // If no tenant context set, user cannot view KPIs
    if (!tenantId) {
      const response: KPIErrorResponse = {
        success: false,
        error: 'No tenant context selected',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this tenant (either agency admin or member)
    const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);

    if (!hasTenantAccess) {
      const response: KPIErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse timeWindow query parameter
    const timeWindow = url.searchParams.get('timeWindow') || 'report-week';

    // Calculate the start date for new leads based on time window
    const newLeadsStartDate = timeWindow === 'rolling-7' ? getRolling7Start() : getMondayOfCurrentWeek();

    // Query New Leads: sum leads from leadMetrics with dimensionType='status' in the time window
    // Live rows have reportWeekId IS NULL and createdAt >= start date
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
          gte(leadMetrics.createdAt, newLeadsStartDate)
        )
      );

    const newLeads = Number(newLeadsResult[0]?.totalLeads ?? 0);

    // Query live pipeline stage counts (reportWeekId IS NULL)
    const livePipelineRows = await db
      .select()
      .from(pipelineStageCounts)
      .where(
        and(
          eq(pipelineStageCounts.tenantId, tenantId),
          isNull(pipelineStageCounts.reportWeekId)
        )
      );

    // Total Pipeline: sum count from all live pipeline rows
    let totalPipeline = 0;
    let priorityCandidates = 0;
    let weightedPipelineValue = 0;

    for (const row of livePipelineRows) {
      const count = row.count ?? 0;
      const dollarValue = parseFloat(row.dollarValue ?? '0');

      totalPipeline += count;

      if (PRIORITY_STAGES.includes(row.stage)) {
        priorityCandidates += count;
      }

      if (FULL_PIPELINE_STAGES.includes(row.stage)) {
        weightedPipelineValue += dollarValue;
      }
    }

    const data: KPIData = {
      newLeads,
      totalPipeline,
      priorityCandidates,
      weightedPipelineValue: weightedPipelineValue.toFixed(2),
    };

    const response: KPIResponse = {
      success: true,
      data,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    const response: KPIErrorResponse = {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
