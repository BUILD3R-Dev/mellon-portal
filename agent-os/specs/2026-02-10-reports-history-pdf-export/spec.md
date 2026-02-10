# Specification: Reports History & PDF Export

## Goal
Enhance the existing reports page with paginated history browsing and year/month filtering, implement an extensible per-tenant feature flag system, and build on-demand PDF export of published reports with tenant co-branding, local caching, and download buttons on both the history list and report detail page.

## User Stories
- As a tenant user, I want to browse and filter my historical published reports by year and month so that I can easily find past weekly reports.
- As a tenant user, I want to download a PDF of any published report that includes both the written content and dashboard data with my organization's branding so that I can share it offline or archive it.
- As an agency admin, I want to enable or disable PDF export per tenant using an extensible feature flag system so that I can control feature availability and easily add new flags in the future.

## Specific Requirements

**Paginated Reports History on Existing /reports Page**
- Enhance the existing `/reports` page (`/src/pages/reports/index.astro`) and `ReportsList` component (`/src/components/reports/ReportsList.tsx`) rather than creating new routes
- Add server-side offset/limit pagination to the `getReportWeeksForTenant()` query function in `/src/lib/report-weeks/queries.ts`; return a `totalCount` alongside the results
- Update the `GET /api/reports` endpoint to accept `page`, `limit`, `year`, and `month` query parameters and return paginated results with metadata (`page`, `totalPages`, `totalCount`)
- The ReportsList component should transition from receiving all reports as a prop to client-side fetching from the API with pagination controls (previous/next buttons)
- Keep the "Latest Report" prominent card treatment at the top; show paginated list of older reports below it
- Default page size of 10 reports per page
- Maintain the existing API response format (`{ success: true, data: [...], pagination: {...} }`)

**Year/Month Filter Controls**
- Add year and month dropdown selects above the reports list inside the ReportsList component
- Year dropdown populated from available report years for the tenant (query distinct years from `reportWeeks.weekEndingDate`)
- Month dropdown shows month names (January-December) and filters by month number
- The existing `getReportWeeksForTenant()` already accepts `year` and `month` options -- leverage these at the API layer
- Filters reset pagination to page 1 when changed
- Include an "All" option in both dropdowns to clear filters

**Extensible Feature Flags System**
- Create a new `featureFlags` database table rather than a JSONB column, for better queryability and auditing
- Schema: `id` (uuid PK), `tenantId` (uuid FK to tenants, cascade delete), `featureKey` (varchar, e.g. `'pdf_export'`), `enabled` (boolean, default false), `createdAt` (timestamp), `updatedAt` (timestamp)
- Add a unique index on `(tenantId, featureKey)` to enforce one flag per tenant per feature
- Create a new Drizzle migration file for this table (follow the `drizzle/` directory naming convention)
- Build a query helper module at `/src/lib/feature-flags/queries.ts` with functions: `isFeatureEnabled(tenantId, featureKey)`, `getFeatureFlagsForTenant(tenantId)`, `setFeatureFlag(tenantId, featureKey, enabled)`
- The first feature key is `'pdf_export'`; the system must support arbitrary future feature keys without schema changes

**PDF Template Design**
- Create a standalone HTML template module at `/src/lib/pdf/template.ts` that generates a complete self-contained HTML document string for Playwright to render
- The template must visually match the published report detail page layout: header with co-branding, then content sections (Narrative, Initiatives, Needs From Client, Discovery Days), then dashboard data (KPI cards, pipeline-by-stage chart, lead trends chart)
- Include tenant co-branding: tenant logo from `tenantBranding.tenantLogoUrl`, accent colors from `tenantBranding.accentColorOverride` (falling back to theme defaults via `generateCSSVariables()`)
- Include a "Powered by Mellon Franchising" footer matching the DashboardLayout footer
- Inline all CSS (no external stylesheets); replicate the prose styling from the report detail page and the Card component styling using the theme system's CSS variables inlined as actual values
- For dashboard charts (pipeline by stage, lead trends), render them as simple HTML/CSS tables or bar representations rather than ECharts -- Playwright PDF rendering should not depend on client-side JavaScript chart libraries
- The template function accepts: report week data, manual content, KPI data, pipeline data, lead trends data, tenant branding data, and tenant name

**PDF Generation Service**
- Create a PDF generation module at `/src/lib/pdf/generate.ts` using Playwright's headless Chromium browser
- Add `playwright` as a production dependency (it is not currently in `package.json`)
- The generation flow: receive a reportWeekId and tenantId, check `reportExports` table for a cached PDF, if cached return the file path immediately, otherwise gather all data (report week, manual content, KPI, pipeline, leads, branding), render the HTML template, use Playwright's `page.pdf()` to generate an A4-sized PDF, save to local filesystem, insert a record into `reportExports` with the local file path in `pdfUrl`, return the file path
- Store PDFs in a configurable local directory (e.g., `./storage/pdfs/`) with filenames like `{tenantId}_{reportWeekId}.pdf`
- Use a singleton browser instance pattern to avoid launching a new browser for each request; lazily initialize and reuse the browser across requests
- The data gathering step should query the database directly (not call API endpoints) for KPI, pipeline, and lead trend data -- extract reusable data-fetching functions from the existing dashboard API endpoint handlers into shared query modules

**PDF Download API Endpoint**
- Create `POST /api/reports/[reportWeekId]/pdf` endpoint that triggers PDF generation (or returns cached) and responds with a download URL
- Create `GET /api/reports/[reportWeekId]/pdf` endpoint that streams the actual PDF file bytes with `Content-Type: application/pdf` and `Content-Disposition: attachment` headers
- POST returns `{ success: true, data: { downloadUrl: '/api/reports/{id}/pdf' } }` on success
- Both endpoints must validate session, tenant access, report ownership, and the `pdf_export` feature flag; return 403 if the feature flag is disabled for the tenant
- Follow the existing API auth pattern from `/src/pages/api/dashboard/kpi.ts` and `/src/pages/api/reports/index.ts`
- Return appropriate error responses matching the established `{ success: false, error: '...', code: '...' }` pattern

**PDF Download UI**
- Add a download button on the report detail page (`/src/pages/reports/[reportWeekId].astro`) in the header area next to the "Back to Reports" link
- Add a download button/icon on each report row in the ReportsList component, next to the existing "View Report" link
- Both buttons are only visible when the tenant's `pdf_export` feature flag is enabled; the flag state must be passed as a prop from the server-rendered page
- Button click triggers a POST to `/api/reports/{id}/pdf`, shows a loading/spinner state, then initiates a browser download from the returned URL
- All user roles (agency_admin, tenant_admin, tenant_viewer) have access when the feature flag is enabled -- no additional role-based gating

**Existing reportExports Schema Update**
- The existing `reportExports` table in the schema already has `id`, `tenantId`, `reportWeekId`, `pdfUrl`, and `createdAt` -- this is sufficient for caching
- Add an index on `(tenantId, reportWeekId)` for fast cache lookups
- The `pdfUrl` column stores the local filesystem path to the generated PDF file
- Add a `uniqueIndex` on `(tenantId, reportWeekId)` to ensure only one cached PDF per report per tenant

## Visual Design
No visual assets were provided. The PDF template and UI changes should match the existing published report detail page styling at `/src/pages/reports/[reportWeekId].astro` and the `DashboardLayout.astro` co-branding patterns.

## Existing Code to Leverage

**Report Weeks Query Module (`/src/lib/report-weeks/queries.ts`)**
- `getReportWeeksForTenant()` already supports `status`, `year`, and `month` filters -- extend it with `limit`, `offset`, and a `totalCount` return
- `getReportWeekById()` and `getReportWeekManualByReportWeekId()` provide the data needed for PDF content
- Follow the same query function patterns (JSDoc comments, Drizzle ORM, typed return values)

**ReportsList Component (`/src/components/reports/ReportsList.tsx`)**
- Currently receives all reports as a prop and renders a "Latest Report" card and "Previous Reports" list
- Extend this component to handle client-side API fetching, pagination controls, year/month filter dropdowns, and conditionally rendered PDF download buttons
- Reuse the existing `Card`, `CardHeader`, `CardTitle`, `CardContent` UI components and the `cn()` utility

**Published Report Detail Page (`/src/pages/reports/[reportWeekId].astro`)**
- The page layout, prose styling (`:global(.prose)` rules), and `ReportSectionCard` usage define the visual target for the PDF template
- The server-side auth and tenant validation pattern should be replicated in new API endpoints
- The page header area is where the PDF download button should be added

**Dashboard API Endpoints (`/src/pages/api/dashboard/kpi.ts`, `pipeline.ts`)**
- These contain the KPI calculation logic (new leads, total pipeline, priority candidates, weighted pipeline value) and pipeline-by-stage/lead-trends queries
- Extract the core data-fetching logic into shared query functions (e.g., `/src/lib/dashboard/queries.ts`) so both the API endpoints and the PDF generation service can call them without duplicating code
- Follow the same auth validation pattern for new endpoints

**Theme System (`/src/lib/themes/`)**
- `generateCSSVariables()` and `generateCSSRootBlock()` produce the exact CSS custom property values needed for PDF template styling
- The `getTheme()` function with fallback to light theme handles missing or invalid theme IDs
- Tenant branding data (logo URL, accent color override, theme ID) is fetched from the `tenantBranding` table as demonstrated in `DashboardLayout.astro`

## Out of Scope
- Batch PDF generation for multiple reports at once
- Email delivery of PDF reports to users or external recipients
- User-facing PDF customization options (content selection, layout preferences, page orientation)
- Watermarking on generated PDFs
- Creating a separate route for reports history (enhance existing `/reports` page only)
- Pre-generating PDFs automatically when a report is published
- Cloud storage for PDFs (use local filesystem storage only)
- Admin UI for managing feature flags (flags are set programmatically or via direct database operations for now)
- Cursor-based pagination (use simple offset/limit approach)
- PDF generation progress websocket or polling (use a simple synchronous POST that waits for generation to complete)
