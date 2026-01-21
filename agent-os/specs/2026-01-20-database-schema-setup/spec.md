# Specification: Database Schema Setup

## Goal
Generate the initial Drizzle migration from the existing schema, add performance indexes to frequently queried columns, and document the migration workflow for the development team.

## User Stories
- As a developer, I want to generate database migrations from the existing schema so that I can deploy the application to a fresh PostgreSQL database
- As a developer, I want performance indexes on frequently queried columns so that multi-tenant queries remain fast as data grows

## Specific Requirements

**Generate Initial Migration**
- Run `npm run db:generate` (drizzle-kit generate) to create the initial migration from `src/lib/db/schema.ts`
- Migration output goes to the `./drizzle` directory as configured in `drizzle.config.ts`
- Verify the generated SQL includes all tables, enums, and foreign key constraints from the schema
- Do not modify the existing schema.ts file structure; only add indexes

**Add Performance Indexes**
- Add index on `memberships.user_id` for user lookup performance
- Add index on `memberships.tenant_id` for tenant filtering
- Add index on `sessions.user_id` for session lookup by user
- Add index on `report_weeks.tenant_id` for tenant filtering
- Add index on `report_weeks.week_ending_date` for date range queries
- Add index on `sync_runs.tenant_id` for tenant filtering
- Add index on `ct_raw_snapshots.tenant_id` for tenant filtering
- Add index on `ct_raw_snapshots.endpoint` for endpoint-based queries

**Better Auth Schema Integration**
- The current `users` and `sessions` tables already include custom fields (status, inviteToken, inviteExpiresAt)
- When Better Auth is configured, it will use these existing tables with the custom extensions
- Keep passwordHash field in users table for Better Auth credentials provider compatibility
- Ensure email uniqueness constraint is preserved for Better Auth lookups

**Maintain UUID Primary Keys**
- All tables use UUID primary keys with `defaultRandom()` for automatic generation
- UUIDs provide non-guessable IDs which is important for multi-tenant security
- Do not change primary key strategy to sequential IDs

**Document Migration Workflow**
- Create `docs/migrations.md` documenting the Drizzle migration commands
- Include instructions for generating new migrations after schema changes
- Document the difference between `db:generate`, `db:migrate`, and `db:push` commands
- Add instructions for running migrations in development vs production

**Nullable Tenant ID in Memberships**
- The nullable `tenantId` in the memberships table is intentional
- Agency admins have null tenantId allowing them to access all tenants
- Do not add a NOT NULL constraint to this column

## Visual Design
No visual assets provided - this is a backend database schema spec with no UI components.

## Existing Code to Leverage

**`src/lib/db/schema.ts`**
- Complete schema definition with 15 tables covering tenants, users, memberships, sessions, reporting, and sync
- 5 PostgreSQL enums defined (tenant_status, user_status, membership_role, report_week_status, sync_status)
- All tables have UUID primary keys and proper timestamps
- Foreign key relationships with cascade delete behaviors already defined

**`src/lib/db/index.ts`**
- Database client setup using postgres driver and drizzle-orm
- Exports the `db` instance with schema for typed queries
- Re-exports all schema definitions for convenient imports

**`drizzle.config.ts`**
- Configured for PostgreSQL dialect with schema at `./src/lib/db/schema.ts`
- Migration output directory set to `./drizzle`
- Uses DATABASE_URL environment variable for credentials

**`package.json` scripts**
- `db:generate` - generates migration files from schema
- `db:migrate` - runs pending migrations
- `db:push` - pushes schema directly (dev only)
- `db:studio` - opens Drizzle Studio for database inspection

## Out of Scope
- Seed data generation or test fixtures
- Additional tables beyond the current schema
- UI components or frontend changes
- Changing UUID primary keys to sequential IDs
- Adding NOT NULL constraint to memberships.tenantId
- Better Auth configuration or setup (separate spec)
- Data migration scripts for existing data
- Database backup or restore procedures
- Connection pooling configuration
- Read replica setup
