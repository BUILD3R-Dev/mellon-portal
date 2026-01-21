# Specification: Milestone 3 - Data Sync & Dashboards

## Goal

Integrate with the ClientTether API to sync external marketing data hourly and display it through interactive dashboard views, enabling clients to see real-time leads, pipeline, hot list, notes, and schedule data.

## User Stories

- As a tenant user, I want to view my synced marketing data in dashboard views so that I can track lead counts, pipeline status, and upcoming activities
- As an agency admin, I want the system to automatically sync ClientTether data for all tenants hourly so that client dashboards always show fresh data

## Specific Requirements

**ClientTether API Client Enhancement**
- Extend existing `ClientTetherClient` class in `src/lib/clienttether/client.ts` to add methods for fetching notes and schedule/activity data
- Use tenant's `clienttetherWebKey` stored in tenants table for per-brand API requests
- Add typed interfaces for API response shapes (leads, opportunities, notes, activities)
- Return both raw data and normalized error handling using existing `ApiResponse<T>` pattern

**Database Schema - Notes Table**
- Create `ct_notes` table with fields: id (uuid), tenant_id (FK), contact_id (varchar), note_date (timestamp), author (varchar), content (text), raw_json (jsonb), created_at (timestamp)
- Add index on tenant_id and note_date for query performance
- Follow existing pattern from `hotListItems` table for raw_json storage

**Database Schema - Scheduled Activities Table**
- Create `ct_scheduled_activities` table with fields: id (uuid), tenant_id (FK), activity_type (varchar), scheduled_at (timestamp), contact_name (varchar), description (text), status (varchar), raw_json (jsonb), created_at (timestamp)
- Add index on tenant_id and scheduled_at for filtering upcoming activities

**Sync Worker Implementation**
- Replace placeholder `worker/sync.js` with TypeScript implementation using node-cron
- Run hourly sync for all active tenants with `clienttetherWebKey` configured
- Create `sync_runs` record at start, update status on completion/failure
- Store raw API responses in `ct_raw_snapshots` table before normalization
- Implement exponential backoff retry (3 attempts: 1s, 2s, 4s delays) for transient failures

**Sync Status Tracking**
- Query `sync_runs` table to find latest successful sync per tenant
- Expose sync status through new API endpoint `GET /api/sync/status`
- Return `lastSyncAt` timestamp and `status` (success/failed/running)

**Cached Fallback with Freshness Warning**
- Dashboard pages always serve data from local database tables
- Display warning banner when last successful sync is older than 2 hours
- Banner shows exact data age (e.g., "Data is 3 hours old - sync may be delayed")
- Use yellow/amber styling consistent with existing alert patterns

**Leads Dashboard Page**
- Create `/leads` page using `DashboardLayout.astro`
- Display KPI cards: Total Leads, Qualified Leads, Lead Sources count
- Add ECharts bar chart showing leads by source dimension
- Add ECharts pie chart showing leads by status breakdown
- Query `lead_metrics` table filtered by current tenant context

**Pipeline Dashboard Page**
- Create `/pipeline` page using `DashboardLayout.astro`
- Display KPI cards: Total Pipeline Value, Stage Count, Average Deal Size
- Add ECharts horizontal bar chart showing counts per pipeline stage
- Query `pipeline_stage_counts` table filtered by current tenant context

**Hot List Dashboard Page**
- Create `/hot-list` page using `DashboardLayout.astro`
- Display table with columns: Candidate Name, Market, Units, Weighted IFF, Stage, Likely %
- Add status indicator badges for stage values
- Query `hot_list_items` table filtered by current tenant context, ordered by weighted_iff descending

**Notes Dashboard Page**
- Create `/notes` page using `DashboardLayout.astro`
- Display list of notes with: date, author, content preview (truncated)
- Add simple text search filter for content/author
- Query `ct_notes` table filtered by current tenant, ordered by note_date descending
- Limit to 50 most recent notes with load-more pattern

**Schedule Dashboard Page**
- Create `/schedule` page using `DashboardLayout.astro`
- Display simple list of upcoming scheduled activities (not calendar)
- Show: scheduled date/time, activity type, contact name, description
- Filter to show only future activities by default
- Query `ct_scheduled_activities` table where scheduled_at > now(), ordered by scheduled_at ascending

**Dashboard Navigation Updates**
- Update middleware `TENANT_REQUIRED_ROUTES` to include `/leads`, `/pipeline`, `/hot-list`, `/notes`, `/schedule`
- Navigation links already exist in `DashboardLayout.astro` header for leads, pipeline, hot-list
- Add `/notes` and `/schedule` links to header navigation

## Visual Design

No visual mockups provided - follow existing dashboard patterns established in `src/pages/dashboard.astro` for KPI cards and chart placeholder layouts.

## Existing Code to Leverage

**ClientTether Client (`src/lib/clienttether/client.ts`)**
- Extend existing `ClientTetherClient` class with new endpoint methods
- Reuse existing `request<T>` method and `ApiResponse<T>` pattern for API calls
- Factory function `createClientTetherClient(webKey)` already supports per-tenant keys

**Database Schema (`src/lib/db/schema.ts`)**
- Existing tables: `syncRuns`, `ctRawSnapshots`, `leadMetrics`, `pipelineStageCounts`, `hotListItems`
- Follow established patterns for uuid primary keys, tenant_id foreign keys, timestamp fields
- Reuse existing enums: `syncStatusEnum` for sync status tracking

**DashboardLayout (`src/layouts/DashboardLayout.astro`)**
- Use for all dashboard pages - provides header, navigation, footer, theming
- Accesses `Astro.locals` for user, tenantId, isAgencyAdmin context
- Already includes nav links for Dashboard, Reports, Leads, Pipeline, Hot List

**Middleware (`src/middleware/index.ts`)**
- Add new dashboard routes to `TENANT_REQUIRED_ROUTES` array
- Existing auth and RBAC middleware will handle session validation and tenant context

**API Route Patterns (`src/pages/api/reports/index.ts`)**
- Follow established pattern for tenant-scoped API endpoints
- Use `validateSession`, `getUserMemberships`, `TENANT_COOKIE_NAME` from auth lib
- Return typed response interfaces with success/error handling

## Out of Scope

- Complex job queue system (use simple node-cron instead)
- External notifications for sync failures (email/Slack alerting)
- Admin UI for configuring ClientTether field mappings
- Date range filtering on dashboard views
- Historical data viewing or time-series comparisons
- Calendar component for schedule view (use simple list)
- Per-tenant ClientTether accounts (single Mellon account with per-brand keys)
- Real-time sync triggers or webhooks
- Data export functionality from dashboards
- Dashboard customization or widget configuration
