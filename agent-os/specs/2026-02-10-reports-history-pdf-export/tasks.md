# Task Breakdown: Reports History & PDF Export

## Overview
Total Tasks: 6 Task Groups, 39 sub-tasks

This feature enhances the existing `/reports` page with paginated history browsing, year/month filtering, an extensible feature flag system, and on-demand PDF export of published reports with tenant co-branding and local caching.

## Task List

### Database & Schema Layer

#### Task Group 1: Feature Flags Table and Report Exports Index
**Dependencies:** None

- [x] 1.0 Complete database schema additions
  - [x] 1.1 Write 4 focused tests for the feature flags and report exports schema
    - Test `featureFlags` table insert with valid data and unique constraint on `(tenantId, featureKey)`
    - Test `featureFlags` duplicate `(tenantId, featureKey)` insert is rejected
    - Test `reportExports` unique index on `(tenantId, reportWeekId)` prevents duplicate cached PDFs
    - Test cascade delete: deleting a tenant removes associated feature flags
  - [x] 1.2 Add `featureFlags` table to the Drizzle schema
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`
    - Fields: `id` (uuid PK, defaultRandom), `tenantId` (uuid FK to `tenants.id`, cascade delete), `featureKey` (varchar 100, not null), `enabled` (boolean, default false), `createdAt` (timestamp, defaultNow), `updatedAt` (timestamp, defaultNow)
    - Add `uniqueIndex` on `(tenantId, featureKey)`
    - Add `index` on `tenantId` for lookup performance
    - Follow existing table patterns in schema.ts (e.g., `reportExports`, `tenantBranding`)
  - [x] 1.3 Add indexes to the existing `reportExports` table
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`
    - Add `uniqueIndex` on `(tenantId, reportWeekId)` for cache lookup uniqueness
    - Add `index` on `(tenantId, reportWeekId)` for fast cache lookups
  - [x] 1.4 Create Drizzle migration file for both changes
    - File: `/Users/dustin/dev/github/mellon-portal/drizzle/0005_add-feature-flags-and-report-exports-indexes.sql`
    - Follow naming convention from existing migrations (e.g., `0004_add-dollar-value-access-token-and-indexes.sql`)
    - Single migration covering: CREATE TABLE `feature_flags`, ADD indexes on `report_exports`
    - Run `npm run db:generate` or manually write the SQL migration
  - [x] 1.5 Export the new `featureFlags` table from the DB module
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts` -- ensure export is available
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/db/index.ts` -- already re-exports all from schema via `export * from './schema'`
  - [x] 1.6 Ensure database schema tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify migration runs successfully with `npm run db:migrate`

**Acceptance Criteria:**
- The 4 tests from 1.1 pass
- `featureFlags` table is created with correct columns, types, and constraints
- `reportExports` table has new unique index on `(tenantId, reportWeekId)`
- Migration file follows existing naming convention and runs cleanly
- Both tables are properly exported from the DB module

---

### Query Layer

#### Task Group 2: Feature Flags Queries and Dashboard Data Extraction
**Dependencies:** Task Group 1

- [x] 2.0 Complete query layer for feature flags and shared dashboard data
  - [x] 2.1 Write 6 focused tests for query functions
    - Test `isFeatureEnabled()` returns true for an enabled flag
    - Test `isFeatureEnabled()` returns false for a disabled or non-existent flag
    - Test `setFeatureFlag()` creates a new flag and updates an existing one (upsert)
    - Test `getFeatureFlagsForTenant()` returns all flags for a tenant
    - Test `getKPIDataForReportWeek()` returns correct KPI shape for a given report week
    - Test `getPipelineDataForReportWeek()` returns pipeline-by-stage and lead trends data
  - [x] 2.2 Create the feature flags query module
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/feature-flags/queries.ts`
    - Function: `isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean>` -- query `featureFlags` table, return `enabled` value or `false` if row missing
    - Function: `getFeatureFlagsForTenant(tenantId: string): Promise<Array<{ featureKey: string; enabled: boolean }>>` -- return all flags for tenant
    - Function: `setFeatureFlag(tenantId: string, featureKey: string, enabled: boolean): Promise<void>` -- upsert using Drizzle's `onConflictDoUpdate` on the `(tenantId, featureKey)` unique index
    - Follow JSDoc comment style and Drizzle ORM patterns from `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts`
  - [x] 2.3 Create the feature flags module index
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/feature-flags/index.ts`
    - Export all functions from `./queries`
    - Define and export the `PDF_EXPORT` feature key constant: `export const FEATURE_PDF_EXPORT = 'pdf_export';`
  - [x] 2.4 Extract shared dashboard data query functions
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/dashboard/queries.ts`
    - Extract KPI calculation logic from `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/kpi.ts` into: `getKPIData(tenantId: string, reportWeekId?: string): Promise<KPIData>` -- when `reportWeekId` is provided, query snapshot data linked to that report week; when omitted, query live data (reportWeekId IS NULL)
    - Extract pipeline-by-stage logic from `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/pipeline.ts` into: `getPipelineByStage(tenantId: string, reportWeekId?: string): Promise<PipelineByStagePoint[]>`
    - Extract lead-trends logic into: `getLeadTrends(tenantId: string, weeks?: number): Promise<LeadTrendPoint[]>`
    - Move the `PRIORITY_STAGES` and `FULL_PIPELINE_STAGES` constants into this module
    - Export TypeScript interfaces: `KPIData`, `PipelineByStagePoint`, `LeadTrendPoint`
  - [x] 2.5 Create dashboard queries module index
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/dashboard/index.ts`
    - Export all functions and types from `./queries`
  - [x] 2.6 Refactor existing dashboard API endpoints to use shared queries
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/kpi.ts` -- replace inline query logic with call to `getKPIData(tenantId)`
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/pipeline.ts` -- replace inline logic with calls to `getPipelineByStage(tenantId)` and `getLeadTrends(tenantId, weeks)`
    - Keep all auth validation in the API endpoints unchanged
    - Verify existing dashboard API behavior is not broken
  - [x] 2.7 Extend `getReportWeeksForTenant` with pagination support
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts`
    - Add `limit` and `offset` to the existing options parameter
    - Add a `totalCount` return alongside the results: return `{ data: [...], totalCount: number }`
    - When `limit`/`offset` are not provided, return all results (backward compatible)
    - Add a new function `getDistinctReportYears(tenantId: string): Promise<number[]>` to query distinct years from `reportWeeks.weekEndingDate` for the year filter dropdown
  - [x] 2.8 Ensure query layer tests pass
    - Run ONLY the 6 tests written in 2.1
    - Verify the refactored dashboard endpoints still work correctly

**Acceptance Criteria:**
- The 6 tests from 2.1 pass
- Feature flag queries support create, read, and upsert operations
- Dashboard data functions are reusable by both API endpoints and PDF generation
- Existing dashboard API endpoints work identically after refactoring
- `getReportWeeksForTenant` supports pagination with totalCount
- `getDistinctReportYears` returns an array of available years

---

### API Layer

#### Task Group 3: Paginated Reports API and PDF Download Endpoints
**Dependencies:** Task Group 2

- [x] 3.0 Complete API endpoints for paginated reports and PDF download
  - [x] 3.1 Write 6 focused tests for the API endpoints
    - Test `GET /api/reports` returns paginated results with `pagination` metadata when `page` and `limit` params are provided
    - Test `GET /api/reports` filters by `year` and `month` query parameters
    - Test `GET /api/reports/available-years` returns distinct years for the tenant
    - Test `POST /api/reports/[reportWeekId]/pdf` returns 403 when `pdf_export` feature flag is disabled
    - Test `POST /api/reports/[reportWeekId]/pdf` returns a download URL on success
    - Test `GET /api/reports/[reportWeekId]/pdf` returns 404 when no cached PDF exists
  - [x] 3.2 Update the `GET /api/reports` endpoint with pagination and filtering
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/index.ts`
    - Accept query parameters: `page` (default 1), `limit` (default 10), `year` (optional), `month` (optional)
    - Parse and validate integer parameters; clamp `limit` between 1 and 50
    - Call `getReportWeeksForTenant(tenantId, { status: 'published', year, month, limit, offset })` with computed offset `(page - 1) * limit`
    - Return response format: `{ success: true, data: [...], pagination: { page, limit, totalPages, totalCount } }`
    - Maintain existing auth pattern unchanged
  - [x] 3.3 Create `GET /api/reports/available-years` endpoint
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/available-years.ts`
    - Follow auth pattern from `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/index.ts`
    - Call `getDistinctReportYears(tenantId)` from the report-weeks query module
    - Return `{ success: true, data: { years: [2025, 2026] } }`
  - [x] 3.4 Create `POST /api/reports/[reportWeekId]/pdf` endpoint
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/[reportWeekId]/pdf.ts`
    - Validate session, tenant access, and report ownership following existing auth pattern from `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/kpi.ts`
    - Check `pdf_export` feature flag via `isFeatureEnabled(tenantId, FEATURE_PDF_EXPORT)`; return 403 with `{ success: false, error: 'PDF export is not enabled', code: 'FORBIDDEN' }` if disabled
    - Verify report exists and belongs to tenant, and has status `published`
    - Call the PDF generation service (Task Group 4) to generate or return cached PDF
    - Return `{ success: true, data: { downloadUrl: '/api/reports/{reportWeekId}/pdf' } }`
  - [x] 3.5 Create `GET /api/reports/[reportWeekId]/pdf` endpoint in same file
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/[reportWeekId]/pdf.ts` (export both `GET` and `POST`)
    - Validate session, tenant access, feature flag (same as POST)
    - Look up cached PDF in `reportExports` table by `(tenantId, reportWeekId)`
    - Read the PDF file from the local filesystem path stored in `pdfUrl`
    - Stream file bytes with headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="report-{weekEndingDate}.pdf"`
    - Return 404 if no cached PDF exists or file is missing from disk
  - [x] 3.6 Ensure API layer tests pass
    - Run ONLY the 6 tests written in 3.1
    - Verify pagination, filtering, and PDF endpoints return correct response shapes

**Acceptance Criteria:**
- The 6 tests from 3.1 pass
- `GET /api/reports` returns paginated results with metadata
- Year/month filtering works correctly and resets to page 1
- PDF endpoints enforce feature flag gating and return 403 when disabled
- PDF download streams the file with correct content headers
- All endpoints follow the established `{ success: true/false }` response pattern

---

### PDF Generation Service

#### Task Group 4: PDF Template and Playwright Generation
**Dependencies:** Task Groups 2

- [x] 4.0 Complete PDF template and generation service
  - [x] 4.1 Write 4 focused tests for PDF generation
    - Test the HTML template function returns a complete HTML document string containing the report title, tenant name, and section headings
    - Test the HTML template includes tenant logo URL and accent color in inline styles when branding data is provided
    - Test the HTML template renders KPI data and pipeline-by-stage data as HTML tables (not chart libraries)
    - Test the `generatePDF` function checks `reportExports` for cached PDF and returns existing path without regeneration
  - [x] 4.2 Install Playwright as a production dependency
    - Run `npm install playwright` in `/Users/dustin/dev/github/mellon-portal/`
    - Playwright is used for headless Chromium PDF rendering
    - Install Chromium browser: `npx playwright install chromium`
  - [x] 4.3 Create the PDF HTML template module
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/template.ts`
    - Export function: `generateReportHTML(params: ReportPDFData): string`
    - Accept parameters: `{ reportWeek, manualContent, kpiData, pipelineData, leadTrends, branding, tenantName }`
    - Generate a complete, self-contained HTML document with all CSS inlined (no external stylesheets)
    - Header section: tenant logo (from `branding.tenantLogoUrl` as `<img>` tag), report title, week period, tenant name
    - Apply accent color from `branding.accentColorOverride` or fall back to theme defaults using `generateCSSVariables()` from `/Users/dustin/dev/github/mellon-portal/src/lib/themes/css-variables.ts`
    - Content sections: Narrative, Initiatives, Needs From Client, Discovery Days -- render rich HTML content with prose styling replicated from `/Users/dustin/dev/github/mellon-portal/src/pages/reports/[reportWeekId].astro` (lines 144-156, the `:global(.prose)` rules)
    - Dashboard section: KPI cards rendered as styled HTML divs (New Leads, Total Pipeline, Priority Candidates, Weighted Pipeline Value)
    - Pipeline-by-stage chart: render as an HTML table with horizontal bar representations using CSS widths (not ECharts)
    - Lead trends: render as a simple HTML table with week labels and lead counts
    - Footer: "Powered by Mellon Franchising" with copyright year, matching DashboardLayout footer style from `/Users/dustin/dev/github/mellon-portal/src/layouts/DashboardLayout.astro` (lines 357-370)
    - Use A4-friendly layout: max-width ~210mm, reasonable margins, print-friendly colors
  - [x] 4.4 Create the PDF generation service module
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/generate.ts`
    - Export function: `generateReportPDF(reportWeekId: string, tenantId: string): Promise<string>` -- returns the local file path to the PDF
    - Implement singleton browser pattern: lazily initialize a Playwright Chromium browser instance, reuse across requests
    - Export function: `closeBrowser(): Promise<void>` for graceful shutdown
    - Generation flow:
      1. Check `reportExports` table for cached PDF by `(tenantId, reportWeekId)` -- if found and file exists on disk, return `pdfUrl` immediately
      2. Gather data: call `getReportWeekById(reportWeekId, tenantId)`, `getReportWeekManualByReportWeekId(reportWeekId)`, `getKPIData(tenantId, reportWeekId)`, `getPipelineByStage(tenantId, reportWeekId)`, `getLeadTrends(tenantId)`, and fetch tenant branding/name from DB
      3. Generate HTML via `generateReportHTML(...)`
      4. Open Playwright page, set HTML content, call `page.pdf({ format: 'A4', printBackground: true })` to generate PDF buffer
      5. Write buffer to `./storage/pdfs/{tenantId}_{reportWeekId}.pdf`
      6. Insert record into `reportExports` table with the local file path
      7. Close the page, return the file path
    - Create storage directory if it does not exist: `./storage/pdfs/`
    - Handle errors gracefully: close page on failure, log errors, throw descriptive error
  - [x] 4.5 Create the PDF module index
    - File: `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/index.ts`
    - Export `generateReportPDF`, `closeBrowser` from `./generate`
    - Export `generateReportHTML` and `ReportPDFData` type from `./template`
  - [x] 4.6 Ensure PDF generation tests pass
    - Run ONLY the 4 tests written in 4.1
    - Template tests can run without Playwright (pure string generation)
    - Cache-check test can mock the database query

**Acceptance Criteria:**
- The 4 tests from 4.1 pass
- HTML template produces a complete, self-contained document with all sections
- Template includes tenant co-branding (logo, accent colors) and "Powered by Mellon Franchising" footer
- Dashboard data is rendered as HTML tables, not JavaScript chart libraries
- PDF generation uses singleton browser pattern and caches results in `reportExports`
- Generated PDFs are stored at `./storage/pdfs/{tenantId}_{reportWeekId}.pdf`

---

### Frontend Components

#### Task Group 5: Paginated Reports List, Filters, and PDF Download UI
**Dependencies:** Task Groups 3, 4

- [x] 5.0 Complete frontend UI changes for reports history and PDF download
  - [x] 5.1 Write 5 focused tests for the updated UI components
    - Test `ReportsList` renders year and month filter dropdowns with "All" as default option
    - Test `ReportsList` renders pagination controls (Previous/Next buttons) when multiple pages exist
    - Test `ReportsList` renders a PDF download button/icon on each report row when `pdfExportEnabled` prop is true
    - Test `ReportsList` does NOT render PDF download buttons when `pdfExportEnabled` prop is false
    - Test PDF download button shows a loading/spinner state during the POST request
  - [x] 5.2 Update the `ReportsList` component to fetch from API with pagination
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx`
    - Change from receiving all reports as a prop to client-side fetching from `GET /api/reports`
    - Add state: `page` (number), `reports` (array), `totalPages` (number), `loading` (boolean), `year` (number | null), `month` (number | null)
    - On mount and when page/year/month change, fetch from `/api/reports?page={page}&limit=10&year={year}&month={month}`
    - Keep "Latest Report" prominent card treatment at the top (first report from page 1 with no filters)
    - Show paginated list of older reports below
    - Add Previous/Next pagination buttons below the reports list, disabled at boundaries
    - Show current page info: "Page {page} of {totalPages}"
    - Update `ReportsListProps` interface: add `pdfExportEnabled: boolean`, remove the `reports` array prop (data now fetched client-side), add optional `initialReports` for SSR hydration if desired
  - [x] 5.3 Add year and month filter dropdowns
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx`
    - Add a filter bar above the reports list with two `<select>` dropdowns
    - Year dropdown: fetch available years from `GET /api/reports/available-years` on mount; include "All Years" option with value `""`
    - Month dropdown: statically populated with January (1) through December (12); include "All Months" option with value `""`
    - When a filter changes, reset `page` to 1 and re-fetch reports
    - Style dropdowns to match existing form input styling in the app (rounded borders, consistent padding, theme-aware colors)
  - [x] 5.4 Add PDF download button to each report row in the list
    - File: `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx`
    - Conditionally render a download button/icon next to the existing "View Report" link on each report row, only when `pdfExportEnabled` is true
    - Button click handler: POST to `/api/reports/{reportId}/pdf`, show loading spinner on the button, then trigger browser download from the returned `downloadUrl` using a hidden `<a>` tag or `window.open()`
    - Use an SVG download icon (consistent with existing SVG icon patterns in the component)
    - Also add download button on the "Latest Report" card
  - [x] 5.5 Add PDF download button to the report detail page
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/reports/[reportWeekId].astro`
    - In the header area (next to the "Back to Reports" link, around line 78-88), add a download button
    - The button should only render when the `pdf_export` feature flag is enabled for the tenant
    - Server-side: query `isFeatureEnabled(tenantId, FEATURE_PDF_EXPORT)` and pass the result to the page
    - The download button can be a small React island component or a simple `<button>` with inline script for the POST + download flow
    - Style to match the existing page header aesthetic: secondary button style (border, text color matching existing "Back to Reports" link area)
  - [x] 5.6 Update the reports index page to pass feature flag to component
    - File: `/Users/dustin/dev/github/mellon-portal/src/pages/reports/index.astro`
    - Server-side: query `isFeatureEnabled(tenantId, FEATURE_PDF_EXPORT)` using the feature flags module
    - Pass `pdfExportEnabled` boolean prop to the `<ReportsList>` component
    - Remove the server-side fetch of all reports (the component now handles its own data fetching)
    - Keep the DashboardLayout wrapper, page header, and auth checks unchanged
  - [x] 5.7 Ensure UI component tests pass
    - Run ONLY the 5 tests written in 5.1
    - Verify components render correctly in all states

**Acceptance Criteria:**
- The 5 tests from 5.1 pass
- ReportsList fetches data from the API with pagination controls
- Year and month filter dropdowns appear and reset pagination on change
- PDF download buttons appear on both the list and detail page when feature flag is enabled
- PDF download buttons are hidden when feature flag is disabled
- Download flow shows loading state and triggers browser file download
- Responsive layout is maintained for mobile/tablet/desktop

---

### Test Review & Integration

#### Task Group 6: Test Review and Critical Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review existing tests and fill critical gaps only
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review the 4 tests written by Task Group 1 (schema/database)
    - Review the 6 tests written by Task Group 2 (query layer)
    - Review the 6 tests written by Task Group 3 (API endpoints)
    - Review the 4 tests written by Task Group 4 (PDF generation)
    - Review the 5 tests written by Task Group 5 (UI components)
    - Total existing tests: 25 tests
  - [x] 6.2 Analyze test coverage gaps for this feature only
    - Identify critical end-to-end workflows that lack coverage
    - Focus on integration points: API -> query -> database flow
    - Check that the feature flag gating is tested at every layer (query, API, UI)
    - Verify PDF caching workflow is tested (generate, cache, serve cached)
    - Assess whether the refactored dashboard endpoints still pass their existing tests in `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/__tests__/`
  - [x] 6.3 Write up to 10 additional strategic tests to fill gaps
    - Test the full pagination flow: page 1 returns correct slice, page 2 returns next slice, out-of-range page returns empty data
    - Test year + month filter combination returns only matching reports
    - Test `POST /api/reports/[id]/pdf` for a non-existent report returns 404
    - Test `POST /api/reports/[id]/pdf` for a draft (unpublished) report returns appropriate error
    - Test `GET /api/reports/[id]/pdf` streams correct PDF bytes and headers for a cached report
    - Test `setFeatureFlag` upsert: set to true, then set to false, verify final state
    - Test `generateReportHTML` renders empty sections gracefully when manual content fields are null
    - Test `getDistinctReportYears` returns sorted unique years
    - Test refactored `GET /api/dashboard/kpi` still returns same response shape (regression)
    - Test refactored `GET /api/dashboard/pipeline` still returns same response shape (regression)
  - [x] 6.4 Run all feature-specific tests
    - Run all tests from Task Groups 1-5 plus the new tests from 6.3
    - Expected total: approximately 35 tests
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass
    - Confirm existing dashboard tests in `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/__tests__/` still pass after the refactor

**Acceptance Criteria:**
- All 35 feature-specific tests pass (25 from groups 1-5, up to 10 from gap analysis)
- Critical user workflows for this feature are covered: browsing, filtering, downloading PDFs
- Feature flag gating is verified at query, API, and UI layers
- PDF caching and generation workflow is tested end-to-end
- Dashboard API refactoring has not introduced regressions
- No more than 10 additional tests added in this group

---

## Execution Order

Recommended implementation sequence with rationale:

```
1. Task Group 1: Database Schema (featureFlags table, reportExports indexes)
   - Foundation layer; everything else depends on the schema being in place

2. Task Group 2: Query Layer (feature flags queries, dashboard extraction, pagination)
   - Builds on schema; provides reusable functions for API and PDF layers

3. Task Group 3: API Layer (paginated reports, PDF endpoints)
   - Depends on query functions from Group 2
   - PDF endpoints will initially return errors until Group 4 is complete
     (but the auth/validation/routing can be built and tested first)

4. Task Group 4: PDF Generation Service (template + Playwright)
   - Depends on query layer from Group 2 for data fetching
   - Can be developed in parallel with Group 3 after Group 2 is complete
   - Template development (4.3) is independent of API endpoints
   - Generation service (4.4) wires everything together

5. Task Group 5: Frontend Components (pagination UI, filters, download buttons)
   - Depends on API endpoints from Group 3 being functional
   - Depends on PDF generation from Group 4 for download to actually work

6. Task Group 6: Test Review & Integration
   - Final step after all implementation groups are complete
   - Verifies integration across all layers
```

## Key Files Reference

| Purpose | File Path |
|---|---|
| Database schema | `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts` |
| DB module exports | `/Users/dustin/dev/github/mellon-portal/src/lib/db/index.ts` |
| Drizzle migrations | `/Users/dustin/dev/github/mellon-portal/drizzle/` |
| Report weeks queries | `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts` |
| Report weeks index | `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/index.ts` |
| Feature flags queries (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/feature-flags/queries.ts` |
| Feature flags index (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/feature-flags/index.ts` |
| Dashboard queries (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/dashboard/queries.ts` |
| Dashboard queries index (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/dashboard/index.ts` |
| PDF template (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/template.ts` |
| PDF generation (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/generate.ts` |
| PDF module index (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/pdf/index.ts` |
| Reports API | `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/index.ts` |
| Available years API (NEW) | `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/available-years.ts` |
| PDF API (NEW) | `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/[reportWeekId]/pdf.ts` |
| Dashboard KPI API | `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/kpi.ts` |
| Dashboard pipeline API | `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/pipeline.ts` |
| ReportsList component | `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx` |
| PdfDownloadButton component (NEW) | `/Users/dustin/dev/github/mellon-portal/src/components/reports/PdfDownloadButton.tsx` |
| Reports list page | `/Users/dustin/dev/github/mellon-portal/src/pages/reports/index.astro` |
| Report detail page | `/Users/dustin/dev/github/mellon-portal/src/pages/reports/[reportWeekId].astro` |
| ReportSectionCard | `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportSectionCard.tsx` |
| Card UI components | `/Users/dustin/dev/github/mellon-portal/src/components/ui/Card.tsx` |
| DashboardLayout | `/Users/dustin/dev/github/mellon-portal/src/layouts/DashboardLayout.astro` |
| Theme config | `/Users/dustin/dev/github/mellon-portal/src/lib/themes/config.ts` |
| CSS variables generator | `/Users/dustin/dev/github/mellon-portal/src/lib/themes/css-variables.ts` |
| Theme index | `/Users/dustin/dev/github/mellon-portal/src/lib/themes/index.ts` |
| Auth module | `/Users/dustin/dev/github/mellon-portal/src/lib/auth/index.ts` |
| Existing dashboard tests | `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/__tests__/` |
| Gap analysis tests (NEW) | `/Users/dustin/dev/github/mellon-portal/src/lib/reports-history-pdf/__tests__/gap-analysis.test.ts` |
