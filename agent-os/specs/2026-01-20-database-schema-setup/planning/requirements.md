# Spec Requirements: Database Schema Setup

## Initial Description
Database Schema Setup - Define and migrate core tables for users, tenants, tenant_users, and sessions using Drizzle ORM with proper indexes and constraints

**Source:** Product Roadmap - Milestone 1, Item 1
**Size Estimate:** S (Small)

## Requirements Discussion

### First Round Questions

**Q1:** Should we generate the initial Drizzle migration from the existing schema, or is this spec about defining new tables from scratch?
**Answer:** Generate the initial Drizzle migration from the existing schema.

**Q2:** What index strategy should we use for the tables?
**Answer:** Add indexes for:
- `memberships.user_id` and `memberships.tenant_id`
- `sessions.user_id`
- `report_weeks.tenant_id` and `report_weeks.week_ending_date`
- `sync_runs.tenant_id`
- `ct_raw_snapshots.tenant_id` and `ct_raw_snapshots.endpoint`

**Q3:** Should we keep UUIDs as primary keys or switch to sequential IDs?
**Answer:** Keep UUIDs. Recommended for multi-tenant security with non-guessable IDs.

**Q4:** Is the nullable tenantId in memberships intentional?
**Answer:** Yes, confirmed correct. Agency admins can see all tenants, so null tenantId is intentional.

**Q5:** How should we handle Better Auth integration with our custom fields?
**Answer:** Option 3 - Extend Better Auth schema. Use Better Auth's generated schema as the base, then add custom fields directly to it (status, inviteToken, inviteExpiresAt, etc.). Better Auth supports custom fields.

**Q6:** Should this spec include seed data for development?
**Answer:** No seed data. Scope limited to:
- Generate initial migration from schema
- Add recommended indexes
- Document migration workflow

### Existing Code to Reference

**Similar Features Identified:**
- Schema: `src/lib/db/schema.ts`
- DB Client: `src/lib/db/index.ts`
- Config: `drizzle.config.ts`

**Dependencies Available:**
- drizzle-orm
- drizzle-kit
- better-auth
- postgres

### Follow-up Questions
None required - all requirements clarified in first round.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a backend database schema spec with no UI components.

## Requirements Summary

### Functional Requirements
- Generate initial Drizzle migration from the existing schema at `src/lib/db/schema.ts`
- Add performance indexes to frequently queried columns
- Extend Better Auth schema with custom fields (status, inviteToken, inviteExpiresAt, etc.)
- Maintain UUID primary keys for multi-tenant security
- Document the migration workflow for the team

### Index Requirements
The following indexes must be added:

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| memberships | user_id | User lookup performance |
| memberships | tenant_id | Tenant filtering |
| sessions | user_id | Session lookup by user |
| report_weeks | tenant_id | Tenant filtering |
| report_weeks | week_ending_date | Date range queries |
| sync_runs | tenant_id | Tenant filtering |
| ct_raw_snapshots | tenant_id | Tenant filtering |
| ct_raw_snapshots | endpoint | Endpoint-based queries |

### Better Auth Integration
- Use Better Auth's schema generation as the base
- Add custom fields directly to Better Auth tables:
  - `status` - User account status
  - `inviteToken` - Invitation token for user onboarding
  - `inviteExpiresAt` - Token expiration timestamp
- Better Auth supports custom field extensions natively

### Reusability Opportunities
- Existing schema at `src/lib/db/schema.ts` is the source of truth
- Existing db client at `src/lib/db/index.ts` for connection handling
- Drizzle config at `drizzle.config.ts` defines migration settings

### Scope Boundaries

**In Scope:**
- Generate initial Drizzle migration from existing schema
- Add recommended indexes to schema
- Document migration workflow
- Extend Better Auth schema with custom fields

**Out of Scope:**
- Seed data generation
- Test data fixtures
- Additional tables beyond current schema
- UI components

### Technical Considerations
- Use Drizzle Kit for migration generation (`drizzle-kit generate`)
- PostgreSQL is the target database (postgres driver in dependencies)
- Nullable `tenantId` in memberships is intentional for agency admin access
- UUIDs provide security benefit of non-guessable IDs in multi-tenant context
- Better Auth handles core auth tables; we extend with custom fields
