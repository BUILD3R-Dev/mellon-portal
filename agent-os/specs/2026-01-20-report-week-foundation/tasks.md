# Task Breakdown: Report Week Foundation

## Overview
Total Tasks: 35 (across 4 task groups)

This spec builds the foundational Report Week data model and CRUD interface for agency admins to create, list, and manage report weeks per tenant. The `reportWeeks` table already exists in the database schema, so no schema migrations are needed.

## Task List

### Database Layer

#### Task Group 1: Database Indexes and Utility Functions
**Dependencies:** None

- [x] 1.0 Complete database layer enhancements
  - [x] 1.1 Write 2-4 focused tests for report week database operations
    - Test composite index query performance on `(tenant_id, week_ending_date)`
    - Test overlap detection query for same tenant
    - Test period date calculation from week ending date
  - [x] 1.2 Create database migration for additional indexes
    - Add composite index on `(tenant_id, week_ending_date)` for efficient queries
    - Add index on `status` field for filtering
    - Follow existing migration patterns in `/Users/dustin/dev/github/mellon-portal/drizzle/`
  - [x] 1.3 Create date utility functions for report week calculations
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/date-utils.ts`
    - `calculatePeriodStart(weekEndingDate: Date, timezone: string): Date` - returns Monday 00:00:00 in tenant timezone
    - `calculatePeriodEnd(weekEndingDate: Date, timezone: string): Date` - returns Friday 23:59:59 in tenant timezone
    - `isFriday(date: Date): boolean` - validates date is a Friday
    - `formatWeekPeriod(startDate: Date, endDate: Date): string` - returns "Jan 13 - Jan 17, 2025" format
  - [x] 1.4 Create overlap detection query helper
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts`
    - `checkOverlappingWeeks(tenantId: string, periodStart: Date, periodEnd: Date, excludeId?: string): Promise<boolean>`
    - Query should check if any existing report week's period overlaps with given dates
    - Must exclude current report week when editing (excludeId parameter)
  - [x] 1.5 Ensure database layer tests pass
    - Run only the 2-4 tests written in 1.1
    - Verify migration runs successfully
    - Verify utility functions work correctly

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- Composite index on `(tenant_id, week_ending_date)` exists
- Index on `status` field exists
- Date utility functions correctly calculate Monday start and Friday end timestamps
- Overlap detection query correctly identifies overlapping date ranges
- All date operations respect tenant timezone

---

### API Layer

#### Task Group 2: Report Week API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer
  - [x] 2.1 Write 4-6 focused tests for API endpoints
    - Test `GET /api/tenants/[id]/report-weeks` returns list with filters
    - Test `POST /api/tenants/[id]/report-weeks` creates draft report week
    - Test `PATCH /api/tenants/[id]/report-weeks/[reportWeekId]` updates and publishes
    - Test `DELETE /api/tenants/[id]/report-weeks/[reportWeekId]` only deletes draft
    - Test overlap validation returns proper error
    - Test Friday-only validation for week ending date
  - [x] 2.2 Create report weeks list endpoint
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/[id]/report-weeks/index.ts`
    - `GET` - List report weeks for tenant with filters (status, year, month)
    - `POST` - Create new report week (draft status)
    - Follow `validateAgencyAdmin` pattern from `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/index.ts`
    - Response format: `{ success: true, data: [...] }` or `{ success: false, error: ..., code: ... }`
    - Include sorting by `week_ending_date` descending (newest first)
  - [x] 2.3 Create single report week endpoint
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/[id]/report-weeks/[reportWeekId]/index.ts`
    - `GET` - Get single report week details
    - `PATCH` - Update report week (date changes for draft only, status changes for publish/unpublish)
    - `DELETE` - Delete draft report week only
    - Return 404 if report week not found or doesn't belong to tenant
  - [x] 2.4 Implement server-side validations
    - Validate week ending date is a Friday
    - Validate no overlapping weeks exist for same tenant
    - Validate only draft report weeks can have date changes
    - Validate only draft report weeks can be deleted
    - Track `published_at` and `published_by` on publish action
    - Clear `published_at` and `published_by` on unpublish action
  - [x] 2.5 Add proper error responses
    - "Selected date must be a Friday" for non-Friday dates
    - "A report week already exists that overlaps with this date range" for overlaps
    - "Only draft report weeks can be edited" for editing published weeks
    - "Only draft report weeks can be deleted" for deleting published weeks
    - Follow existing error code conventions: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`
  - [x] 2.6 Ensure API layer tests pass
    - Run only the 4-6 tests written in 2.1
    - Verify all CRUD operations work correctly
    - Verify proper authorization is enforced

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- All endpoints require Agency Admin authorization
- List endpoint supports status, year, and month filters
- Create endpoint validates Friday dates and prevents overlaps
- Publish/unpublish correctly manages `published_at` and `published_by`
- Delete endpoint only allows draft report weeks
- Consistent response format matching existing patterns

---

### Frontend Components

#### Task Group 3: UI Components and Pages
**Dependencies:** Task Group 2

- [x] 3.0 Complete UI components
  - [x] 3.1 Write 4-6 focused tests for UI components
    - Test ReportWeekList renders table with correct columns
    - Test ReportWeekModal validates Friday-only dates
    - Test PublishConfirmDialog shows warning message
    - Test status filter changes list display
    - Test delete button disabled for published weeks
  - [x] 3.2 Create ReportWeekList component
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/admin/ReportWeekList.tsx`
    - Follow TenantManagement.tsx patterns for table, sorting, and filtering
    - Columns: Week Ending Date, Week Period (Mon-Fri), Status, Published Date, Actions
    - Default sort by week ending date descending
    - Status filter: All, Draft, Published
    - Year/Month filter dropdowns
    - "Create Report Week" button in header
    - Empty state with call-to-action when no report weeks exist
    - StatusBadge: draft (gray), published (green)
  - [x] 3.3 Create ReportWeekModal component
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/admin/ReportWeekModal.tsx`
    - Follow TenantModal.tsx patterns for modal structure
    - Single date picker for week ending date (Friday-only selection)
    - Auto-display calculated Monday start date (read-only)
    - Show full week period: "Jan 13 - Jan 17, 2025"
    - Client-side Friday validation before submit
    - Create/Edit mode support
    - Edit mode disabled for published report weeks
  - [x] 3.4 Create PublishConfirmDialog component
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/admin/PublishConfirmDialog.tsx`
    - Follow StatusChangeDialog.tsx patterns
    - Warning message: "This report will be visible to tenant users"
    - Confirm/Cancel buttons with loading states
  - [x] 3.5 Create UnpublishConfirmDialog component
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/admin/UnpublishConfirmDialog.tsx`
    - Follow StatusChangeDialog.tsx patterns
    - Warning message: "This report will no longer be visible to tenant users"
    - Confirm/Cancel buttons with loading states
  - [x] 3.6 Create DeleteConfirmDialog component
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/admin/DeleteReportWeekDialog.tsx`
    - Follow DeactivationConfirmModal.tsx patterns
    - Warning message for permanent deletion
    - Only shown for draft report weeks
  - [x] 3.7 Create Report Weeks Astro page
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/admin/tenants/[id]/report-weeks/index.astro`
    - Server-side tenant fetch and authorization check
    - Server-side report weeks list fetch
    - Pass data to ReportWeekList component
    - Include breadcrumb navigation back to tenant detail
  - [x] 3.8 Add Report Weeks link to TenantDetail settings section
    - Update `/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantDetail.tsx`
    - Add new settings card linking to `/admin/tenants/[id]/report-weeks`
    - Icon: calendar or document list
    - Label: "Report Weeks"
    - Description: "Manage weekly reporting periods"
  - [x] 3.9 Ensure UI component tests pass
    - Run only the 4-6 tests written in 3.1
    - Verify components render correctly
    - Verify form validations work

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- Report week list displays with sortable, filterable table
- Date picker restricts to Fridays only
- Week period auto-calculates and displays correctly
- Publish/unpublish dialogs show appropriate warnings
- Delete button hidden/disabled for published weeks
- Navigation from TenantDetail to Report Weeks works
- Empty state displays when no report weeks exist

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review tests from Task Groups 1-3
    - Review the 2-4 database layer tests (Task 1.1)
    - Review the 4-6 API endpoint tests (Task 2.1)
    - Review the 4-6 UI component tests (Task 3.1)
    - Total existing tests: approximately 10-16 tests
  - [x] 4.2 Analyze test coverage gaps for report week feature only
    - Identify critical user workflows that lack test coverage
    - Focus only on gaps related to this spec's feature requirements
    - Prioritize end-to-end workflows over unit test gaps
    - Key workflows to verify:
      - Create report week with valid Friday date
      - Attempt create with overlapping dates (error case)
      - Publish report week (status transition)
      - Unpublish report week (status transition)
      - Delete draft report week
      - List with filters (status, year, month)
  - [x] 4.3 Write up to 8 additional strategic tests if needed
    - Focus on integration points between API and database
    - Test timezone handling for date calculations
    - Test edge cases for overlap detection (adjacent weeks OK, overlapping not)
    - Do not write tests for every possible scenario
  - [x] 4.4 Run feature-specific tests only
    - Run only tests related to report week feature
    - Expected total: approximately 18-24 tests maximum
    - Verify critical workflows pass
    - Do not run entire application test suite

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 18-24 tests total)
- Critical user workflows for report weeks are covered
- No more than 8 additional tests added when filling gaps
- Testing focused exclusively on report week feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Database Layer (Task Group 1)** - 1-2 hours
   - Create migration for indexes
   - Build date utility functions
   - Build overlap detection query

2. **API Layer (Task Group 2)** - 2-3 hours
   - Create CRUD endpoints following existing patterns
   - Implement validations (Friday-only, overlap)
   - Add publish/unpublish logic

3. **Frontend Components (Task Group 3)** - 3-4 hours
   - Build ReportWeekList with sorting/filtering
   - Build ReportWeekModal with date picker
   - Build confirmation dialogs
   - Create Astro page and navigation

4. **Test Review (Task Group 4)** - 1 hour
   - Review existing tests
   - Fill critical gaps
   - Verify all tests pass

---

## Key Files Reference

**Existing files to follow patterns from:**
- `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts` - reportWeeks table already defined
- `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/index.ts` - API route patterns
- `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/[id]/index.ts` - PATCH/GET patterns
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantManagement.tsx` - Table/list patterns
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantModal.tsx` - Modal patterns
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/StatusChangeDialog.tsx` - Confirmation dialog patterns
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantDetail.tsx` - Settings section to update

**New files to create:**
- `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/date-utils.ts`
- `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts`
- `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/[id]/report-weeks/index.ts`
- `/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/[id]/report-weeks/[reportWeekId]/index.ts`
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/ReportWeekList.tsx`
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/ReportWeekModal.tsx`
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/PublishConfirmDialog.tsx`
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/UnpublishConfirmDialog.tsx`
- `/Users/dustin/dev/github/mellon-portal/src/components/admin/DeleteReportWeekDialog.tsx`
- `/Users/dustin/dev/github/mellon-portal/src/pages/admin/tenants/[id]/report-weeks/index.astro`

---

## Technical Notes

1. **Date/Timezone Handling:**
   - Store `week_ending_date` as PostgreSQL `date` type (no time component)
   - Store `period_start_at` and `period_end_at` as `timestamp with time zone`
   - Use tenant's configured timezone from `tenants.timezone` field
   - Calculate Monday 00:00:00 to Friday 23:59:59 in tenant timezone

2. **Overlap Validation:**
   - Two periods overlap if: `start1 < end2 AND start2 < end1`
   - Adjacent weeks (ending Friday, starting next Monday) should NOT be considered overlapping
   - Exclude current report week ID when validating edits

3. **Status Transitions:**
   - draft -> published: Set `published_at` to now, `published_by` to current user ID
   - published -> draft: Clear `published_at` and `published_by`
   - Only draft status allows date editing
   - Only draft status allows deletion

4. **Authorization:**
   - All endpoints require Agency Admin role
   - Use existing `validateAgencyAdmin` pattern
   - Report weeks are scoped to tenant via `tenant_id` foreign key
