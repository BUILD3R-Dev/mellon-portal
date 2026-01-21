import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

/**
 * Better Auth configuration for email/password authentication
 * - Uses PostgreSQL via Drizzle ORM for session storage
 * - Session duration: 30 days
 * - CSRF protection enabled by default
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
