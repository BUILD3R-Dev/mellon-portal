/**
 * POST /api/tenants/[id]/notes
 *
 * Creates a new manual note for a tenant. Agency admin only.
 */
import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, getUserMemberships } from '@/lib/auth';
import { db, ctNotes, tenants, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

const MAX_CONTENT_LENGTH = 10000;

export const POST: APIRoute = async ({ cookies, params, request }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session',
        code: 'UNAUTHORIZED',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify agency admin
    const memberships = await getUserMemberships(session.userId);
    const isAgencyAdmin = memberships.some((m) => m.role === 'agency_admin' && m.tenantId === null);

    if (!isAgencyAdmin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only agency administrators can access this resource',
        code: 'FORBIDDEN',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const tenantId = params.id;
    if (!tenantId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tenant ID is required',
        code: 'VALIDATION_ERROR',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify tenant exists
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (existingTenant.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Parse and validate body
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
      .where(eq(users.id, session.userId))
      .limit(1);

    const authorUserName = user?.name || null;

    // Insert the note
    const [createdNote] = await db
      .insert(ctNotes)
      .values({
        tenantId,
        noteDate: new Date(),
        content: content.trim(),
        source: 'manual',
        authorUserId: session.userId,
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
    console.error('Error creating admin note:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
