import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, tenants, tenantBranding } from '@/lib/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

/** Returns the directory from which static files are served at runtime. */
function getStaticDir(): string {
  if (import.meta.env.PROD) {
    return path.join(process.cwd(), 'dist', 'client');
  }
  return path.join(process.cwd(), 'public');
}

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

/**
 * Validates agency admin authorization
 */
async function validateAgencyAdmin(cookies: any): Promise<{ isAuthorized: boolean; userId?: string; errorResponse?: Response }> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const response: LogoErrorResponse = {
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
    const response: LogoErrorResponse = {
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
  const isAgencyAdmin = userMemberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

  if (!isAgencyAdmin) {
    const response: LogoErrorResponse = {
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
 * Gets the extension from a MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/svg+xml':
      return '.svg';
    default:
      return '';
  }
}

/**
 * Ensures directory exists
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * POST /api/tenants/[id]/logo
 *
 * Uploads a logo for the tenant.
 * Only accessible by agency admins.
 *
 * Request: multipart/form-data with 'logo' file
 * - Accepts: PNG, JPG, SVG
 * - Max size: 500KB
 * - Max dimensions: 400x150 pixels
 *
 * Response:
 * - 200: Logo URL
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
      const response: LogoErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if tenant exists
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'No logo file provided',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'Invalid file type. Allowed types: PNG, JPG, SVG',
        code: 'INVALID_FILE_TYPE',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'File size exceeds maximum of 500KB',
        code: 'FILE_TOO_LARGE',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For PNG and JPEG, check dimensions (skip for SVG)
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      // Simple dimension check using image header parsing
      // PNG: dimensions at bytes 16-23
      // JPEG: more complex, scan for SOF marker
      let width = 0;
      let height = 0;

      if (file.type === 'image/png') {
        // PNG header: width at bytes 16-19, height at bytes 20-23 (big endian)
        if (buffer.length >= 24) {
          width = buffer.readUInt32BE(16);
          height = buffer.readUInt32BE(20);
        }
      } else if (file.type === 'image/jpeg') {
        // JPEG: scan for SOF0 or SOF2 marker (0xFF 0xC0 or 0xFF 0xC2)
        for (let i = 0; i < buffer.length - 8; i++) {
          if (buffer[i] === 0xff && (buffer[i + 1] === 0xc0 || buffer[i + 1] === 0xc2)) {
            height = buffer.readUInt16BE(i + 5);
            width = buffer.readUInt16BE(i + 7);
            break;
          }
        }
      }

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const response: LogoErrorResponse = {
          success: false,
          error: `Image dimensions exceed maximum of ${MAX_WIDTH}x${MAX_HEIGHT} pixels`,
          code: 'DIMENSIONS_TOO_LARGE',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Create storage directory (write to the directory the server actually serves)
    const uploadDir = path.join(getStaticDir(), 'uploads', 'logos', tenantId);
    ensureDirectoryExists(uploadDir);

    // Delete existing logo if any
    const existingBranding = await db
      .select({ tenantLogoUrl: tenantBranding.tenantLogoUrl })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existingBranding.length > 0 && existingBranding[0].tenantLogoUrl) {
      const oldFilePath = path.join(getStaticDir(), existingBranding[0].tenantLogoUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Generate filename and save file
    const extension = getExtensionFromMimeType(file.type);
    const filename = `logo${extension}`;
    const filePath = path.join(uploadDir, filename);
    const relativeUrl = `/uploads/logos/${tenantId}/${filename}`;

    fs.writeFileSync(filePath, buffer);

    // Update database
    const existingRecord = await db
      .select({ id: tenantBranding.id })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existingRecord.length === 0) {
      // Create new branding record
      await db
        .insert(tenantBranding)
        .values({
          tenantId,
          tenantLogoUrl: relativeUrl,
          themeId: 'light',
        });
    } else {
      // Update existing branding record
      await db
        .update(tenantBranding)
        .set({
          tenantLogoUrl: relativeUrl,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    const response: LogoResponse = {
      success: true,
      data: {
        tenantLogoUrl: relativeUrl,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    const response: LogoErrorResponse = {
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
 * DELETE /api/tenants/[id]/logo
 *
 * Removes the logo for the tenant.
 * Only accessible by agency admins.
 *
 * Response:
 * - 200: Logo removed
 * - 401: Unauthorized
 * - 403: Forbidden (not an agency admin)
 * - 404: Tenant not found
 */
export const DELETE: APIRoute = async ({ cookies, params }) => {
  try {
    const authResult = await validateAgencyAdmin(cookies);
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }

    const tenantId = params.id;
    if (!tenantId) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if tenant exists
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      const response: LogoErrorResponse = {
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current logo URL
    const existingBranding = await db
      .select({ tenantLogoUrl: tenantBranding.tenantLogoUrl })
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    // Delete file from storage if exists
    if (existingBranding.length > 0 && existingBranding[0].tenantLogoUrl) {
      const filePath = path.join(getStaticDir(), existingBranding[0].tenantLogoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Update database
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
      data: {
        tenantLogoUrl: null,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    const response: LogoErrorResponse = {
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
