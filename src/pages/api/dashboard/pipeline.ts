/**
 * GET /api/dashboard/pipeline
 *
 * Returns per-stage pipeline breakdown and weekly lead trend data
 * for the authenticated tenant user's dashboard charts.
 * Accepts a `weeks` query parameter (default 4) controlling historical data depth.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, pipelineStageCounts, leadMetrics, reportWeeks } from '@/lib/db';
import { eq, and, isNull, isNotNull, desc } from 'drizzle-orm';

interface PipelineByStagePoint {
  stage: string;
  count: number;
}

interface LeadTrendPoint {
  source: string;
  leads: number;
}

interface PipelineData {
  pipelineByStage: PipelineByStagePoint[];
  leadTrends: LeadTrendPoint[];
}

interface PipelineResponse {
  success: true;
  data: PipelineData;
}

interface PipelineErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: PipelineErrorResponse = {
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
      const response: PipelineErrorResponse = {
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

    // If no tenant context set, user cannot view pipeline data
    if (!tenantId) {
      const response: PipelineErrorResponse = {
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
      const response: PipelineErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse weeks query parameter
    const weeksParam = url.searchParams.get('weeks');
    let weeks = 4;
    if (weeksParam) {
      const parsed = parseInt(weeksParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        weeks = parsed;
      }
    }

    // Pipeline by Stage: query live snapshot (reportWeekId IS NULL)
    const stageRows = await db
      .select()
      .from(pipelineStageCounts)
      .where(
        and(
          eq(pipelineStageCounts.tenantId, tenantId),
          isNull(pipelineStageCounts.reportWeekId)
        )
      );

    const pipelineByStage: PipelineByStagePoint[] = stageRows.map((row) => ({
      stage: row.stage,
      count: row.count ?? 0,
    }));

    // Lead Trends: query leadMetrics rows with a non-null reportWeekId,
    // joined with reportWeeks to get weekEndingDate as label
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
    const leadTrends: LeadTrendPoint[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekLabel, leads]) => ({
        source: weekLabel,
        leads,
      }));

    const data: PipelineData = {
      pipelineByStage,
      leadTrends,
    };

    const response: PipelineResponse = {
      success: true,
      data,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    const response: PipelineErrorResponse = {
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
