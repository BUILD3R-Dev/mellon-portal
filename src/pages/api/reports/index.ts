/**
 * GET /api/reports
 *
 * Returns paginated list of published reports for the authenticated tenant user.
 * Accepts query parameters: page (default 1), limit (default 10), year, month.
 * Filters by status='published' and the user's current tenant context.
 * Orders by weekEndingDate descending (most recent first).
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { getReportWeeksForTenantPaginated, formatWeekPeriod } from '@/lib/report-weeks';

interface ReportData {
  id: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

interface ReportsListResponse {
  success: true;
  data: ReportData[];
  pagination: PaginationMeta;
}

interface ReportsErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

export const GET: APIRoute = async ({ cookies, url }) => {
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

    // Parse and validate pagination parameters
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');

    let page = 1;
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        page = parsed;
      }
    }

    let limit = 10;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed)) {
        limit = Math.max(1, Math.min(50, parsed));
      }
    }

    let year: number | undefined;
    if (yearParam) {
      const parsed = parseInt(yearParam, 10);
      if (!isNaN(parsed)) {
        year = parsed;
      }
    }

    let month: number | undefined;
    if (monthParam) {
      const parsed = parseInt(monthParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        month = parsed;
      }
    }

    const offset = (page - 1) * limit;

    // Query paginated published reports for this tenant
    const { data: reportWeeksData, totalCount } = await getReportWeeksForTenantPaginated(tenantId, {
      status: 'published',
      year,
      month,
      limit,
      offset,
    });

    // Format response data
    const reportsData: ReportData[] = reportWeeksData.map((rw) => ({
      id: rw.id,
      weekEndingDate: rw.weekEndingDate,
      periodStartAt: rw.periodStartAt.toISOString(),
      periodEndAt: rw.periodEndAt.toISOString(),
      weekPeriod: formatWeekPeriod(rw.periodStartAt, rw.periodEndAt),
      status: rw.status,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const response: ReportsListResponse = {
      success: true,
      data: reportsData,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
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
