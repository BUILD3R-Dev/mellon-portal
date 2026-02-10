/**
 * POST /api/reports/[reportWeekId]/pdf
 * Triggers PDF generation (or returns cached) for a published report.
 * Returns a download URL for the generated PDF.
 *
 * GET /api/reports/[reportWeekId]/pdf
 * Streams the cached PDF file with appropriate content headers.
 * Returns 404 if no cached PDF exists.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { getReportWeekById } from '@/lib/report-weeks';
import { isFeatureEnabled, FEATURE_PDF_EXPORT } from '@/lib/feature-flags';
import { generateReportPDF } from '@/lib/pdf';
import { db, reportExports } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import fs from 'node:fs';

interface PDFSuccessResponse {
  success: true;
  data: { downloadUrl: string };
}

interface PDFErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
}

/** Shared auth validation for both GET and POST */
async function validateRequest(cookies: any) {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { error: 'Authentication required', code: 'UNAUTHORIZED' as const, status: 401 };
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    return { error: 'Invalid or expired session', code: 'UNAUTHORIZED' as const, status: 401 };
  }

  const memberships = await getUserMemberships(session.userId);
  const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);
  const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

  if (!tenantId) {
    return { error: 'No tenant context selected', code: 'FORBIDDEN' as const, status: 403 };
  }

  const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);
  if (!hasTenantAccess) {
    return { error: 'Access denied', code: 'FORBIDDEN' as const, status: 403 };
  }

  return { session, tenantId };
}

/** Returns a JSON error response */
function errorResponse(error: string, code: PDFErrorResponse['code'], status: number) {
  const body: PDFErrorResponse = { success: false, error, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateRequest(cookies);
    if ('error' in authResult) {
      return errorResponse(authResult.error, authResult.code, authResult.status);
    }

    const { tenantId } = authResult;
    const { reportWeekId } = params;

    if (!reportWeekId) {
      return errorResponse('Report week ID is required', 'NOT_FOUND', 404);
    }

    // Check feature flag
    const pdfEnabled = await isFeatureEnabled(tenantId, FEATURE_PDF_EXPORT);
    if (!pdfEnabled) {
      return errorResponse('PDF export is not enabled', 'FORBIDDEN', 403);
    }

    // Verify report exists, belongs to tenant, and is published
    const reportWeek = await getReportWeekById(reportWeekId, tenantId);
    if (!reportWeek) {
      return errorResponse('Report not found', 'NOT_FOUND', 404);
    }

    if (reportWeek.status !== 'published') {
      return errorResponse('Only published reports can be exported as PDF', 'FORBIDDEN', 403);
    }

    // Generate or return cached PDF
    const pdfPath = await generateReportPDF(reportWeekId, tenantId);

    const response: PDFSuccessResponse = {
      success: true,
      data: { downloadUrl: `/api/reports/${reportWeekId}/pdf` },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500);
  }
};

export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateRequest(cookies);
    if ('error' in authResult) {
      return errorResponse(authResult.error, authResult.code, authResult.status);
    }

    const { tenantId } = authResult;
    const { reportWeekId } = params;

    if (!reportWeekId) {
      return errorResponse('Report week ID is required', 'NOT_FOUND', 404);
    }

    // Check feature flag
    const pdfEnabled = await isFeatureEnabled(tenantId, FEATURE_PDF_EXPORT);
    if (!pdfEnabled) {
      return errorResponse('PDF export is not enabled', 'FORBIDDEN', 403);
    }

    // Look up cached PDF in reportExports table
    const cachedExport = await db
      .select({ pdfUrl: reportExports.pdfUrl })
      .from(reportExports)
      .where(
        and(
          eq(reportExports.tenantId, tenantId),
          eq(reportExports.reportWeekId, reportWeekId)
        )
      )
      .limit(1);

    if (!cachedExport[0]?.pdfUrl) {
      return errorResponse('PDF not found. Generate it first via POST.', 'NOT_FOUND', 404);
    }

    const pdfPath = cachedExport[0].pdfUrl;

    // Verify the file exists on disk
    if (!fs.existsSync(pdfPath)) {
      return errorResponse('PDF file not found on disk', 'NOT_FOUND', 404);
    }

    // Read and stream the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    const filename = `report-${reportWeekId}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500);
  }
};
