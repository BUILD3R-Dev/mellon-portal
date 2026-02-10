# Spec Requirements: Reports History & PDF Export (Milestone 4)

## Initial Description

This milestone focuses on building a comprehensive reports history system and PDF export functionality for published reports. It encompasses 7 roadmap items (33-39):

- **33. Reports History Index** (M) -- Paginated list of published report weeks with year/month filtering
- **34. Historical Report Detail** (S) -- Detail view for any historical published report
- **35. Year/Month Filter Controls** (S) -- Dropdown filters for browsing by year and month
- **36. PDF Export Feature Flag** (XS) -- Feature flag system to enable/disable PDF export per tenant
- **37. PDF Template Design** (M) -- Playwright-compatible HTML template for PDF generation
- **38. PDF Generation Worker** (L) -- Background worker using Playwright to render PDFs
- **39. PDF Download UI** (S) -- Download button on published reports with PDF generation/download

Dependencies: Requires Milestones 1-3 to be complete (they are). Builds on the existing published reports infrastructure (report weeks, manual content, dashboard data).

## Requirements Discussion

### First Round Questions

**Q1:** Should the Reports History be an enhancement to the existing `/reports` page, or a separate route?
**Answer:** Enhance the existing `/reports` page rather than creating a separate route.

**Q2:** What pagination approach should be used for the reports history list?
**Answer:** Left to our discretion -- whatever works best.

**Q3:** Should the Historical Report Detail view include any additional elements beyond what the existing published report view shows?
**Answer:** No additional elements needed. The historical report detail is essentially the same as the existing published report view.

**Q4:** How should the PDF Export Feature Flag be implemented -- as a simple boolean or a more extensible system?
**Answer:** Set it up for future extensibility. NOT a simple boolean. Use a more general system like a `tenant_features` JSONB column or a separate `feature_flags` table.

**Q5:** What should the PDF visually include?
**Answer:** The PDF should visually match the current published report detail page with tenant co-branding (logo, accent colors). Include EVERYTHING -- both manual content sections AND dashboard data (leads, pipeline charts, etc.).

**Q6:** Should PDFs be generated on-demand or pre-generated? Should they be stored/cached?
**Answer:** On-demand generation is fine. Store the PDF locally so it can be downloaded whenever the user wants. Cache the reports -- don't regenerate each time (serve the cached version if available).

**Q7:** Where should the PDF download button appear, and which user roles should have access?
**Answer:** Download button should appear in BOTH places: the individual report detail page AND the reports history list (next to each report). ALL user roles should have access to PDF downloads.

**Q8:** Is anything explicitly out of scope?
**Answer:** Not explicitly called out by user. Implicitly out of scope (not part of the roadmap): batch generation, email delivery, PDF customization options, watermarking.

### Existing Code to Reference

The user did not provide explicit paths to similar features, but extensive codebase analysis reveals the following highly relevant existing code:

**Similar Features Identified:**
- Feature: Published Report View -- Path: `/Users/dustin/dev/github/mellon-portal/src/pages/reports/[reportWeekId].astro`
- Feature: Reports List Page -- Path: `/Users/dustin/dev/github/mellon-portal/src/pages/reports/index.astro`
- Feature: ReportsList Component -- Path: `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx`
- Feature: ReportSectionCard Component -- Path: `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportSectionCard.tsx`
- Feature: Reports API Endpoint -- Path: `/Users/dustin/dev/github/mellon-portal/src/pages/api/reports/index.ts`
- Feature: Report Weeks Query Module -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts`
- Feature: Report Weeks Date Utilities -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/date-utils.ts`
- Feature: Database Schema (includes `reportExports` table already) -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`
- Feature: Dashboard Island (charts/KPIs to include in PDF) -- Path: `/Users/dustin/dev/github/mellon-portal/src/components/dashboard/DashboardIsland.tsx`
- Feature: Dashboard API endpoints (KPI, leads, pipeline, notes, schedule) -- Path: `/Users/dustin/dev/github/mellon-portal/src/pages/api/dashboard/`
- Feature: Sync Worker Pattern -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/sync/run-sync.ts`
- Feature: Tenant Branding Schema -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts` (tenantBranding table)
- Feature: DashboardLayout with co-branding -- Path: `/Users/dustin/dev/github/mellon-portal/src/layouts/DashboardLayout.astro`
- Feature: Theme System -- Path: `/Users/dustin/dev/github/mellon-portal/src/lib/themes/`
- Feature: Auth Middleware (RBAC, tenant context) -- Path: `/Users/dustin/dev/github/mellon-portal/src/middleware/index.ts`

### Follow-up Questions

No follow-up questions were needed. The user's answers were comprehensive and clear.

## Visual Assets

### Files Provided:
No visual assets provided. The mandatory bash check of `/Users/dustin/dev/github/mellon-portal/agent-os/specs/2026-02-10-reports-history-pdf-export/planning/visuals/` confirmed no image files are present.

### Visual Insights:
Not applicable -- no visual files found.

## Requirements Summary

### Functional Requirements

**Reports History (Items 33-35):**
- Enhance the existing `/reports` page (at `/Users/dustin/dev/github/mellon-portal/src/pages/reports/index.astro`) to serve as the reports history index
- The existing `ReportsList` component (at `/Users/dustin/dev/github/mellon-portal/src/components/reports/ReportsList.tsx`) currently shows a "Latest Report" section and "Previous Reports" list -- this needs to be extended with pagination and year/month filtering
- Add year and month dropdown filter controls to allow users to browse historical reports
- The `getReportWeeksForTenant()` function in `/Users/dustin/dev/github/mellon-portal/src/lib/report-weeks/queries.ts` already supports `year` and `month` filter options -- this can be leveraged
- Pagination approach is at developer discretion (the existing list loads all reports at once; this needs to be paginated for scalability)
- The historical report detail view uses the same page as the existing published report view (`/reports/[reportWeekId]`) -- no new detail page needed
- The existing published report detail at `/Users/dustin/dev/github/mellon-portal/src/pages/reports/[reportWeekId].astro` already shows all manual content sections (narrative, initiatives, needs from client, discovery days) -- this is sufficient for historical reports

**Feature Flag System (Item 36):**
- Implement an extensible feature flag system (NOT a simple boolean)
- Options include a `tenant_features` JSONB column on the tenants table, or a separate `feature_flags` table
- The system should support future feature flags beyond just PDF export
- PDF export should be toggle-able per tenant using this system
- When PDF export is disabled for a tenant, download buttons should not appear

**PDF Template Design (Item 37):**
- Create a Playwright-compatible HTML template that visually matches the current published report detail page
- Include tenant co-branding: tenant logo (from `tenantBranding.tenantLogoUrl`), accent colors (from `tenantBranding.accentColorOverride` or theme defaults)
- Include ALL content: both manual content sections (narrative, initiatives, needs from client, discovery days) AND dashboard data (leads, pipeline charts, KPIs, etc.)
- The template must render standalone (not require the full Astro layout) since Playwright will render it in a headless browser
- The existing theme system at `/Users/dustin/dev/github/mellon-portal/src/lib/themes/` provides CSS variable generation that should inform the PDF styling

**PDF Generation Worker (Item 38):**
- Build a background worker/service using Playwright for headless browser PDF rendering
- On-demand generation triggered by user action (not pre-generated on publish)
- Store generated PDFs locally on the server filesystem so they can be re-downloaded
- Cache PDFs: if a cached PDF exists for a given report week, serve it directly without regenerating
- The existing `reportExports` table in the schema (at `/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`) already has `id`, `tenantId`, `reportWeekId`, `pdfUrl`, and `createdAt` columns -- this can track cached PDF metadata
- Playwright is already specified in the tech stack for this purpose

**PDF Download UI (Item 39):**
- Add a download button in TWO locations:
  1. On the individual report detail page (`/reports/[reportWeekId]`)
  2. On the reports history list (next to each report entry)
- ALL user roles (agency_admin, tenant_admin, tenant_viewer) should have access to PDF downloads
- Download button visibility is conditional on the tenant's PDF export feature flag being enabled
- Button should trigger PDF generation (or serve cached version) and provide a download link

### Reusability Opportunities

- The existing `ReportsList` component can be extended rather than replaced for history + pagination + filters
- The existing `ReportSectionCard` component is already used in the published report view and can be reused in the PDF HTML template design
- The `getReportWeeksForTenant()` query function already supports year/month filtering -- add pagination support (limit/offset) to it
- The existing `reportExports` table in the schema is ready to track PDF cache metadata
- The dashboard API endpoints (`/api/dashboard/kpi`, `/api/dashboard/leads`, `/api/dashboard/pipeline`) provide the data needed for the PDF's dashboard section
- The tenant branding and theme system provide all the co-branding data (logo URL, accent colors) needed for PDF styling
- The sync worker at `/Users/dustin/dev/github/mellon-portal/src/lib/sync/run-sync.ts` provides a pattern for background processing with status tracking
- The `Card`, `CardHeader`, `CardTitle`, `CardContent` UI components are used throughout and can inform PDF template structure
- The prose styling defined in the published report detail page (`:global(.prose)` rules) should be replicated in the PDF template

### Scope Boundaries

**In Scope:**
- Enhancing the `/reports` page with paginated history and year/month filters
- Building an extensible feature flag system for per-tenant feature toggling
- Creating an HTML template for PDF generation that matches the published report layout with full co-branding
- Building a Playwright-based PDF generation service with local file storage and caching
- Adding download buttons on both the report detail page and reports history list
- All user roles having PDF download access (gated only by tenant-level feature flag)

**Out of Scope:**
- Batch PDF generation for multiple reports at once
- Email delivery of PDF reports
- User-facing PDF customization options (content selection, layout preferences)
- Watermarking on PDFs
- Creating a separate route for reports history (enhancing existing `/reports` instead)
- Pre-generating PDFs on report publish (on-demand only)
- Cloud storage for PDFs (local filesystem storage)

### Technical Considerations

- **Framework:** Astro SSR with React islands -- the reports page is server-rendered with the ReportsList as a client-hydrated React island
- **Database:** PostgreSQL with Drizzle ORM -- the `reportExports` table already exists in the schema for PDF tracking; a new feature flags table or column is needed
- **PDF Generation:** Playwright headless browser rendering -- needs to be added as a dependency (not yet in package.json)
- **Pagination:** The existing reports API and query function return all results; pagination (limit/offset or cursor-based) needs to be added to both the query layer and API
- **Feature Flag Schema Design:** User wants extensibility -- a JSONB column or separate table approach; this is a new schema migration
- **File Storage:** PDFs stored locally on the server filesystem; the `pdfUrl` column in `reportExports` will reference the local file path
- **Caching Strategy:** Check `reportExports` table for existing PDF before generating; serve cached file if it exists
- **Dashboard Data in PDF:** The PDF template needs to render dashboard data (charts, KPIs) -- this means the PDF generation process needs to either query the database directly for dashboard data or render the full page with JavaScript chart libraries (ECharts) via Playwright
- **Co-branding in PDF:** Must fetch tenant branding (logo URL, accent color) and apply to the PDF template
- **CSS Variables/Theming:** The existing theme system generates CSS custom property blocks -- these need to be inlined in the PDF HTML template
- **Auth/RBAC:** PDF download endpoints must validate session and tenant access using the same patterns as existing API endpoints; no role restriction beyond tenant membership and feature flag check
- **Existing Patterns to Follow:** API response format (`{ success: true, data: ... }` / `{ success: false, error: ..., code: ... }`), query function patterns in `queries.ts`, middleware auth patterns, React component patterns with TypeScript interfaces and JSDoc comments
