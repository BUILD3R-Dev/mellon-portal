/**
 * GET /api/admin/branding/{type} — Serve uploaded portal branding files
 *
 * type: header-light | header-dark | footer-light | footer-dark | favicon
 */
import type { APIRoute } from 'astro';
import * as fs from 'fs';
import * as path from 'path';

const VALID_TYPES = ['header-light', 'header-dark', 'footer-light', 'footer-dark', 'favicon'];

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getUploadDir(type: string): string {
  return path.join(process.cwd(), 'data', 'uploads', 'portal-branding', type);
}

function findFile(type: string): { filePath: string; ext: string } | null {
  const dir = getUploadDir(type);
  for (const ext of ['.png', '.jpg', '.svg', '.ico']) {
    const filePath = path.join(dir, `logo${ext}`);
    if (fs.existsSync(filePath)) {
      return { filePath, ext };
    }
  }
  return null;
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const type = params.type;
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response('Not found', { status: 404 });
    }

    const file = findFile(type);
    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    const contentType = EXT_TO_MIME[file.ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(file.filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving portal branding file:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
