import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  isValidFridayDate,
  calculatePeriodStart,
  calculatePeriodEnd,
  checkOverlappingWeeks,
  getReportWeeksForTenant,
  createReportWeek,
  formatWeekPeriod,
  getMondayFromFriday,
} from '@/lib/report-weeks';

interface ReportWeekData {
  id: string;
  tenantId: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportWeekListResponse {
  success: true;
  data: ReportWeekData[];
}

interface ReportWeekCreateResponse {
  success: true;
  data: ReportWeekData;
}

interface ReportWeekErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Validates agency admin authorization
 */
async function validateAgencyAdmin(
  cookies: any
): Promise<{ isAuthorized: boolean; userId?: string; errorResponse?: Response }> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const response: ReportWeekErrorResponse = {
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    const response: ReportWeekErrorResponse = {
      success: false,
      error: 'Invalid or expired session',
      code: 'UNAUTHORIZED',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const userMemberships = await getUserMemberships(session.userId);
  const isAgencyAdmin = userMemberships.some(
    (m) => m.role === 'agency_admin' && m.tenantId === null
  );

  if (!isAgencyAdmin) {
    const response: ReportWeekErrorResponse = {
      success: false,
      error: 'Only agency administrators can access this resource',
      code: 'FORBIDDEN',
    };
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { isAuthorized: true, userId: session.userId };
}

/**
 * Validates that tenant exists
 */
async function validateTenant(
  tenantId: string
): Promise<{ exists: boolean; timezone?: string; errorResponse?: Response }> {
  const result = await db
    .select({ id: tenants.id, timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (result.length === 0) {
    const response: ReportWeekErrorResponse = {
      success: false,
      error: 'Tenant not found',
      code: 'NOT_FOUND',
    };
    return {
      exists: false,
      errorResponse: new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { exists: true, timezone: result[0].timezone };
}

/**
 * Formats a report week for API response
 */
function formatReportWeekResponse(reportWeek: any, timezone: string): ReportWeekData {
  const periodStart = new Date(reportWeek.periodStartAt);
  const periodEnd = new Date(reportWeek.periodEndAt);

  return {
    id: reportWeek.id,
    tenantId: reportWeek.tenantId,
    weekEndingDate: reportWeek.weekEndingDate,
    periodStartAt: reportWeek.periodStartAt.toISOString(),
    periodEndAt: reportWeek.periodEndAt.toISOString(),
    weekPeriod: formatWeekPeriod(periodStart, periodEnd),
    status: reportWeek.status,
    publishedAt: reportWeek.publishedAt?.toISOString() || null,
    publishedBy: reportWeek.publishedBy,
    createdAt: reportWeek.createdAt.toISOString(),
    updatedAt: reportWeek.updatedAt.toISOString(),
  };
}

/**
 * GET /api/tenants/[id]/report-weeks
 *
 * Returns list of all report weeks for a tenant. Only accessible by agency admins.
 *
 * Query parameters:
 * - status: 'draft' | 'published' (optional filter)
 * - year: number (optional filter)
 * - month: number (optional filter, 1-12)
 *
 * Response:
 * - 200: List of report weeks
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const GET: APIRoute = async ({ cookies, params, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantResult = await validateTenant(tenantId);
    if (!tenantResult.exists) {
      return tenantResult.errorResponse!;
    }

    // Parse query parameters
    const statusFilter = url.searchParams.get('status') as 'draft' | 'published' | null;
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');

    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;

    // Validate status filter
    if (statusFilter && !['draft', 'published'].includes(statusFilter)) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Invalid status filter',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportWeeks = await getReportWeeksForTenant(tenantId, {
      status: statusFilter || undefined,
      year,
      month,
    });

    const reportWeeksData: ReportWeekData[] = reportWeeks.map((rw) =>
      formatReportWeekResponse(rw, tenantResult.timezone!)
    );

    const response: ReportWeekListResponse = {
      success: true,
      data: reportWeeksData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching report weeks:', error);
    const response: ReportWeekErrorResponse = {
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

/**
 * POST /api/tenants/[id]/report-weeks
 *
 * Creates a new report week for a tenant. Only accessible by agency admins.
 *
 * Request body:
 * - weekEndingDate: string (required, YYYY-MM-DD format, must be a Friday)
 *
 * Response:
 * - 201: Created report week
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const POST: APIRoute = async ({ cookies, params, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantResult = await validateTenant(tenantId);
    if (!tenantResult.exists) {
      return tenantResult.errorResponse!;
    }

    // Parse request body
    const body = await request.json();
    const { weekEndingDate } = body;

    // Validate weekEndingDate is provided
    if (!weekEndingDate || typeof weekEndingDate !== 'string') {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Week ending date is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate date format and that it's a Friday
    if (!isValidFridayDate(weekEndingDate)) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Selected date must be a Friday',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate period dates
    const periodStartAt = calculatePeriodStart(weekEndingDate, tenantResult.timezone!);
    const periodEndAt = calculatePeriodEnd(weekEndingDate, tenantResult.timezone!);

    // Check for overlapping weeks
    const hasOverlap = await checkOverlappingWeeks(
      tenantId,
      periodStartAt,
      periodEndAt
    );

    if (hasOverlap) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'A report week already exists that overlaps with this date range',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the report week
    const reportWeek = await createReportWeek({
      tenantId,
      weekEndingDate,
      periodStartAt,
      periodEndAt,
    });

    const reportWeekData = formatReportWeekResponse(reportWeek, tenantResult.timezone!);

    const response: ReportWeekCreateResponse = {
      success: true,
      data: reportWeekData,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating report week:', error);
    const response: ReportWeekErrorResponse = {
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
