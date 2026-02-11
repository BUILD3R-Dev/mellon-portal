/**
 * POST   /api/admin/branding/logo?type={type} — Upload a portal branding image
 * DELETE /api/admin/branding/logo?type={type} — Remove a portal branding image
 *
 * type: header-light | header-dark | footer-light | footer-dark | favicon
 *
 * Image data is stored as base64 in the database to survive container rebuilds.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, portalBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';

const VALID_TYPES = ['header-light', 'header-dark', 'footer-light', 'footer-dark', 'favicon'] as const;
type BrandingType = typeof VALID_TYPES[number];

const TYPE_TO_COLUMNS: Record<BrandingType, { url: string; data: string; contentType: string }> = {
  'header-light': { url: 'headerLogoLightUrl', data: 'headerLogoLightData', contentType: 'headerLogoLightContentType' },
  'header-dark': { url: 'headerLogoDarkUrl', data: 'headerLogoDarkData', contentType: 'headerLogoDarkContentType' },
  'footer-light': { url: 'footerLogoLightUrl', data: 'footerLogoLightData', contentType: 'footerLogoLightContentType' },
  'footer-dark': { url: 'footerLogoDarkUrl', data: 'footerLogoDarkData', contentType: 'footerLogoDarkContentType' },
  'favicon': { url: 'faviconUrl', data: 'faviconData', contentType: 'faviconContentType' },
};

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const FAVICON_MIME_TYPES = [...ALLOWED_MIME_TYPES, 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

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

export const POST: APIRoute = async ({ cookies, request, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) return authResult.errorResponse!;

    const type = url.searchParams.get('type') as BrandingType;
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(JSON.stringify({
        success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return new Response(JSON.stringify({
        success: false, error: 'No file provided', code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const allowedTypes = type === 'favicon' ? FAVICON_MIME_TYPES : ALLOWED_MIME_TYPES;
    if (!allowedTypes.includes(file.type)) {
      const formats = type === 'favicon' ? 'PNG, JPG, SVG, or ICO' : 'PNG, JPG, or SVG';
      return new Response(JSON.stringify({
        success: false, error: `Invalid file type. Allowed: ${formats}`, code: 'INVALID_FILE_TYPE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false, error: 'File size exceeds 500KB limit', code: 'FILE_TOO_LARGE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const fileUrl = `/api/admin/branding/${type}`;
    const columns = TYPE_TO_COLUMNS[type];

    // Update database with image data
    const branding = await getOrCreateBranding();
    await db
      .update(portalBranding)
      .set({
        [columns.url]: fileUrl,
        [columns.data]: base64Data,
        [columns.contentType]: file.type,
        updatedAt: new Date(),
      })
      .where(eq(portalBranding.id, branding.id));

    return new Response(JSON.stringify({
      success: true, data: { url: fileUrl, type },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error uploading portal branding file:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) return authResult.errorResponse!;

    const type = url.searchParams.get('type') as BrandingType;
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(JSON.stringify({
        success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const columns = TYPE_TO_COLUMNS[type];

    // Clear from database
    const branding = await getOrCreateBranding();
    await db
      .update(portalBranding)
      .set({
        [columns.url]: null,
        [columns.data]: null,
        [columns.contentType]: null,
        updatedAt: new Date(),
      })
      .where(eq(portalBranding.id, branding.id));

    return new Response(JSON.stringify({
      success: true, data: { url: null, type },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error deleting portal branding file:', error);
    return new Response(JSON.stringify({
      success: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
