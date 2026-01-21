/**
 * GET /api/dashboard/notes
 *
 * Returns paginated notes for the authenticated tenant user.
 * Supports query params: limit (default 50), offset, search
 * Orders by note_date descending (most recent first).
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships, TENANT_COOKIE_NAME } from '@/lib/auth';
import { db, ctNotes } from '@/lib/db';
import { eq, desc, and, or, ilike } from 'drizzle-orm';

interface NoteData {
  id: string;
  contactId: string | null;
  noteDate: string;
  author: string | null;
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
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      const response: NotesErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      const response: NotesErrorResponse = {
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user memberships to determine tenant access
    const memberships = await getUserMemberships(session.userId);

    // Check if user is agency admin (they need a specific tenant context)
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    // Get tenant context from cookie
    const tenantId = cookies.get(TENANT_COOKIE_NAME)?.value;

    // If no tenant context set, user cannot view notes
    if (!tenantId) {
      const response: NotesErrorResponse = {
        success: false,
        error: 'No tenant context selected',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this tenant (either agency admin or member)
    const hasTenantAccess = isAgencyAdmin || memberships.some((m) => m.tenantId === tenantId);

    if (!hasTenantAccess) {
      const response: NotesErrorResponse = {
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const searchParam = url.searchParams.get('search');

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
    const conditions = [eq(ctNotes.tenantId, tenantId)];

    // Add search filter if provided
    if (searchParam && searchParam.trim()) {
      const searchTerm = `%${searchParam.trim()}%`;
      conditions.push(
        or(
          ilike(ctNotes.content, searchTerm),
          ilike(ctNotes.author, searchTerm)
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
