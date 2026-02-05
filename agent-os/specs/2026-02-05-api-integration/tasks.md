# Task Breakdown: ClientTether API Integration - Dashboard Data Wiring

## Overview
Total Tasks: 6 Task Groups, 38 sub-tasks

This spec replaces the static placeholder dashboard with live data sourced from locally synced ClientTether tables. It involves schema changes, API client fixes, sync worker enhancements, two new API endpoints, and a React island-based dashboard page conversion.

## Task List

### Schema & Data Layer

#### Task Group 1: Database Schema Changes
**Dependencies:** None

- [x] 1.0 Complete database schema changes
  - [x] 1.1 Write 4 focused tests for schema changes
    - Test that `pipelineStageCounts` table accepts a `dollarValue` decimal column
    - Test that `tenants` table accepts a `clienttetherAccessToken` text column
    - Test that `pipelineStageCounts` indexes on `tenantId` and `reportWeekId` exist
    - Test that `leadMetrics` indexes on `tenantId` and `reportWeekId` exist
  - [x] 1.2 Add `dollarValue` column to `pipelineStageCounts` in schema
    - File: `src/lib/db/schema.ts`
    - Add `dollarValue: decimal('dollar_value', { precision: 12, scale: 2 }).default('0')` to the `pipelineStageCounts` table definition
    - This column stores the combined dollar amount per stage for Weighted Pipeline Value KPI
  - [x] 1.3 Add `clienttetherAccessToken` column to `tenants` in schema
    - File: `src/lib/db/schema.ts`
    - Add `clienttetherAccessToken: text('clienttether_access_token')` to the `tenants` table definition
    - Allows per-tenant storage of the X-Access-Token header value
  - [x] 1.4 Add indexes on `tenantId` and `reportWeekId` for `pipelineStageCounts` and `leadMetrics`
    - File: `src/lib/db/schema.ts`
    - Add index definitions using Drizzle's `index()` helper following the pattern in `memberships` and `syncRuns`
    - Indexes: `pipeline_stage_counts_tenant_id_idx`, `pipeline_stage_counts_report_week_id_idx`, `lead_metrics_tenant_id_idx`, `lead_metrics_report_week_id_idx`
  - [x] 1.5 Generate Drizzle migration for schema changes
    - Run `npx drizzle-kit generate` to produce a single migration file in `drizzle/`
    - Migration should be focused on the three additions: `dollarValue` column, `clienttetherAccessToken` column, and new indexes
    - Follow naming conventions: clear, descriptive migration name
  - [x] 1.6 Ensure schema tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify migration runs successfully with `npx drizzle-kit push` or equivalent

**Acceptance Criteria:**
- The 4 tests from 1.1 pass
- `pipelineStageCounts` schema includes `dollarValue` decimal column
- `tenants` schema includes `clienttetherAccessToken` text column
- Indexes exist for query performance on tenant-scoped and report-week-scoped queries
- Migration file is generated and committed

---

### API Client & Sync Worker

#### Task Group 2: ClientTether Client Auth Fix
**Dependencies:** Task Group 1

- [x] 2.0 Complete ClientTether client auth header fix
  - [x] 2.1 Write 3 focused tests for auth header change
    - Test that `request()` sends `X-Access-Token` header instead of `Authorization: Bearer`
    - Test that `X-Web-Key` header continues to be sent when `webKey` is provided
    - Test that `createClientTetherClient()` accepts and passes through a per-tenant `accessToken` parameter
  - [x] 2.2 Update `ClientTetherClient.request()` to use `X-Access-Token` header
    - File: `src/lib/clienttether/client.ts`
    - Change line `Authorization: \`Bearer ${this.accessToken}\`` to `'X-Access-Token': this.accessToken`
    - Reference: `planning/visuals/clienttether-api-settings.png` confirms `X-Access-Token` header format
  - [x] 2.3 Update `createClientTetherClient()` to accept per-tenant `accessToken`
    - File: `src/lib/clienttether/client.ts`
    - Add optional `accessToken` parameter alongside existing `webKey` parameter
    - If a per-tenant `accessToken` is provided, use it instead of the `CLIENTTETHER_ACCESS_TOKEN` env var
    - Signature becomes: `createClientTetherClient(webKey?: string, accessToken?: string)`
  - [x] 2.4 Ensure auth fix tests pass
    - Run ONLY the 3 tests written in 2.1
    - Mock external fetch calls, do not call the real ClientTether API

**Acceptance Criteria:**
- The 3 tests from 2.1 pass
- `request()` sends `X-Access-Token: <value>` header (not `Authorization: Bearer`)
- `X-Web-Key` header still sent when webKey is present
- Per-tenant access token override works

---

#### Task Group 3: Sync Worker Enhancements
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete sync worker enhancements
  - [x] 3.1 Write 5 focused tests for sync worker changes
    - Test that `normalizePipelineStages()` sums `value` from opportunities and writes `dollarValue` per stage
    - Test that `normalizePipelineStages()` writes `0` for `dollarValue` when opportunities have no `value` field
    - Test that `createWeeklySnapshot()` inserts `leadMetrics` rows linked to a `reportWeekId`
    - Test that `createWeeklySnapshot()` inserts `pipelineStageCounts` rows linked to a `reportWeekId`
    - Test that `syncTenant()` passes per-tenant `clienttetherAccessToken` to the client factory
  - [x] 3.2 Extend `normalizePipelineStages()` to sum dollar values per stage
    - File: `worker/sync.ts`
    - Add a `stageDollarValues` Map alongside existing `stageGroups` Map
    - Sum `opp.value || 0` per stage
    - Write the summed dollar value to the new `dollarValue` column when inserting `pipelineStageCounts` rows
  - [x] 3.3 Update `syncTenant()` to read per-tenant `clienttetherAccessToken`
    - File: `worker/sync.ts`
    - Update `TenantRecord` interface to include `clienttetherAccessToken: string | null`
    - Update `getTenantsWithWebKey()` query to also select the `clienttetherAccessToken` column
    - Pass `tenant.clienttetherAccessToken` to `createClientTetherClient(webKey, accessToken)`
  - [x] 3.4 Implement `createWeeklySnapshot()` function
    - File: `worker/sync.ts`
    - Creates a new function that takes `db`, `tenantId`, and a `reportWeekId`
    - Reads current live rows from `leadMetrics` and `pipelineStageCounts` where `reportWeekId IS NULL` for the given tenant
    - Inserts copies of those rows with the provided `reportWeekId` set, creating the historical snapshot
    - Should be called at the end of the Sunday sync cycle (or when a report week is finalized)
  - [x] 3.5 Add snapshot trigger logic to `runSync()`
    - File: `worker/sync.ts`
    - After all tenants are synced, check if today is Sunday (end of Monday-Sunday week)
    - If Sunday, find or create the corresponding `reportWeeks` row for the tenant, then call `createWeeklySnapshot()`
    - Use the existing `reportWeeks` table structure with `weekEndingDate`, `periodStartAt`, `periodEndAt`
  - [x] 3.6 Ensure sync worker tests pass
    - Run ONLY the 5 tests written in 3.1
    - Mock database calls and ClientTether API responses

**Acceptance Criteria:**
- The 5 tests from 3.1 pass
- `normalizePipelineStages()` writes both `count` and `dollarValue` per stage
- Per-tenant access tokens are passed through to the API client
- Weekly snapshots create report-week-linked rows in both `leadMetrics` and `pipelineStageCounts`
- Snapshot logic runs on Sundays

---

### API Endpoints

#### Task Group 4: Dashboard API Endpoints
**Dependencies:** Task Groups 1, 3

- [x] 4.0 Complete dashboard API endpoints
  - [x] 4.1 Write 6 focused tests for API endpoints
    - Test `/api/dashboard/kpi` returns 401 when no session cookie is present
    - Test `/api/dashboard/kpi` returns all four KPI values with correct shape `{ success: true, data: { newLeads, totalPipeline, priorityCandidates, weightedPipelineValue } }`
    - Test `/api/dashboard/kpi` respects `timeWindow=rolling-7` query parameter for `newLeads` calculation
    - Test `/api/dashboard/pipeline` returns per-stage `{ stage, count }` array for `HorizontalBarChart`
    - Test `/api/dashboard/pipeline` returns weekly trend data as `{ source: weekLabel, leads: count }` array for `LeadsChart`
    - Test `/api/dashboard/pipeline` respects `weeks` query parameter to control number of historical weeks
  - [x] 4.2 Create `GET /api/dashboard/kpi` endpoint
    - File: `src/pages/api/dashboard/kpi.ts`
    - Replicate the exact auth/tenant pattern from `src/pages/api/dashboard/leads.ts` (session cookie validation, tenant cookie, membership check, agency admin handling)
    - Accept query parameter `timeWindow` with values `report-week` (default) or `rolling-7`
    - Query `pipelineStageCounts` where `reportWeekId IS NULL` and `tenantId` matches for live pipeline data
    - **New Leads**: Query `leadMetrics` for leads created in the time window. For `report-week`: Monday of current week through today. For `rolling-7`: past 7 calendar days. Use `dimensionType = 'status'` rows and sum `leads` column
    - **Total Pipeline**: Sum `count` from all `pipelineStageCounts` live rows for the tenant
    - **Priority Candidates**: Sum `count` from `pipelineStageCounts` where `stage` is in the range `['QR Returned', 'FDD Sent', 'FDD Signed', 'FDD Review Call Sched.', 'FDD Review Call Compl.', 'FA Sent']`
    - **Weighted Pipeline Value**: Sum `dollarValue` from `pipelineStageCounts` where `stage` is in the full pipeline range from `New Lead` through `FA Sent`
    - Return typed response: `{ success: true, data: { newLeads: number, totalPipeline: number, priorityCandidates: number, weightedPipelineValue: string } }`
    - Return errors using shape: `{ success: false, error: string, code: string }`
  - [x] 4.3 Create `GET /api/dashboard/pipeline` endpoint
    - File: `src/pages/api/dashboard/pipeline.ts`
    - Replicate the exact auth/tenant pattern from `leads.ts`
    - Accept query parameter `weeks` (default `4`) controlling how many weeks of historical data
    - **Pipeline by Stage (current snapshot)**: Query `pipelineStageCounts` where `reportWeekId IS NULL` for the tenant; return as `{ stage: string, count: number }[]` matching `HorizontalBarChartDataPoint` interface
    - **Lead Trends (weekly history)**: Query `leadMetrics` rows that have a non-null `reportWeekId`; join with `reportWeeks` to get `weekEndingDate` as the label; limit to the requested number of weeks ordered by date descending; return as `{ source: string, leads: number }[]` matching `LeadsChartDataPoint` interface
    - Use Drizzle ORM `db.select().from().where()` with `eq`, `and`, `isNull`, `isNotNull`, `desc` operators
    - Return: `{ success: true, data: { pipelineByStage: [...], leadTrends: [...] } }`
  - [x] 4.4 Ensure API endpoint tests pass
    - Run ONLY the 6 tests written in 4.1
    - Mock database queries and auth functions

**Acceptance Criteria:**
- The 6 tests from 4.1 pass
- `/api/dashboard/kpi` returns all four KPI values from local tables
- `timeWindow` parameter correctly switches between report-week and rolling-7 calculations
- `/api/dashboard/pipeline` returns both per-stage breakdown and weekly trend data
- Both endpoints follow the exact auth pattern from `leads.ts`
- Response shapes match existing `{ success: true, data: {...} }` convention

---

### Frontend Components

#### Task Group 5: Dashboard Page Conversion & UI
**Dependencies:** Task Group 4

- [x] 5.0 Complete dashboard page conversion
  - [x] 5.1 Write 4 focused tests for dashboard UI components
    - Test that `DashboardIsland` renders 4 `KPICard` components with correct labels
    - Test that `DashboardIsland` shows loading skeleton state while fetching data
    - Test that toggling time window triggers a re-fetch of KPI data with updated `timeWindow` parameter
    - Test that chart time range selector re-fetches pipeline data with updated `weeks` parameter
  - [x] 5.2 Create `DashboardIsland.tsx` parent component
    - File: `src/components/dashboard/DashboardIsland.tsx`
    - This is the single parent React component that coordinates all dashboard interactivity
    - Manages state: `loading`, `kpiData`, `pipelineData`, `timeWindow` (from localStorage), `chartWeeks`
    - On mount: read `timeWindow` from `localStorage` (default `report-week`); fetch from both `/api/dashboard/kpi?timeWindow=X` and `/api/dashboard/pipeline?weeks=Y`
    - Re-fetch KPI data when `timeWindow` changes; re-fetch pipeline data when `chartWeeks` changes
    - Renders: time window toggle, 4 KPICard components, chart time range selector, LeadsChart, HorizontalBarChart
    - Use `fetch()` for API calls (standard browser fetch, no additional library needed)
  - [x] 5.3 Implement time window toggle UI
    - Within `DashboardIsland.tsx`
    - Render a segmented control or toggle with two options: "Current Report Week" and "Rolling 7 Days"
    - Use Tailwind utility classes consistent with the existing design system
    - On toggle: update `localStorage` key `dashboard-time-window` and set component state
    - State change triggers re-fetch of `/api/dashboard/kpi` with new `timeWindow` parameter
    - Only "New Leads" KPI value changes; other three KPIs are pipeline-wide
  - [x] 5.4 Wire KPI cards to live data
    - Within `DashboardIsland.tsx`
    - Card 1: label="New Leads", value=`kpiData.newLeads`, subtitle based on current time window
    - Card 2: label="Total Leads in Pipeline", value=`kpiData.totalPipeline`, subtitle="All active contacts"
    - Card 3: label="Priority Candidates", value=`kpiData.priorityCandidates`, subtitle="QR Returned through FA Sent"
    - Card 4: label="Weighted Pipeline Value", value=formatted dollar amount from `kpiData.weightedPipelineValue`, subtitle="New Lead through FA Sent"
    - Pass `loading` prop to each `KPICard` to show skeleton pulse during fetch
    - Use existing `KPICard` component from `src/components/dashboard/KPICard.tsx`
  - [x] 5.5 Implement chart time range selector
    - Within `DashboardIsland.tsx`
    - Render a dropdown or segmented control above the charts area
    - Default value: "4 weeks"
    - Designed for extensibility: values are a simple array `[{ label: '4 weeks', value: 4 }]` so `8 weeks`, `12 weeks` options can be added later as array entries
    - On change: update `chartWeeks` state, which triggers re-fetch of `/api/dashboard/pipeline?weeks=N`
  - [x] 5.6 Wire chart components to live data
    - Within `DashboardIsland.tsx`
    - Pass `pipelineData.leadTrends` to `LeadsChart` component with `title="Lead Trends"`
    - Pass `pipelineData.pipelineByStage` to `HorizontalBarChart` component with `title="Pipeline by Stage"`
    - Both chart components already accept the correct data shapes from their existing interfaces
    - Show loading placeholder (or empty charts) while data is being fetched
  - [x] 5.7 Convert `dashboard.astro` to use React islands
    - File: `src/pages/dashboard.astro`
    - Keep Astro layout structure: `DashboardLayout`, heading section, "View Latest Report" link
    - Replace the 4 static HTML KPI card `<div>` blocks with a single `<DashboardIsland client:load />` component
    - Replace the 2 static chart placeholder `<div>` blocks (charts are rendered inside `DashboardIsland`)
    - Replace the static sync banner HTML with `<SyncStatusBanner client:load />` from existing component
    - Import both components at the top of the Astro file
  - [x] 5.8 Ensure dashboard UI tests pass
    - Run ONLY the 4 tests written in 5.1
    - Mock `fetch` calls to `/api/dashboard/kpi` and `/api/dashboard/pipeline`
    - Mock `localStorage` for time window persistence

**Acceptance Criteria:**
- The 4 tests from 5.1 pass
- Dashboard page renders KPI cards with live data from API
- Time window toggle persists in localStorage and re-fetches KPI data
- Chart time range selector re-fetches pipeline data
- Charts display weekly lead trends and pipeline-by-stage breakdown
- Loading skeleton states display during data fetches
- Static HTML placeholders are fully replaced with React island components
- Visual output matches `planning/visuals/feedback-page-2.png` layout

---

### Testing

#### Task Group 6: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review existing tests and fill critical gaps only
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review the 4 schema tests from Task Group 1
    - Review the 3 auth fix tests from Task Group 2
    - Review the 5 sync worker tests from Task Group 3
    - Review the 6 API endpoint tests from Task Group 4
    - Review the 4 UI component tests from Task Group 5
    - Total existing tests: 22 tests
  - [x] 6.2 Analyze test coverage gaps for this feature only
    - Identify critical end-to-end workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's dashboard data wiring requirements
    - Do NOT assess entire application test coverage
    - Prioritize: KPI calculation correctness, time window switching, chart data pipeline
  - [x] 6.3 Write up to 8 additional strategic tests to fill gaps
    - Integration test: KPI endpoint returns correct `newLeads` count when `leadMetrics` has rows matching current report week
    - Integration test: KPI endpoint returns correct `weightedPipelineValue` by summing `dollarValue` across correct stages
    - Integration test: Pipeline endpoint returns correct number of weeks of `leadTrends` data based on `weeks` parameter
    - Integration test: `DashboardIsland` full render cycle - mount, fetch, display KPI values, toggle time window, verify re-fetch
    - Test that `normalizePipelineStages()` correctly sums dollar values from mixed opportunities (some with value, some without)
    - Test that weekly snapshot does not duplicate rows if run twice for the same week
    - Test that the priority candidates stage list matches the spec (QR Returned through FA Sent)
    - Test that time window toggle updates localStorage and the subtitle on the New Leads KPI card
  - [x] 6.4 Run all feature-specific tests
    - Run ONLY tests related to this spec's feature (tests from 1.1, 2.1, 3.1, 4.1, 5.1, and 6.3)
    - Expected total: approximately 30 tests
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 30 tests total)
- Critical user workflows for dashboard data wiring are covered
- No more than 8 additional tests added to fill gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Schema & Data Layer** (Task Group 1) - Foundation changes needed by all other groups
2. **API Client Auth Fix** (Task Group 2) - Must be correct before sync worker runs
3. **Sync Worker Enhancements** (Task Group 3) - Depends on schema columns and client fix; populates data for API endpoints
4. **Dashboard API Endpoints** (Task Group 4) - Depends on schema and sync data being available
5. **Dashboard Page Conversion & UI** (Task Group 5) - Depends on API endpoints being available
6. **Test Review & Gap Analysis** (Task Group 6) - Final pass after all implementation is complete

## Key Files Modified

| File | Task Group | Change Summary |
|------|-----------|----------------|
| `src/lib/db/schema.ts` | 1 | Add `dollarValue` column, `clienttetherAccessToken` column, indexes |
| `src/lib/clienttether/client.ts` | 2 | Change `Authorization: Bearer` to `X-Access-Token`, add per-tenant token |
| `worker/sync.ts` | 3 | Sum dollar values in pipeline normalization, add weekly snapshot, per-tenant token |
| `src/pages/api/dashboard/kpi.ts` | 4 | New file - KPI endpoint |
| `src/pages/api/dashboard/pipeline.ts` | 4 | New file - Pipeline endpoint |
| `src/components/dashboard/DashboardIsland.tsx` | 5 | New file - Parent dashboard React island |
| `src/pages/dashboard.astro` | 5 | Replace static HTML with React island components |

## Pipeline Stage Reference

These stage names are used in KPI calculations and are consistent across all tenants:

**Full pipeline (New Lead through FA Sent)** - used for Weighted Pipeline Value:
`New Lead`, `Outbound Call`, `Inbound Contact`, `Initial Call Scheduled`, `Initial Call Complete`, `QR`, `QR Returned`, `FDD Sent`, `FDD Signed`, `FDD Review Call Sched.`, `FDD Review Call Compl.`, `FA Sent`

**Priority Candidates subset (QR Returned through FA Sent)**:
`QR Returned`, `FDD Sent`, `FDD Signed`, `FDD Review Call Sched.`, `FDD Review Call Compl.`, `FA Sent`
