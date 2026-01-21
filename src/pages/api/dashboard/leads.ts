/**
 * GET /api/dashboard/leads
 *
 * Returns aggregated lead metrics for the authenticated tenant user.
 * Includes totals by dimension (source, status).
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, leadMetrics } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface LeadMetricsByDimension {
  dimensionType: string;
  dimensionValue: string;
  leads: number;
  qualifiedLeads: number;
  clicks: number;
  impressions: number;
  cost: string;
}

interface LeadsSummary {
  totalLeads: number;
  totalQualifiedLeads: number;
  totalClicks: number;
  totalImpressions: number;
  totalCost: string;
  bySource: LeadMetricsByDimension[];
  byStatus: LeadMetricsByDimension[];
}

interface LeadsResponse {
  success: true;
  data: LeadsSummary;
}

interface LeadsErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: LeadsErrorResponse = {
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
      const response: LeadsErrorResponse = {
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

    // If no tenant context set, user cannot view leads
    if (!tenantId) {
      const response: LeadsErrorResponse = {
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
      const response: LeadsErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query lead metrics for current tenant
    const metrics = await db
      .select()
      .from(leadMetrics)
      .where(eq(leadMetrics.tenantId, tenantId));

    // Aggregate totals and group by dimension type
    let totalLeads = 0;
    let totalQualifiedLeads = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCost = 0;

    const bySource: LeadMetricsByDimension[] = [];
    const byStatus: LeadMetricsByDimension[] = [];

    for (const metric of metrics) {
      const leads = metric.leads || 0;
      const qualifiedLeads = metric.qualifiedLeads || 0;
      const clicks = metric.clicks || 0;
      const impressions = metric.impressions || 0;
      const cost = parseFloat(metric.cost || '0');

      totalLeads += leads;
      totalQualifiedLeads += qualifiedLeads;
      totalClicks += clicks;
      totalImpressions += impressions;
      totalCost += cost;

      const metricData: LeadMetricsByDimension = {
        dimensionType: metric.dimensionType,
        dimensionValue: metric.dimensionValue,
        leads,
        qualifiedLeads,
        clicks,
        impressions,
        cost: cost.toFixed(2),
      };

      if (metric.dimensionType === 'source') {
        bySource.push(metricData);
      } else if (metric.dimensionType === 'status') {
        byStatus.push(metricData);
      }
    }

    const summaryData: LeadsSummary = {
      totalLeads,
      totalQualifiedLeads,
      totalClicks,
      totalImpressions,
      totalCost: totalCost.toFixed(2),
      bySource,
      byStatus,
    };

    const response: LeadsResponse = {
      success: true,
      data: summaryData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching leads summary:', error);
    const response: LeadsErrorResponse = {
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
