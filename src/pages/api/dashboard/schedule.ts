/**
 * GET /api/dashboard/schedule
 *
 * Returns upcoming scheduled activities for the authenticated tenant user.
 * Filters to show only future activities (scheduled_at > now()).
 * Orders by scheduled_at ascending (soonest first).
 * Limits to 100 activities by default.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, ctScheduledActivities } from '@/lib/db';
import { eq, gt, asc, and } from 'drizzle-orm';

interface ActivityData {
  id: string;
  activityType: string | null;
  scheduledAt: string;
  contactName: string | null;
  description: string | null;
  status: string | null;
  createdAt: string;
}

interface ScheduleListResponse {
  success: true;
  data: {
    activities: ActivityData[];
    limit: number;
  };
}

interface ScheduleErrorResponse {
  success: false;
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: ScheduleErrorResponse = {
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
      const response: ScheduleErrorResponse = {
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

    // If no tenant context set, user cannot view schedule
    if (!tenantId) {
      const response: ScheduleErrorResponse = {
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
      const response: ScheduleErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const limitParam = url.searchParams.get('limit');

    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    // Query upcoming activities (scheduled_at > now)
    const now = new Date();
    const activities = await db
      .select()
      .from(ctScheduledActivities)
      .where(
        and(
          eq(ctScheduledActivities.tenantId, tenantId),
          gt(ctScheduledActivities.scheduledAt, now)
        )
      )
      .orderBy(asc(ctScheduledActivities.scheduledAt))
      .limit(limit);

    // Format response data
    const activitiesData: ActivityData[] = activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      scheduledAt: activity.scheduledAt.toISOString(),
      contactName: activity.contactName,
      description: activity.description,
      status: activity.status,
      createdAt: activity.createdAt.toISOString(),
    }));

    const response: ScheduleListResponse = {
      success: true,
      data: {
        activities: activitiesData,
        limit,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    const response: ScheduleErrorResponse = {
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
