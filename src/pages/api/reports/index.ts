/**
 * GET /api/reports
 *
 * Returns list of published reports for the authenticated tenant user.
 * Filters by status='published' and the user's current tenant context.
 * Orders by weekEndingDate descending (most recent first).
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { getReportWeeksForTenant, formatWeekPeriod } from '@/lib/report-weeks';

interface ReportData {
  id: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
}

interface ReportsListResponse {
  success: true;
  data: ReportData[];
}

interface ReportsErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: ReportsErrorResponse = {
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
      const response: ReportsErrorResponse = {
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

    // If no tenant context set, user cannot view reports
    if (!tenantId) {
      const response: ReportsErrorResponse = {
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
      const response: ReportsErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query published reports for this tenant
    const reportWeeks = await getReportWeeksForTenant(tenantId, { status: 'published' });

    // Format response data
    const reportsData: ReportData[] = reportWeeks.map((rw) => ({
      id: rw.id,
      weekEndingDate: rw.weekEndingDate,
      periodStartAt: rw.periodStartAt.toISOString(),
      periodEndAt: rw.periodEndAt.toISOString(),
      weekPeriod: formatWeekPeriod(rw.periodStartAt, rw.periodEndAt),
      status: rw.status,
    }));

    const response: ReportsListResponse = {
      success: true,
      data: reportsData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    const response: ReportsErrorResponse = {
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
