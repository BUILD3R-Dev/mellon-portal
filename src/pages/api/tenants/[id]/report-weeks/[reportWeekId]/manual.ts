import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  getReportWeekById,
  getReportWeekManualByReportWeekId,
  updateReportWeekManual,
  formatWeekPeriod,
} from '@/lib/report-weeks';

interface ReportWeekManualData {
  narrativeRich: string | null;
  initiativesRich: string | null;
  needsRich: string | null;
  reportWeekStatus: 'draft' | 'published';
}

interface ReportWeekManualResponse {
  success: true;
  data: ReportWeekManualData;
}

interface ReportWeekManualErrorResponse {
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
    const response: ReportWeekManualErrorResponse = {
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
    const response: ReportWeekManualErrorResponse = {
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
    const response: ReportWeekManualErrorResponse = {
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
    const response: ReportWeekManualErrorResponse = {
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
 * GET /api/tenants/[id]/report-weeks/[reportWeekId]/manual
 *
 * Returns the manual content for a report week. Only accessible by agency admins.
 *
 * Response:
 * - 200: Manual content data with report week status
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
      const response: ReportWeekManualErrorResponse = {
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
      const response: ReportWeekManualErrorResponse = {
        success: false,
        error: 'Report week not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const manual = await getReportWeekManualByReportWeekId(reportWeekId);

    // Return content with report week status for UI state management
    const response: ReportWeekManualResponse = {
      success: true,
      data: {
        narrativeRich: manual?.narrativeRich || null,
        initiativesRich: manual?.initiativesRich || null,
        needsRich: manual?.needsRich || null,
        reportWeekStatus: reportWeek.status,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching manual content:', error);
    const response: ReportWeekManualErrorResponse = {
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
 * PATCH /api/tenants/[id]/report-weeks/[reportWeekId]/manual
 *
 * Updates the manual content for a report week. Only accessible by agency admins.
 * Only draft report weeks can be updated.
 *
 * Request body:
 * - narrativeRich: string | null (optional)
 * - initiativesRich: string | null (optional)
 * - needsRich: string | null (optional)
 *
 * Response:
 * - 200: Updated manual content
 * - 400: Validation error (e.g., report week is published)
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
      const response: ReportWeekManualErrorResponse = {
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
      const response: ReportWeekManualErrorResponse = {
        success: false,
        error: 'Report week not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if report week is in draft status
    if (reportWeek.status !== 'draft') {
      const response: ReportWeekManualErrorResponse = {
        success: false,
        error: 'Cannot edit content for published report weeks',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { narrativeRich, initiativesRich, needsRich } = body;

    // Build update object with only provided fields
    const updates: Partial<{
      narrativeRich: string | null;
      initiativesRich: string | null;
      needsRich: string | null;
    }> = {};

    if (narrativeRich !== undefined) {
      updates.narrativeRich = narrativeRich;
    }
    if (initiativesRich !== undefined) {
      updates.initiativesRich = initiativesRich;
    }
    if (needsRich !== undefined) {
      updates.needsRich = needsRich;
    }

    // Update the manual content
    const updatedManual = await updateReportWeekManual(reportWeekId, updates);

    const response: ReportWeekManualResponse = {
      success: true,
      data: {
        narrativeRich: updatedManual?.narrativeRich || null,
        initiativesRich: updatedManual?.initiativesRich || null,
        needsRich: updatedManual?.needsRich || null,
        reportWeekStatus: reportWeek.status,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating manual content:', error);
    const response: ReportWeekManualErrorResponse = {
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
