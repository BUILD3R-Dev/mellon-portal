/**
 * GET    /api/tenants/[id]/logo — Serve the tenant's logo image
 * POST   /api/tenants/[id]/logo — Upload a logo for the tenant
 * DELETE /api/tenants/[id]/logo — Remove the tenant's logo
 *
 * Logos are stored in data/uploads/logos/{tenantId}/ (persistent across deploys).
 * The GET handler serves the file directly with immutable cache headers.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants, tenantBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface LogoResponse {
  success: true;
  data: {
    tenantLogoUrl: string | null;
  };
}

interface LogoErrorResponse {
  success: false;
  error: string;
  code: string;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_WIDTH = 400;
const MAX_HEIGHT = 150;

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
};

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/** Persistent upload directory that survives Docker rebuilds */
function getLogoDir(tenantId: string): string {
  return path.join(process.cwd(), 'data', 'uploads', 'logos', tenantId);
}

/**
 * Validates agency admin authorization
 */
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

/**
 * Finds the logo file on disk for a tenant (logo.png, logo.jpg, or logo.svg)
 */
function findLogoFile(tenantId: string): { filePath: string; ext: string } | null {
  const dir = getLogoDir(tenantId);
  for (const ext of ['.png', '.jpg', '.svg']) {
    const filePath = path.join(dir, `logo${ext}`);
    if (fs.existsSync(filePath)) {
      return { filePath, ext };
    }
  }
  return null;
}

/**
 * GET /api/tenants/[id]/logo
 *
 * Serves the tenant's logo image from the persistent data directory.
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const tenantId = params.id;
    if (!tenantId) {
      return new Response('Not found', { status: 404 });
    }

    const logo = findLogoFile(tenantId);
    if (!logo) {
      return new Response('Not found', { status: 404 });
    }

    const contentType = EXT_TO_MIME[logo.ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(logo.filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving logo:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

/**
 * POST /api/tenants/[id]/logo
 *
 * Uploads a logo for the tenant. Only accessible by agency admins.
 */
export const POST: APIRoute = async ({ cookies, params, request }) => {
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

    // Check if tenant exists
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return new Response(JSON.stringify({
        success: false, error: 'No logo file provided', code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Invalid file type. Allowed types: PNG, JPG, SVG', code: 'INVALID_FILE_TYPE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false, error: 'File size exceeds maximum of 500KB', code: 'FILE_TOO_LARGE',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For PNG and JPEG, check dimensions (skip for SVG)
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

    // Create persistent storage directory
    const uploadDir = getLogoDir(tenantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Delete existing logo file if any
    const existingLogo = findLogoFile(tenantId);
    if (existingLogo) {
      fs.unlinkSync(existingLogo.filePath);
    }

    // Save file
    const extension = MIME_TO_EXT[file.type] || '';
    const filename = `logo${extension}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // URL points to the GET handler
    const logoUrl = `/api/tenants/${tenantId}/logo`;

    // Update database
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
          tenantLogoUrl: logoUrl,
          themeId: 'light',
        });
    } else {
      await db
        .update(tenantBranding)
        .set({
          tenantLogoUrl: logoUrl,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    const response: LogoResponse = {
      success: true,
      data: { tenantLogoUrl: logoUrl },
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

/**
 * DELETE /api/tenants/[id]/logo
 *
 * Removes the logo for the tenant. Only accessible by agency admins.
 */
export const DELETE: APIRoute = async ({ cookies, params }) => {
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

    // Check if tenant exists
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

    // Delete file from storage if exists
    const existingLogo = findLogoFile(tenantId);
    if (existingLogo) {
      fs.unlinkSync(existingLogo.filePath);
    }

    // Update database
    const existingBranding = await db
      .select({ id: tenantBranding.id })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existingBranding.length > 0) {
      await db
        .update(tenantBranding)
        .set({
          tenantLogoUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    const response: LogoResponse = {
      success: true,
      data: { tenantLogoUrl: null },
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
