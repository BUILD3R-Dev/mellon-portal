/**
 * GET /api/admin/branding/{type} — Serve uploaded portal branding files from database
 *
 * type: header-light | header-dark | footer-light | footer-dark | favicon
 */
import type { APIRoute } from 'astro';
import { db, portalBranding } from '@/lib/db';

const VALID_TYPES = ['header-light', 'header-dark', 'footer-light', 'footer-dark', 'favicon'];

const TYPE_TO_COLUMNS: Record<string, { data: string; contentType: string }> = {
  'header-light': { data: 'headerLogoLightData', contentType: 'headerLogoLightContentType' },
  'header-dark': { data: 'headerLogoDarkData', contentType: 'headerLogoDarkContentType' },
  'footer-light': { data: 'footerLogoLightData', contentType: 'footerLogoLightContentType' },
  'footer-dark': { data: 'footerLogoDarkData', contentType: 'footerLogoDarkContentType' },
  'favicon': { data: 'faviconData', contentType: 'faviconContentType' },
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const type = params.type;
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response('Not found', { status: 404 });
    }

    const rows = await db.select().from(portalBranding).limit(1);
    if (rows.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const branding = rows[0] as any;
    const columns = TYPE_TO_COLUMNS[type];
    const base64Data = branding[columns.data];
    const contentType = branding[columns.contentType];

    if (!base64Data || !contentType) {
      return new Response('Not found', { status: 404 });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
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
