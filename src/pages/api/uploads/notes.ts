/**
 * POST /api/uploads/notes — Upload an image for use in notes
 * GET  /api/uploads/notes?file={tenantId}/{filename} — Serve an uploaded image
 *
 * Files are stored in a persistent data directory (data/uploads/notes/{tenantId}/)
 * that survives Docker rebuilds. The returned URL points to the GET handler
 * so images are served through the API rather than as static files.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** Persistent upload directory that survives Docker rebuilds */
function getUploadBaseDir(): string {
  return path.join(process.cwd(), 'data', 'uploads', 'notes');
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const fileParam = url.searchParams.get('file');
    if (!fileParam) {
      return new Response('Not found', { status: 404 });
    }

    // Sanitize: only allow {uuid}/{filename} patterns, no path traversal
    const normalized = path.normalize(fileParam);
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      return new Response('Not found', { status: 404 });
    }

    const filePath = path.join(getUploadBaseDir(), normalized);
    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = EXT_TO_MIME[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving note image:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    // Authenticate
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;
    if (!tenantId) {
      return new Response(JSON.stringify({ success: false, error: 'No tenant context selected' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify tenant access
    const memberships = await getUserMemberships(session.userId);
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);
    const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);
    if (!hasTenantAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid file type. Allowed: PNG, JPG, GIF, WebP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ success: false, error: 'File size exceeds maximum of 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store in persistent data directory
    const uploadDir = path.join(getUploadBaseDir(), tenantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = MIME_TO_EXT[file.type] || '.bin';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${uniqueId}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Return URL that points to the GET handler
    const imageUrl = `/api/uploads/notes?file=${encodeURIComponent(`${tenantId}/${filename}`)}`;

    return new Response(JSON.stringify({ success: true, url: imageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading note image:', error);
    return new Response(JSON.stringify({ success: false, error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
