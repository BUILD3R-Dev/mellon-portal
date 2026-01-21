import type { APIRoute } from 'astro';
import { validateSession, SESSION_COOKIE_NAME, createUnauthorizedResponse } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  success: true;
  data: ProfileData;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * GET /api/profile
 *
 * Returns the current user's profile data.
 * Requires authenticated session.
 *
 * Response:
 * - 200: User profile data (excluding sensitive fields)
 * - 401: Unauthorized
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return createUnauthorizedResponse();
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return createUnauthorizedResponse('Invalid or expired session');
    }

    // Fetch user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        timezone: users.timezone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      const response: ErrorResponse = {
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: ProfileResponse = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    const response: ErrorResponse = {
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
 * PATCH /api/profile
 *
 * Updates the current user's profile.
 * Requires authenticated session.
 *
 * Request body:
 * - name: string (optional)
 * - timezone: string (optional, IANA timezone)
 *
 * Response:
 * - 200: Updated profile data
 * - 400: Validation error
 * - 401: Unauthorized
 */
export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    // Validate session
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return createUnauthorizedResponse();
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return createUnauthorizedResponse('Invalid or expired session');
    }

    // Parse request body
    const body = await request.json();
    const { name, timezone } = body;

    // Build updates
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Validate and add name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        const response: ErrorResponse = {
          success: false,
          error: 'Name must be a string',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        const response: ErrorResponse = {
          success: false,
          error: 'Name cannot be empty',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (trimmedName.length > 255) {
        const response: ErrorResponse = {
          success: false,
          error: 'Name must be 255 characters or less',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      updates.name = trimmedName;
    }

    // Validate and add timezone if provided
    if (timezone !== undefined) {
      if (typeof timezone !== 'string') {
        const response: ErrorResponse = {
          success: false,
          error: 'Timezone must be a string',
          code: 'VALIDATION_ERROR',
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Basic IANA timezone validation (format check)
      // A proper validation would check against a list of valid timezones
      const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
      if (timezone && !timezoneRegex.test(timezone)) {
        // Allow common formats like "UTC" as well
        const simpleTimezones = ['UTC', 'GMT'];
        if (!simpleTimezones.includes(timezone)) {
          const response: ErrorResponse = {
            success: false,
            error: 'Invalid timezone format. Use IANA timezone format (e.g., America/New_York)',
            code: 'VALIDATION_ERROR',
          };
          return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      updates.timezone = timezone;
    }

    // Update user record
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        timezone: users.timezone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const response: ProfileResponse = {
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        timezone: updatedUser.timezone,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const response: ErrorResponse = {
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
