# Specification: Report Week Preview & Published View

## Goal

Enable Agency Admins to preview report week content with tenant branding before publishing, and provide tenant users with a read-only view of published reports featuring a "Latest Report" prominent display and always-expanded content sections.

## User Stories

- As an Agency Admin, I want to preview a report week with the tenant's branding applied so that I can verify content appearance before publishing
- As a Tenant User (Admin or Viewer), I want to view published reports with all content sections always expanded so that I can easily read the weekly narrative without extra interactions

## Specific Requirements

**Preview Button on Content Edit Page**
- Add "Preview" button to the ContentEditorForm header area next to "Back to Report Weeks" link
- Button opens preview in a new browser tab using `target="_blank"`
- Preview URL format: `/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/preview`
- Button visible for both draft and published reports to allow content verification

**Preview Page Rendering**
- Create new Astro page at `/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/preview.astro`
- Fetch and apply tenant branding (theme, accent color override, tenant logo) using existing `generateCSSRootBlock` utility
- Display report week metadata: week period dates, tenant name
- Render all four content sections (Narrative, Initiatives, Needs From Client, Discovery Days) as always-expanded cards
- Hide sections entirely when content is null or empty string (no empty state messaging)

**Published Report View for Tenant Users**
- Create new Astro page at `/reports/[reportWeekId].astro` for tenant user access
- Only allow access if report status is "published"; redirect to `/reports` if draft
- Apply tenant branding dynamically using user's tenant context from session
- Display report content using same rendering logic as preview page
- All sections always expanded, non-collapsible
- Empty sections hidden entirely

**Tenant User Report List Page**
- Create new Astro page at `/reports/index.astro` (tenant-facing report list)
- Query only published reports for the user's current tenant context
- Feature "Latest Report" prominently at top with highlighted card styling
- Display remaining published reports in descending chronological order
- Include week ending date and week period for each report
- Link each report to `/reports/[reportWeekId]` view page

**Content Section Display Component**
- Create new `ReportSectionCard` component for read-only content display
- Accept props: title, htmlContent, optional description
- Render HTML content safely using dangerouslySetInnerHTML with sanitized content
- Apply prose styling consistent with RichTextEditor output
- Return null if htmlContent is falsy (implements hide-empty behavior)

**API Endpoint for Published Reports**
- Create GET `/api/reports` endpoint returning published reports for authenticated tenant user
- Filter by status='published' and user's tenant context
- Include report week metadata and formatted week period
- Order by weekEndingDate descending

**Access Control Implementation**
- Preview page: require Agency Admin role (existing `requireAgencyAdmin` pattern)
- Published report view: require tenant access using `requireTenantAccess` with user's tenantId
- Report list page: require authenticated user with tenant membership
- API endpoint: validate session and tenant membership before returning data

## Visual Design

No visual assets provided. Design should follow existing DashboardLayout patterns with:
- Tenant branding applied via CSS variables (accent color, theme)
- Tenant logo displayed in header when available
- Card-based section layout consistent with CollapsibleSection styling
- Report metadata displayed in page header area

## Existing Code to Leverage

**DashboardLayout.astro**
- Reuse for preview and published views with co-branding support
- Provides header with tenant logo, navigation, and footer
- Fetches and applies tenant branding via `generateCSSRootBlock`
- Handles workspace context and user session display

**CollapsibleSection Component**
- Reference card styling and structure for ReportSectionCard
- Use Card, CardHeader, CardTitle, CardContent primitives
- Adapt styling without collapse/expand functionality for read-only views

**Report Week Queries (lib/report-weeks/queries.ts)**
- Use `getReportWeeksForTenant` with status='published' filter for tenant report list
- Use `getReportWeekById` to fetch individual report for view pages
- Use `getReportWeekManualByReportWeekId` to fetch content sections

**Authorization Utilities (lib/auth/authorization.ts)**
- Use `requireAgencyAdmin` for preview page access control
- Use `requireTenantAccess` for published report view access
- Follow existing pattern for API endpoint authorization

**Theme System (lib/themes)**
- Use `generateCSSRootBlock` to generate CSS variables for tenant branding
- Apply theme and accent color override from tenantBranding table
- Ensure consistent branding between preview and published views

## Out of Scope

- Print-friendly styling or print CSS optimization
- Previous/next navigation between reports
- Email notifications when reports are published
- Collapsible sections on published views (always expanded)
- Empty state messaging for sections without content (hide entirely)
- PDF export functionality
- Discovery Days as separate structured list (use rich text field)
- Report filtering by year/month on tenant report list page
- Editing content from published report view (read-only)
- Copy-to-clipboard functionality for report content
