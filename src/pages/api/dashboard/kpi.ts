/**
 * GET /api/dashboard/kpi
 *
 * Returns all four KPI values for the authenticated tenant user's dashboard.
 * Queries from locally synced pipelineStageCounts and leadMetrics tables.
 * Accepts a `period` query parameter: 'week' (default), 'month', or 'quarter'.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { getKPIData, getNewLeadsForPeriod } from '@/lib/dashboard';
import type { KPIData } from '@/lib/dashboard';

interface KPIResponse {
  success: true;
  data: KPIData;
}

interface KPIErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
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

    // Parse period query parameter
    const periodParam = url.searchParams.get('period') || 'week';
    const period = (['week', 'month', 'quarter'] as const).includes(periodParam as any)
      ? (periodParam as 'week' | 'month' | 'quarter')
      : 'week';

    // For week, use live rolling-7-day data; for month/quarter, sum historical snapshots
    let data: KPIData;
    if (period === 'week') {
      data = await getKPIData(tenantId, undefined, 'rolling-7');
    } else {
      const weeks = period === 'month' ? 4 : 13;
      const liveData = await getKPIData(tenantId, undefined, 'rolling-7');
      const periodNewLeads = await getNewLeadsForPeriod(tenantId, weeks);
      data = { ...liveData, newLeads: periodNewLeads };
    }

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
