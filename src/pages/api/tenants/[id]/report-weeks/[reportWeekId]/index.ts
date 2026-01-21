import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  isValidFridayDate,
  calculatePeriodStart,
  calculatePeriodEnd,
  checkOverlappingWeeks,
  getReportWeekById,
  updateReportWeek,
  deleteReportWeek,
  formatWeekPeriod,
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

interface ReportWeekResponse {
  success: true;
  data: ReportWeekData;
}

interface ReportWeekDeleteResponse {
  success: true;
  message: string;
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
 * Validates that tenant exists and returns timezone
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
 * GET /api/tenants/[id]/report-weeks/[reportWeekId]
 *
 * Returns a single report week. Only accessible by agency admins.
 *
 * Response:
 * - 200: Report week details
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant or report week not found
 */
export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const { id: tenantId, reportWeekId } = params;

    if (!tenantId || !reportWeekId) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Tenant ID and Report Week ID are required',
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

    const reportWeek = await getReportWeekById(reportWeekId, tenantId);

    if (!reportWeek) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Report week not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportWeekData = formatReportWeekResponse(reportWeek, tenantResult.timezone!);

    const response: ReportWeekResponse = {
      success: true,
      data: reportWeekData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching report week:', error);
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
 * PATCH /api/tenants/[id]/report-weeks/[reportWeekId]
 *
 * Updates a report week. Only accessible by agency admins.
 *
 * Request body:
 * - weekEndingDate: string (optional, YYYY-MM-DD format, must be Friday, only for draft)
 * - status: 'draft' | 'published' (optional, for publish/unpublish)
 *
 * Response:
 * - 200: Updated report week
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant or report week not found
 */
export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const { id: tenantId, reportWeekId } = params;

    if (!tenantId || !reportWeekId) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Tenant ID and Report Week ID are required',
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

    const existingReportWeek = await getReportWeekById(reportWeekId, tenantId);

    if (!existingReportWeek) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Report week not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { weekEndingDate, status } = body;

    const updates: Parameters<typeof updateReportWeek>[1] = {};

    // Handle weekEndingDate update (only for draft report weeks)
    if (weekEndingDate !== undefined) {
      if (existingReportWeek.status !== 'draft') {
        const response: ReportWeekErrorResponse = {
          success: false,
          error: 'Only draft report weeks can be edited',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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

      // Calculate new period dates
      const periodStartAt = calculatePeriodStart(weekEndingDate, tenantResult.timezone!);
      const periodEndAt = calculatePeriodEnd(weekEndingDate, tenantResult.timezone!);

      // Check for overlapping weeks (excluding current)
      const hasOverlap = await checkOverlappingWeeks(
        tenantId,
        periodStartAt,
        periodEndAt,
        reportWeekId
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

      updates.weekEndingDate = weekEndingDate;
      updates.periodStartAt = periodStartAt;
      updates.periodEndAt = periodEndAt;
    }

    // Handle status update (publish/unpublish)
    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        const response: ReportWeekErrorResponse = {
          success: false,
          error: 'Invalid status value',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      updates.status = status;

      // Handle publish action
      if (status === 'published' && existingReportWeek.status === 'draft') {
        updates.publishedAt = new Date();
        updates.publishedBy = authResult.userId!;
      }

      // Handle unpublish action
      if (status === 'draft' && existingReportWeek.status === 'published') {
        updates.publishedAt = null;
        updates.publishedBy = null;
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      const reportWeekData = formatReportWeekResponse(existingReportWeek, tenantResult.timezone!);
      const response: ReportWeekResponse = {
        success: true,
        data: reportWeekData,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedReportWeek = await updateReportWeek(reportWeekId, updates);
    const reportWeekData = formatReportWeekResponse(updatedReportWeek, tenantResult.timezone!);

    const response: ReportWeekResponse = {
      success: true,
      data: reportWeekData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating report week:', error);
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
 * DELETE /api/tenants/[id]/report-weeks/[reportWeekId]
 *
 * Deletes a draft report week. Only accessible by agency admins.
 * Published report weeks cannot be deleted.
 *
 * Response:
 * - 200: Deletion success message
 * - 400: Validation error (cannot delete published)
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant or report week not found
 */
export const DELETE: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const { id: tenantId, reportWeekId } = params;

    if (!tenantId || !reportWeekId) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Tenant ID and Report Week ID are required',
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

    const existingReportWeek = await getReportWeekById(reportWeekId, tenantId);

    if (!existingReportWeek) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Report week not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow deletion of draft report weeks
    if (existingReportWeek.status !== 'draft') {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Only draft report weeks can be deleted',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = await deleteReportWeek(reportWeekId);

    if (!deleted) {
      const response: ReportWeekErrorResponse = {
        success: false,
        error: 'Failed to delete report week',
        code: 'INTERNAL_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: ReportWeekDeleteResponse = {
      success: true,
      message: 'Report week deleted successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting report week:', error);
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
