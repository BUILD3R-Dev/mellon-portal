/**
 * Seed script to create an initial admin user
 *
 * Usage: npx tsx scripts/seed-admin.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createHash } from 'crypto';
import { users, memberships } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Hash password using the same method as the auth system
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seedAdmin() {
  const client = postgres(connectionString!);
  const db = drizzle(client);

  const email = 'dustin@build3r.io';
  const password = '@Dm1n2025';
  const name = 'Dustin';

  console.log(`\nSeeding admin user: ${email}\n`);

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('User already exists. Updating password and ensuring active status...');

      // Update existing user
      await db
        .update(users)
        .set({
          passwordHash: hashPassword(password),
          status: 'active',
          name: name,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));

      const userId = existingUser[0].id;

      // Ensure agency_admin membership exists
      const existingMembership = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, userId))
        .limit(1);

      if (existingMembership.length === 0) {
        await db.insert(memberships).values({
          userId: userId,
          tenantId: null,
          role: 'agency_admin',
        });
        console.log('Created agency_admin membership');
      } else {
        console.log('Membership already exists');
      }

      console.log('\n✅ Admin user updated successfully!\n');
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email,
          name: name,
          passwordHash: hashPassword(password),
          status: 'active',
        })
        .returning();

      console.log(`Created user with ID: ${newUser.id}`);

      // Create agency_admin membership (null tenantId for agency-level access)
      await db.insert(memberships).values({
        userId: newUser.id,
        tenantId: null,
        role: 'agency_admin',
      });

      console.log('Created agency_admin membership');
      console.log('\n✅ Admin user created successfully!\n');
    }

    console.log('Login credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\nThis user has agency_admin role and can access all admin features.\n');

  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedAdmin();
