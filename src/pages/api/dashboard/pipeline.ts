/**
 * GET /api/dashboard/pipeline
 *
 * Returns per-stage pipeline breakdown and weekly lead trend data
 * for the authenticated tenant user's dashboard charts.
 * Accepts a `period` query parameter (week | month | quarter) controlling historical data depth.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { getPipelineByStage, getLeadTrendsFromContacts } from '@/lib/dashboard';
import type { PipelineByStagePoint, LeadTrendPoint } from '@/lib/dashboard';

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

    // Parse period query parameter → map to days for lead trends
    const periodParam = url.searchParams.get('period') as 'week' | 'month' | 'quarter' | null;
    const days = periodParam === 'quarter' ? 90 : 30;

    const pipelineByStage = await getPipelineByStage(tenantId);
    const leadTrends = await getLeadTrendsFromContacts(tenantId, days);

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
