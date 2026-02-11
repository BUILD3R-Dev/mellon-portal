/**
 * GET /api/dashboard/notes
 * POST /api/dashboard/notes
 *
 * GET: Returns paginated notes for the authenticated tenant user.
 * Supports query params: limit (default 50), offset, search, timeWindow
 * Orders by note_date descending (most recent first).
 *
 * POST: Creates a new manual note for the authenticated tenant user.
 * Accepts { content: string } body.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, ctNotes, users } from '@/lib/db';
import { eq, desc, and, or, ilike, gte } from 'drizzle-orm';

interface NoteData {
  id: string;
  contactId: string | null;
  noteDate: string;
  author: string | null;
  authorUserName: string | null;
  source: string;
  content: string | null;
  createdAt: string;
}

interface NotesListResponse {
  success: true;
  data: {
    notes: NoteData[];
    limit: number;
    offset: number;
  };
}

interface NotesErrorResponse {
  success: false;
  error: string;
  code: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_CONTENT_LENGTH = 10000;

/**
 * Validates session and tenant access. Returns auth context or error response.
 */
async function validateTenantAccess(cookies: any): Promise<{
  authorized: boolean;
  userId?: string;
  tenantId?: string;
  errorResponse?: Response;
}> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const session = await validateSession(sessionToken);
  if (!session) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const memberships = await getUserMemberships(session.userId);
  const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);
  const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

  if (!tenantId) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false,
        error: 'No tenant context selected',
        code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);
  if (!hasTenantAccess) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  return { authorized: true, userId: session.userId, tenantId };
}

/**
 * Computes the start date for a given time window.
 */
function getTimeWindowStart(timeWindow: string): Date | null {
  const now = new Date();

  if (timeWindow === 'rolling-7') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeWindow === 'report-week') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  return null;
}

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const auth = await validateTenantAccess(cookies);
    if (!auth.authorized) return auth.errorResponse!;

    // Parse query params
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const searchParam = url.searchParams.get('search');
    const timeWindowParam = url.searchParams.get('timeWindow');

    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    // Build query conditions
    const conditions = [eq(ctNotes.tenantId, auth.tenantId!)];

    // Add time window filter
    if (timeWindowParam) {
      const startDate = getTimeWindowStart(timeWindowParam);
      if (startDate) {
        conditions.push(gte(ctNotes.noteDate, startDate));
      }
    }

    // Add search filter if provided
    if (searchParam && searchParam.trim()) {
      const searchTerm = `%${searchParam.trim()}%`;
      conditions.push(
        or(
          ilike(ctNotes.content, searchTerm),
          ilike(ctNotes.author, searchTerm),
          ilike(ctNotes.authorUserName, searchTerm)
        )!
      );
    }

    // Query notes
    const notes = await db
      .select()
      .from(ctNotes)
      .where(and(...conditions))
      .orderBy(desc(ctNotes.noteDate))
      .limit(limit)
      .offset(offset);

    // Format response data
    const notesData: NoteData[] = notes.map((note) => ({
      id: note.id,
      contactId: note.contactId,
      noteDate: note.noteDate.toISOString(),
      author: note.author,
      authorUserName: note.authorUserName,
      source: note.source,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
    }));

    const response: NotesListResponse = {
      success: true,
      data: {
        notes: notesData,
        limit,
        offset,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    const response: NotesErrorResponse = {
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

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const auth = await validateTenantAccess(cookies);
    if (!auth.authorized) return auth.errorResponse!;

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Content is required',
        code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return new Response(JSON.stringify({
        success: false,
        error: `Content must be ${MAX_CONTENT_LENGTH} characters or fewer`,
        code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Look up current user's name
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, auth.userId!))
      .limit(1);

    const authorUserName = user?.name || null;

    // Insert the note
    const [createdNote] = await db
      .insert(ctNotes)
      .values({
        tenantId: auth.tenantId!,
        noteDate: new Date(),
        content: content.trim(),
        source: 'manual',
        authorUserId: auth.userId!,
        authorUserName,
      })
      .returning();

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: createdNote.id,
        contactId: createdNote.contactId,
        noteDate: createdNote.noteDate.toISOString(),
        author: createdNote.author,
        authorUserName: createdNote.authorUserName,
        source: createdNote.source,
        content: createdNote.content,
        createdAt: createdNote.createdAt.toISOString(),
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error creating note:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
