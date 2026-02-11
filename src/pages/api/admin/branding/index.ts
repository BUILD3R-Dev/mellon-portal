/**
 * GET   /api/admin/branding — Return current portal branding (creates default if none)
 * PATCH /api/admin/branding — Update branding fields (adminThemeId, etc.)
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, portalBranding } from '@/lib/db';

async function validateAgencyAdmin(cookies: any): Promise<{ isAuthorized: boolean; userId?: string; errorResponse?: Response }> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false, error: 'Authentication required', code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false, error: 'Invalid or expired session', code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const userMemberships = await getUserMemberships(session.userId);
  const isAgencyAdmin = userMemberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

  if (!isAgencyAdmin) {
    return {
      isAuthorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false, error: 'Only agency administrators can access this resource', code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  return { isAuthorized: true, userId: session.userId };
}

async function getOrCreateBranding() {
  const rows = await db.select().from(portalBranding).limit(1);
  if (rows.length > 0) return rows[0];

  const inserted = await db.insert(portalBranding).values({}).returning();
  return inserted[0];
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) return authResult.errorResponse!;

    const branding = await getOrCreateBranding();

    return new Response(JSON.stringify({ success: true, data: branding }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching portal branding:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) return authResult.errorResponse!;

    const body = await request.json();
    const branding = await getOrCreateBranding();

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.adminThemeId !== undefined) {
      if (body.adminThemeId !== 'light' && body.adminThemeId !== 'dark') {
        return new Response(JSON.stringify({
          success: false, error: 'Invalid theme. Must be "light" or "dark".', code: 'VALIDATION_ERROR',
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      updates.adminThemeId = body.adminThemeId;
    }

    const { eq } = await import('drizzle-orm');
    const updated = await db
      .update(portalBranding)
      .set(updates)
      .where(eq(portalBranding.id, branding.id))
      .returning();

    return new Response(JSON.stringify({ success: true, data: updated[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating portal branding:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
