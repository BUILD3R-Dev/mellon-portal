/**
 * GET    /api/tenants/[id]/logo?variant=light|dark — Serve the tenant's logo image
 * POST   /api/tenants/[id]/logo?variant=light|dark — Upload a logo for the tenant
 * DELETE /api/tenants/[id]/logo?variant=light|dark — Remove the tenant's logo
 *
 * variant defaults to "light" if omitted.
 * Image data is stored as base64 in the database to survive container rebuilds.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants, tenantBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface LogoResponse {
  success: true;
  data: {
    logoUrl: string | null;
    variant: string;
  };
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_WIDTH = 400;
const MAX_HEIGHT = 150;

function getVariant(url: URL): 'light' | 'dark' {
  const v = url.searchParams.get('variant');
  return v === 'dark' ? 'dark' : 'light';
}

function getColumns(variant: 'light' | 'dark') {
  if (variant === 'dark') {
    return { url: 'tenantLogoDarkUrl' as const, data: 'tenantLogoDarkData' as const, contentType: 'tenantLogoDarkContentType' as const };
  }
  return { url: 'tenantLogoUrl' as const, data: 'tenantLogoData' as const, contentType: 'tenantLogoContentType' as const };
}

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

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const tenantId = params.id;
    if (!tenantId) {
      return new Response('Not found', { status: 404 });
    }

    const variant = getVariant(url);
    const cols = getColumns(variant);

    const rows = await db
      .select({
        data: tenantBranding[cols.data],
        contentType: tenantBranding[cols.contentType],
      })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (rows.length === 0 || !rows[0].data || !rows[0].contentType) {
      return new Response('Not found', { status: 404 });
    }

    const buffer = Buffer.from(rows[0].data, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': rows[0].contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving logo:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

export const POST: APIRoute = async ({ cookies, params, request, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      return new Response(JSON.stringify({
        success: false, error: 'Tenant ID is required', code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: 'Tenant not found', code: 'NOT_FOUND',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return new Response(JSON.stringify({
        success: false, error: 'No logo file provided', code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Invalid file type. Allowed types: PNG, JPG, SVG', code: 'INVALID_FILE_TYPE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false, error: 'File size exceeds maximum of 500KB', code: 'FILE_TOO_LARGE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      let width = 0;
      let height = 0;

      if (file.type === 'image/png') {
        if (buffer.length >= 24) {
          width = buffer.readUInt32BE(16);
          height = buffer.readUInt32BE(20);
        }
      } else if (file.type === 'image/jpeg') {
        for (let i = 0; i < buffer.length - 8; i++) {
          if (buffer[i] === 0xff && (buffer[i + 1] === 0xc0 || buffer[i + 1] === 0xc2)) {
            height = buffer.readUInt16BE(i + 5);
            width = buffer.readUInt16BE(i + 7);
            break;
          }
        }
      }

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        return new Response(JSON.stringify({
          success: false,
          error: `Image dimensions exceed maximum of ${MAX_WIDTH}x${MAX_HEIGHT} pixels`,
          code: 'DIMENSIONS_TOO_LARGE',
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const variant = getVariant(url);
    const cols = getColumns(variant);
    const base64Data = buffer.toString('base64');
    const logoUrl = `/api/tenants/${tenantId}/logo${variant === 'dark' ? '?variant=dark' : ''}`;

    const existingRecord = await db
      .select({ id: tenantBranding.id })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existingRecord.length === 0) {
      await db
        .insert(tenantBranding)
        .values({
          tenantId,
          [cols.url]: logoUrl,
          [cols.data]: base64Data,
          [cols.contentType]: file.type,
          themeId: 'light',
        });
    } else {
      await db
        .update(tenantBranding)
        .set({
          [cols.url]: logoUrl,
          [cols.data]: base64Data,
          [cols.contentType]: file.type,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    const response: LogoResponse = {
      success: true,
      data: { logoUrl, variant },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ cookies, params, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      return new Response(JSON.stringify({
        success: false, error: 'Tenant ID is required', code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: 'Tenant not found', code: 'NOT_FOUND',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const variant = getVariant(url);
    const cols = getColumns(variant);

    const existingBranding = await db
      .select({ id: tenantBranding.id })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existingBranding.length > 0) {
      await db
        .update(tenantBranding)
        .set({
          [cols.url]: null,
          [cols.data]: null,
          [cols.contentType]: null,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    const response: LogoResponse = {
      success: true,
      data: { logoUrl: null, variant },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
