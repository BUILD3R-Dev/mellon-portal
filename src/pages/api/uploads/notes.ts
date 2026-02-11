/**
 * POST /api/uploads/notes
 *
 * Uploads an image for use in notes.
 * Stores files in public/uploads/notes/{tenantId}/
 * Returns the public URL for the uploaded image.
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

    // Create storage directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'notes', tenantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = MIME_TO_EXT[file.type] || '.bin';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${uniqueId}${ext}`;
    const filePath = path.join(uploadDir, filename);
    const relativeUrl = `/uploads/notes/${tenantId}/${filename}`;

    fs.writeFileSync(filePath, buffer);

    return new Response(JSON.stringify({ success: true, url: relativeUrl }), {
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
