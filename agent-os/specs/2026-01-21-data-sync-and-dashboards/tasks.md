# Task Breakdown: Milestone 3 - Data Sync & Dashboards

## Overview
Total Tasks: 42 tasks across 6 task groups

This milestone integrates with the ClientTether API to sync external marketing data hourly and display it through interactive dashboard views, enabling clients to see real-time leads, pipeline, hot list, notes, and schedule data.

## Task List

### Database Layer

#### Task Group 1: Database Schema for Notes and Scheduled Activities
**Dependencies:** None

- [x] 1.0 Complete database schema additions for notes and scheduled activities
  - [x] 1.1 Write 4 focused tests for new schema tables
    - Test ct_notes table structure and constraints
    - Test ct_scheduled_activities table structure and constraints
    - Test tenant_id foreign key relationships for both tables
    - Test index existence on key fields
  - [x] 1.2 Add `ct_notes` table to schema
    - File: `src/lib/db/schema.ts`
    - Fields: id (uuid), tenant_id (FK to tenants), contact_id (varchar), note_date (timestamp), author (varchar), content (text), raw_json (jsonb), created_at (timestamp)
    - Add index on tenant_id and note_date
    - Follow existing `hotListItems` table pattern for raw_json storage
  - [x] 1.3 Add `ct_scheduled_activities` table to schema
    - File: `src/lib/db/schema.ts`
    - Fields: id (uuid), tenant_id (FK to tenants), activity_type (varchar), scheduled_at (timestamp), contact_name (varchar), description (text), status (varchar), raw_json (jsonb), created_at (timestamp)
    - Add index on tenant_id and scheduled_at
  - [x] 1.4 Generate and apply database migration
    - Run `npm run db:generate` to create migration file
    - Migration should create both tables with indexes
    - Verify migration in `drizzle/` directory
  - [x] 1.5 Ensure database schema tests pass
    - Run only the 4 tests written in 1.1
    - Verify migrations apply successfully
    - Do NOT run entire test suite

**Acceptance Criteria:**
- ct_notes table exists with correct columns and indexes
- ct_scheduled_activities table exists with correct columns and indexes
- Foreign key relationships to tenants table are properly configured
- Migration runs successfully without errors

**Reference Files:**
- `src/lib/db/schema.ts` - existing schema patterns (syncRuns, ctRawSnapshots, hotListItems)
- `drizzle/` - existing migrations

---

### API Client Layer

#### Task Group 2: ClientTether API Client Enhancement
**Dependencies:** None (can run in parallel with Task Group 1)

- [x] 2.0 Complete ClientTether API client enhancements
  - [x] 2.1 Write 4 focused tests for new API client methods
    - Test getNotes method returns expected shape
    - Test getScheduledActivities method returns expected shape
    - Test error handling for failed API calls
    - Test webKey header is correctly included in requests
  - [x] 2.2 Define TypeScript interfaces for API response shapes
    - File: `src/lib/clienttether/client.ts`
    - Add `CTNoteResponse` interface with fields: id, contact_id, date, author, content
    - Add `CTActivityResponse` interface with fields: id, type, scheduled_at, contact_name, description, status
    - Add `CTLeadResponse` interface to replace `unknown[]`
    - Add `CTOpportunityResponse` interface to replace `unknown[]`
  - [x] 2.3 Implement `getNotes` method
    - File: `src/lib/clienttether/client.ts`
    - Accept optional `params: { contactId?: string; since?: string }`
    - Return `ApiResponse<CTNoteResponse[]>`
    - Use existing `request<T>` method pattern
  - [x] 2.4 Implement `getScheduledActivities` method
    - File: `src/lib/clienttether/client.ts`
    - Accept optional `params: { startDate?: string; endDate?: string }`
    - Return `ApiResponse<CTActivityResponse[]>`
    - Use existing `request<T>` method pattern
  - [x] 2.5 Ensure API client tests pass
    - Run only the 4 tests written in 2.1
    - Verify methods use correct endpoint paths
    - Do NOT run entire test suite

**Acceptance Criteria:**
- All API response types are properly defined
- getNotes and getScheduledActivities methods work correctly
- Error handling follows existing ApiResponse pattern
- webKey is included in request headers when provided

**Reference Files:**
- `src/lib/clienttether/client.ts` - existing client implementation with getLeads, getOpportunities, getEvents methods

---

### Sync Worker Layer

#### Task Group 3: Sync Worker Implementation
**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Complete sync worker implementation
  - [x] 3.1 Write 5 focused tests for sync worker functionality
    - Test sync creates sync_run record at start
    - Test sync updates sync_run status on completion
    - Test raw snapshots are stored before normalization
    - Test exponential backoff retry logic (1s, 2s, 4s delays)
    - Test sync processes only tenants with clienttetherWebKey
  - [x] 3.2 Create TypeScript sync worker entry point
    - File: `worker/sync.ts`
    - Set up node-cron for hourly execution (`0 * * * *`)
    - Import database connection and schema
    - Import ClientTether client factory
  - [x] 3.3 Implement tenant iteration logic
    - Query active tenants from database where clienttetherWebKey is not null
    - Process each tenant sequentially
    - Log progress to console
  - [x] 3.4 Implement sync run tracking
    - Create sync_run record at start with status='running'
    - Update status to 'success' or 'failed' on completion
    - Record finishedAt timestamp
    - Track recordsUpdated count
    - Store errorMessage on failure
  - [x] 3.5 Implement data fetching with retry logic
    - Fetch leads, opportunities, notes, activities from ClientTether
    - Implement exponential backoff: 3 attempts with 1s, 2s, 4s delays
    - Store raw responses in ct_raw_snapshots table
  - [x] 3.6 Implement data normalization
    - Parse raw responses and insert/update normalized tables
    - Update lead_metrics from leads data
    - Update pipeline_stage_counts from opportunities data
    - Update hot_list_items from opportunities data
    - Insert new ct_notes records
    - Insert new ct_scheduled_activities records
  - [x] 3.7 Update package.json sync script
    - Update script to use TypeScript: `tsx worker/sync.ts`
    - Ensure dotenv is loaded for environment variables
  - [x] 3.8 Ensure sync worker tests pass
    - Run only the 5 tests written in 3.1
    - Verify sync flow completes without errors
    - Do NOT run entire test suite

**Acceptance Criteria:**
- Worker runs on hourly schedule using node-cron
- Each sync creates and updates sync_run records
- Raw API responses stored in ct_raw_snapshots
- Normalized data populated in respective tables
- Retry logic handles transient failures gracefully
- Only tenants with clienttetherWebKey are processed

**Reference Files:**
- `worker/sync.js` - placeholder to replace
- `src/lib/db/schema.ts` - syncRuns, ctRawSnapshots tables
- `src/lib/clienttether/client.ts` - API client

---

### API Layer

#### Task Group 4: Sync Status and Dashboard Data APIs
**Dependencies:** Task Group 3

- [x] 4.0 Complete API endpoints for sync status and dashboard data
  - [x] 4.1 Write 6 focused tests for API endpoints
    - Test GET /api/sync/status returns lastSyncAt and status
    - Test GET /api/sync/status requires authentication
    - Test GET /api/dashboard/notes returns paginated notes
    - Test GET /api/dashboard/schedule returns upcoming activities
    - Test tenant isolation is enforced on all endpoints
    - Test freshness calculation (warning if older than 2 hours)
  - [x] 4.2 Create sync status API endpoint
    - File: `src/pages/api/sync/status.ts`
    - GET endpoint returning { lastSyncAt, status, isStale }
    - Query latest sync_run for current tenant
    - Calculate isStale flag (true if > 2 hours old)
    - Follow pattern from `src/pages/api/reports/index.ts`
  - [x] 4.3 Create notes API endpoint
    - File: `src/pages/api/dashboard/notes.ts`
    - GET endpoint returning paginated notes
    - Support query params: limit (default 50), offset, search
    - Filter by current tenant context
    - Order by note_date descending
  - [x] 4.4 Create schedule API endpoint
    - File: `src/pages/api/dashboard/schedule.ts`
    - GET endpoint returning upcoming activities
    - Filter: scheduled_at > now()
    - Order by scheduled_at ascending
    - Limit to reasonable number (e.g., 100)
  - [x] 4.5 Add leads summary API endpoint (optional enhancement)
    - File: `src/pages/api/dashboard/leads.ts`
    - Return aggregated lead metrics for current tenant
    - Include totals by dimension (source, status)
  - [x] 4.6 Ensure API tests pass
    - Run only the 6 tests written in 4.1
    - Verify authentication and authorization
    - Do NOT run entire test suite

**Acceptance Criteria:**
- Sync status endpoint returns accurate data
- Notes endpoint supports pagination and search
- Schedule endpoint returns only future activities
- All endpoints enforce tenant isolation
- Consistent error handling and response format

**Reference Files:**
- `src/pages/api/reports/index.ts` - API pattern with auth and tenant checks
- `src/lib/auth/index.ts` - validateSession, getUserMemberships, cookie names

---

### Frontend Layer

#### Task Group 5: Dashboard Pages and Components
**Dependencies:** Task Groups 1, 3, and 4

- [x] 5.0 Complete dashboard pages and components
  - [x] 5.1 Write 6 focused tests for dashboard components
    - Test SyncStatusBanner renders correct freshness state
    - Test SyncStatusBanner shows warning for stale data
    - Test KPICard renders value and label correctly
    - Test LeadsChart renders with data
    - Test DataTable renders rows with proper formatting
    - Test navigation highlights active page
  - [x] 5.2 Create reusable SyncStatusBanner component
    - File: `src/components/dashboard/SyncStatusBanner.tsx`
    - Fetch sync status from API
    - Display last sync time
    - Show yellow/amber warning banner if data is stale (> 2 hours)
    - Format time difference: "Data is X hours old - sync may be delayed"
  - [x] 5.3 Create reusable KPICard component
    - File: `src/components/dashboard/KPICard.tsx`
    - Props: label, value, subtitle
    - Follow existing dashboard.astro card styling
    - Support loading state
  - [x] 5.4 Create Leads Dashboard page
    - File: `src/pages/leads.astro`
    - Use DashboardLayout
    - Display KPI cards: Total Leads, Qualified Leads, Lead Sources count
    - Add ECharts bar chart showing leads by source
    - Add ECharts pie chart showing leads by status
    - Query lead_metrics table filtered by tenant
    - Include SyncStatusBanner
  - [x] 5.5 Create Pipeline Dashboard page
    - File: `src/pages/pipeline.astro`
    - Use DashboardLayout
    - Display KPI cards: Total Pipeline Value, Stage Count, Average Deal Size
    - Add ECharts horizontal bar chart for stage breakdown
    - Query pipeline_stage_counts table filtered by tenant
    - Include SyncStatusBanner
  - [x] 5.6 Create Hot List Dashboard page
    - File: `src/pages/hot-list.astro`
    - Use DashboardLayout
    - Display table: Candidate Name, Market, Units, Weighted IFF, Stage, Likely %
    - Add status indicator badges for stage values
    - Query hot_list_items table ordered by weighted_iff DESC
    - Include SyncStatusBanner
  - [x] 5.7 Create Notes Dashboard page
    - File: `src/pages/notes.astro`
    - Use DashboardLayout
    - Display list: date, author, content preview (truncated)
    - Add text search filter for content/author
    - Query ct_notes ordered by note_date DESC
    - Limit to 50 with "Load More" pattern
    - Include SyncStatusBanner
  - [x] 5.8 Create Schedule Dashboard page
    - File: `src/pages/schedule.astro`
    - Use DashboardLayout
    - Display list: scheduled date/time, activity type, contact name, description
    - Filter to future activities only
    - Query ct_scheduled_activities where scheduled_at > now()
    - Order by scheduled_at ASC
    - Include SyncStatusBanner
  - [x] 5.9 Ensure UI component tests pass
    - Run only the 6 tests written in 5.1
    - Verify components render correctly
    - Do NOT run entire test suite

**Acceptance Criteria:**
- All 5 dashboard pages render correctly
- ECharts visualizations display data
- SyncStatusBanner shows accurate freshness
- Table/list views have proper formatting
- Pages work with tenant context from middleware

**Reference Files:**
- `src/layouts/DashboardLayout.astro` - layout with nav, auth context
- `src/pages/dashboard.astro` - existing dashboard structure
- `package.json` - echarts, echarts-for-react already installed

---

### Navigation & Integration Layer

#### Task Group 6: Navigation Updates and Integration Testing
**Dependencies:** Task Group 5

- [x] 6.0 Complete navigation and integration
  - [x] 6.1 Write 5 focused integration tests
    - Test navigation between dashboard pages works
    - Test tenant context is preserved across pages
    - Test dashboard pages redirect without tenant context
    - Test sync status updates after sync runs
    - Test data displays correctly on all dashboard pages
  - [x] 6.2 Update middleware TENANT_REQUIRED_ROUTES
    - File: `src/middleware/index.ts`
    - Add `/leads`, `/pipeline`, `/hot-list`, `/notes`, `/schedule` to array
    - Verify routes redirect to workspace selection without tenant context
  - [x] 6.3 Add Notes and Schedule links to navigation
    - File: `src/layouts/DashboardLayout.astro`
    - Add `/notes` link to desktop nav (line ~142)
    - Add `/schedule` link to desktop nav
    - Add links to mobile nav (line ~285)
  - [x] 6.4 Add active state highlighting to nav links
    - Use Astro.url.pathname to determine active page
    - Apply accent color styling to active link
    - Follow existing nav link patterns
  - [x] 6.5 Ensure integration tests pass
    - Run only the 5 tests written in 6.1
    - Verify full user flow works end-to-end
    - Do NOT run entire test suite
  - [x] 6.6 Run full feature test suite
    - Run all tests from groups 1-6 (approximately 30 tests)
    - Verify no regressions
    - Document any test failures for investigation

**Acceptance Criteria:**
- All dashboard routes protected by tenant context
- Navigation includes all 7 dashboard links (Dashboard, Reports, Leads, Pipeline, Hot List, Notes, Schedule)
- Active page is visually indicated in navigation
- User flow from login to dashboard pages works seamlessly

**Reference Files:**
- `src/middleware/index.ts` - TENANT_REQUIRED_ROUTES array
- `src/layouts/DashboardLayout.astro` - navigation links

---

## Execution Order

Recommended implementation sequence:

```
Phase 1 (Parallel):
  - Task Group 1: Database Schema (ct_notes, ct_scheduled_activities)
  - Task Group 2: ClientTether API Client (getNotes, getScheduledActivities)

Phase 2 (Sequential):
  - Task Group 3: Sync Worker Implementation (depends on 1 & 2)

Phase 3 (Sequential):
  - Task Group 4: Dashboard Data APIs (depends on 3)

Phase 4 (Sequential):
  - Task Group 5: Dashboard Pages & Components (depends on 1, 3, 4)

Phase 5 (Sequential):
  - Task Group 6: Navigation & Integration (depends on 5)
```

## Estimated Test Count Summary

| Task Group | Tests Written | Focus Area |
|------------|---------------|------------|
| 1. Database Schema | 4 | Table structure, indexes, foreign keys |
| 2. API Client | 4 | Method responses, error handling, headers |
| 3. Sync Worker | 5 | Sync flow, retry logic, data storage |
| 4. Dashboard APIs | 6 | Auth, pagination, tenant isolation |
| 5. Dashboard UI | 6 | Component rendering, state display |
| 6. Integration | 5 | Navigation, user flow, data display |
| **Total** | **30** | |

## Key Files to Create

**Database:**
- Migration for ct_notes and ct_scheduled_activities tables

**Worker:**
- `worker/sync.ts` - TypeScript sync worker with node-cron

**API Routes:**
- `src/pages/api/sync/status.ts`
- `src/pages/api/dashboard/notes.ts`
- `src/pages/api/dashboard/schedule.ts`
- `src/pages/api/dashboard/leads.ts` (optional)

**Components:**
- `src/components/dashboard/SyncStatusBanner.tsx`
- `src/components/dashboard/KPICard.tsx`

**Pages:**
- `src/pages/leads.astro`
- `src/pages/pipeline.astro`
- `src/pages/hot-list.astro`
- `src/pages/notes.astro`
- `src/pages/schedule.astro`

## Key Files to Modify

- `src/lib/db/schema.ts` - Add ct_notes and ct_scheduled_activities tables
- `src/lib/clienttether/client.ts` - Add getNotes, getScheduledActivities methods
- `src/middleware/index.ts` - Add routes to TENANT_REQUIRED_ROUTES
- `src/layouts/DashboardLayout.astro` - Add Notes and Schedule nav links
- `package.json` - Update sync script to use TypeScript
