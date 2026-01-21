# Task Breakdown: Database Schema Setup

## Overview
Total Tasks: 14

This spec focuses on generating the initial Drizzle migration from the existing schema, adding performance indexes to frequently queried columns, and documenting the migration workflow. This is a backend-only spec with no UI components.

## Task List

### Schema Layer

#### Task Group 1: Add Performance Indexes to Schema
**Dependencies:** None

- [x] 1.0 Complete schema index additions
  - [x] 1.1 Write 2-4 focused tests for index verification
    - Test that indexes are defined on the schema for critical columns
    - Verify index names follow naming conventions
    - Use Drizzle introspection or schema inspection
  - [x] 1.2 Add indexes to `memberships` table
    - Add index on `user_id` for user lookup performance
    - Add index on `tenant_id` for tenant filtering
    - Use Drizzle's `index()` function from `drizzle-orm/pg-core`
  - [x] 1.3 Add index to `sessions` table
    - Add index on `user_id` for session lookup by user
  - [x] 1.4 Add indexes to `report_weeks` table
    - Add index on `tenant_id` for tenant filtering
    - Add index on `week_ending_date` for date range queries
  - [x] 1.5 Add index to `sync_runs` table
    - Add index on `tenant_id` for tenant filtering
  - [x] 1.6 Add indexes to `ct_raw_snapshots` table
    - Add index on `tenant_id` for tenant filtering
    - Add index on `endpoint` for endpoint-based queries
  - [x] 1.7 Ensure schema index tests pass
    - Run ONLY the 2-4 tests written in 1.1
    - Verify all 8 indexes are properly defined in schema

**Acceptance Criteria:**
- All 8 required indexes are added to schema.ts
- Indexes use proper Drizzle ORM syntax
- Schema file remains valid TypeScript
- Index tests pass

### Migration Layer

#### Task Group 2: Generate and Verify Initial Migration
**Dependencies:** Task Group 1

- [x] 2.0 Complete migration generation and verification
  - [x] 2.1 Write 2-4 focused tests for migration verification
    - Test that generated SQL includes all 15 tables
    - Test that all 5 enums are present in migration
    - Test that foreign key constraints are correctly defined
    - Test that new indexes appear in migration SQL
  - [x] 2.2 Run `npm run db:generate` to create initial migration
    - Execute drizzle-kit generate command
    - Verify migration files are created in `./drizzle` directory
    - Check that migration file naming follows Drizzle conventions
  - [x] 2.3 Verify generated migration SQL completeness
    - Confirm all tables from schema.ts are included:
      - Core: tenants, tenant_branding, users, memberships, sessions
      - Reporting: report_weeks, report_week_manual, lead_metrics, pipeline_stage_counts, hot_list_items, report_exports
      - Sync: sync_runs, ct_raw_snapshots
      - Config: tenant_field_mappings, audit_log
    - Confirm all 5 enums are created:
      - tenant_status, user_status, membership_role, report_week_status, sync_status
    - Confirm all foreign key constraints with proper cascade behaviors
    - Confirm all 8 new indexes are included
  - [x] 2.4 Verify UUID primary keys and defaults
    - Confirm all tables use UUID primary keys with `defaultRandom()`
    - Verify email uniqueness constraint on users table
    - Confirm nullable `tenant_id` in memberships table (intentional for agency admins)
  - [x] 2.5 Ensure migration verification tests pass
    - Run ONLY the 2-4 tests written in 2.1
    - Verify migration is complete and correct

**Acceptance Criteria:**
- Migration files generated in `./drizzle` directory
- All 15 tables present in migration SQL
- All 5 enums created correctly
- All 8 indexes included in migration
- All foreign key relationships with cascade behaviors preserved
- UUID primary keys with defaultRandom() for all tables

### Documentation Layer

#### Task Group 3: Create Migration Workflow Documentation
**Dependencies:** Task Group 2

- [x] 3.0 Complete migration documentation
  - [x] 3.1 Create `docs/migrations.md` documentation file
    - Document purpose and overview of Drizzle migrations
    - Explain the schema-first approach
  - [x] 3.2 Document Drizzle migration commands
    - `npm run db:generate` - Generate migration files from schema changes
    - `npm run db:migrate` - Run pending migrations against database
    - `npm run db:push` - Push schema directly to database (dev only, no migration files)
    - `npm run db:studio` - Open Drizzle Studio for database inspection
  - [x] 3.3 Document development workflow
    - How to make schema changes in `src/lib/db/schema.ts`
    - When and how to generate new migrations
    - How to verify migrations before committing
    - How to run migrations locally
  - [x] 3.4 Document production deployment considerations
    - Running migrations in production environments
    - Backup recommendations before migrations
    - Rollback considerations (Drizzle limitations)
    - Zero-downtime deployment tips
  - [x] 3.5 Add troubleshooting section
    - Common migration errors and solutions
    - How to handle schema drift
    - DATABASE_URL configuration requirements

**Acceptance Criteria:**
- `docs/migrations.md` file created
- All four db: scripts documented with clear explanations
- Development workflow clearly explained
- Production considerations addressed
- Troubleshooting guidance included

### Verification Layer

#### Task Group 4: Final Verification
**Dependencies:** Task Groups 1-3

- [x] 4.0 Complete final verification
  - [x] 4.1 Review all changes made
    - Review index additions to `src/lib/db/schema.ts`
    - Review generated migration files in `./drizzle`
    - Review documentation in `docs/migrations.md`
  - [x] 4.2 Run all feature-specific tests
    - Run tests from Task 1.1 (index verification)
    - Run tests from Task 2.1 (migration verification)
    - Expected total: approximately 4-8 tests
  - [x] 4.3 Verify schema integrity
    - Ensure schema.ts has no TypeScript errors
    - Ensure no breaking changes to existing schema structure
    - Confirm Better Auth compatibility preserved (users, sessions tables)
  - [x] 4.4 Test migration against local database (if available)
    - Run `npm run db:push` against local PostgreSQL (if configured)
    - Verify all tables, indexes, and constraints created correctly
    - Use `npm run db:studio` to inspect database structure

**Acceptance Criteria:**
- All feature-specific tests pass
- Schema has no TypeScript errors
- Migration can be applied to a fresh database
- Documentation is complete and accurate

## Execution Order

Recommended implementation sequence:

1. **Schema Layer (Task Group 1)** - Add indexes to schema.ts first, as this is the source of truth for the migration
2. **Migration Layer (Task Group 2)** - Generate migration after schema is complete with all indexes
3. **Documentation Layer (Task Group 3)** - Document workflow after migration is verified
4. **Verification Layer (Task Group 4)** - Final verification after all implementation is complete

## Technical Notes

### Index Implementation Reference
Drizzle ORM indexes are added using the table's third argument:

```typescript
import { pgTable, uuid, index } from 'drizzle-orm/pg-core';

export const memberships = pgTable('memberships', {
  // columns...
}, (table) => [
  index('memberships_user_id_idx').on(table.userId),
  index('memberships_tenant_id_idx').on(table.tenantId),
]);
```

### Files Modified
- `src/lib/db/schema.ts` - Add 8 indexes across 5 tables

### Files Created
- `drizzle/XXXX_initial_migration.sql` - Generated migration file(s)
- `docs/migrations.md` - Migration workflow documentation

### Out of Scope Reminders
- Do NOT modify existing schema structure beyond adding indexes
- Do NOT add seed data or test fixtures
- Do NOT configure Better Auth (separate spec)
- Do NOT change UUID primary keys to sequential IDs
- Do NOT add NOT NULL constraint to memberships.tenantId
