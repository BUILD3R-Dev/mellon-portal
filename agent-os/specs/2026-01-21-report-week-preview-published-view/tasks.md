# Task Breakdown: Report Week Preview & Published View

## Overview
Total Tasks: 5 Task Groups with 34 sub-tasks

This feature enables Agency Admins to preview report week content with tenant branding before publishing, and provides tenant users with a read-only view of published reports featuring a "Latest Report" prominent display and always-expanded content sections.

## Task List

### Shared Components

#### Task Group 1: ReportSectionCard Component
**Dependencies:** None

- [x] 1.0 Complete shared ReportSectionCard component
  - [x] 1.1 Write 3-4 focused tests for ReportSectionCard
    - Test component renders title and HTML content correctly
    - Test component returns null when htmlContent is empty/null
    - Test prose styling applied to content container
    - Skip testing all edge cases and interaction scenarios
  - [x] 1.2 Create ReportSectionCard component
    - Path: `src/components/reports/ReportSectionCard.tsx`
    - Props: title (string), htmlContent (string | null), description (string, optional)
    - Return null if htmlContent is falsy (implements hide-empty behavior)
    - Render HTML using dangerouslySetInnerHTML with sanitized content
    - Use Card, CardHeader, CardTitle, CardContent from `@/components/ui/Card`
    - Reference CollapsibleSection styling but remove expand/collapse functionality
    - Always expanded (no toggle button/arrow)
  - [x] 1.3 Apply prose styling for rich text content
    - Apply prose/typography classes consistent with RichTextEditor output
    - Ensure headings, lists, links render correctly
    - Use existing Tailwind typography plugin or prose classes
  - [x] 1.4 Ensure ReportSectionCard tests pass
    - Run ONLY the 3-4 tests written in 1.1
    - Verify component renders and hides correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-4 tests written in 1.1 pass
- Component renders title and HTML content
- Component returns null for empty content (hides section)
- Styling consistent with CollapsibleSection card appearance

---

### Admin Preview

#### Task Group 2: Preview Button and Preview Page
**Dependencies:** Task Group 1

- [x] 2.0 Complete preview functionality for Agency Admins
  - [x] 2.1 Write 4-5 focused tests for preview feature
    - Test Preview button renders on content edit page
    - Test Preview button has correct href with target="_blank"
    - Test preview page fetches and displays report week content
    - Test preview page applies tenant branding CSS variables
    - Test preview page hides sections with null content
    - Skip exhaustive authorization and error case testing
  - [x] 2.2 Add Preview button to ContentEditorForm header
    - Modify: `src/components/admin/content/ContentEditorForm.tsx`
    - Add Preview button next to existing "Back to Report Weeks" link area
    - Button opens `/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/preview` in new tab
    - Use `target="_blank"` and `rel="noopener noreferrer"`
    - Button visible for both draft and published reports
    - Style as secondary/outline button to differentiate from primary actions
  - [x] 2.3 Update edit.astro page header to pass tenantId to form
    - Verify ContentEditorForm receives tenantId prop (already passed)
    - Ensure form has access to generate preview URL
  - [x] 2.4 Create preview Astro page
    - Path: `src/pages/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/preview.astro`
    - Verify agency_admin role using `requireAgencyAdmin` pattern from authorization.ts
    - Redirect to /dashboard if not authorized
    - Fetch tenant data including branding (tenantBranding table)
    - Fetch report week using `getReportWeekById`
    - Fetch content using `getReportWeekManualByReportWeekId`
    - Apply tenant branding using `generateCSSRootBlock` utility
  - [x] 2.5 Implement preview page layout
    - Use DashboardLayout.astro (or create minimal preview layout)
    - Display tenant logo in header when available
    - Display report metadata: tenant name, week period dates
    - Display status badge (Draft/Published) for admin reference
  - [x] 2.6 Render content sections using ReportSectionCard
    - Section 1: "Narrative" with narrativeRich content
    - Section 2: "Initiatives" with initiativesRich content
    - Section 3: "Needs From Client" with needsRich content
    - Section 4: "Discovery Days" with discoveryDaysRich content
    - Each section hidden entirely when content is null
    - All sections always expanded (non-collapsible)
  - [x] 2.7 Ensure preview feature tests pass
    - Run ONLY the 4-5 tests written in 2.1
    - Verify preview button and page work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-5 tests written in 2.1 pass
- Preview button visible on content edit page
- Preview opens in new tab
- Preview page shows tenant branding (colors, theme, logo)
- All four content sections render with correct content
- Empty sections hidden entirely

---

### Tenant Report List

#### Task Group 3: Tenant Reports List Page and API
**Dependencies:** None (can run in parallel with Task Group 2)

- [x] 3.0 Complete tenant-facing reports list page
  - [x] 3.1 Write 4-5 focused tests for reports list
    - Test GET /api/reports returns only published reports
    - Test GET /api/reports filters by user's tenant context
    - Test reports list page renders "Latest Report" prominently
    - Test reports list orders by weekEndingDate descending
    - Test reports list links to individual report view
    - Skip pagination and filter testing
  - [x] 3.2 Create GET /api/reports endpoint
    - Path: `src/pages/api/reports/index.ts`
    - Validate session using existing auth pattern
    - Get tenantId from session/locals (user's current tenant context)
    - Return 401 if not authenticated
    - Return 403 if no tenant membership
    - Query published reports using `getReportWeeksForTenant` with status='published'
    - Include formatted week period in response
    - Order by weekEndingDate descending
    - Response format: `{ success: true, data: Report[] }`
  - [x] 3.3 Create reports list Astro page
    - Path: `src/pages/reports/index.astro`
    - Use DashboardLayout wrapper
    - Require authenticated user with tenant membership
    - Get tenantId from Astro.locals (set by middleware)
    - Fetch published reports server-side using query helper
    - Pass reports to React island component
  - [x] 3.4 Create ReportsList React component
    - Path: `src/components/reports/ReportsList.tsx`
    - Accept reports array as prop
    - Display "Latest Report" card prominently at top
    - Style latest report with highlighted card (accent border, larger text)
    - Display remaining reports in chronological list (descending)
    - Each report card shows: week ending date, week period
    - Link each report to `/reports/[reportWeekId]`
    - Empty state: "No published reports yet" message
  - [x] 3.5 Apply tenant branding to reports list
    - Tenant branding already applied by DashboardLayout
    - Ensure accent color used for "Latest Report" highlight
    - Use CSS variables for consistent theming
  - [x] 3.6 Ensure reports list tests pass
    - Run ONLY the 4-5 tests written in 3.1
    - Verify API and list page work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-5 tests written in 3.1 pass
- API returns only published reports for user's tenant
- List page accessible at /reports
- "Latest Report" prominently displayed at top
- Reports listed in descending chronological order
- Each report links to detail view

---

### Published Report View

#### Task Group 4: Published Report Detail Page
**Dependencies:** Task Groups 1 and 3

- [x] 4.0 Complete published report detail page for tenant users
  - [x] 4.1 Write 4-5 focused tests for published report view
    - Test published report page renders content sections
    - Test draft reports redirect to /reports list
    - Test unauthorized users cannot access report
    - Test tenant branding applied to published view
    - Test all sections always expanded (no collapse)
    - Skip accessibility and responsive testing
  - [x] 4.2 Create published report Astro page
    - Path: `src/pages/reports/[reportWeekId].astro`
    - Use DashboardLayout wrapper (provides tenant branding)
    - Require tenant access using `requireTenantAccess` with user's tenantId
    - Get tenantId from Astro.locals (set by middleware)
    - Fetch report week by ID
    - Validate report exists and belongs to user's tenant
    - Redirect to /reports if report not found
    - Redirect to /reports if report status is 'draft'
  - [x] 4.3 Fetch and validate report content
    - Fetch report week manual content using `getReportWeekManualByReportWeekId`
    - Format week period using `formatWeekPeriod`
    - Prepare content data for sections
  - [x] 4.4 Implement report detail page layout
    - Page header: tenant name (from context), week period dates
    - Back link to /reports list
    - Use same section rendering logic as preview page
  - [x] 4.5 Render content sections using ReportSectionCard
    - Reuse ReportSectionCard component from Task Group 1
    - Section 1: "Narrative" with narrativeRich content
    - Section 2: "Initiatives" with initiativesRich content
    - Section 3: "Needs From Client" with needsRich content
    - Section 4: "Discovery Days" with discoveryDaysRich content
    - Each section hidden when content is null
    - All sections always expanded
  - [x] 4.6 Ensure published report view tests pass
    - Run ONLY the 4-5 tests written in 4.1
    - Verify page renders and authorization works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-5 tests written in 4.1 pass
- Published reports viewable at /reports/[reportWeekId]
- Draft reports redirect to /reports
- Unauthorized users cannot access
- Tenant branding applied
- All sections always expanded, empty sections hidden

---

### Testing

#### Task Group 5: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-4

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review tests from Task Groups 1-4
    - Review the 3-4 tests written for ReportSectionCard (Task 1.1)
    - Review the 4-5 tests written for preview feature (Task 2.1)
    - Review the 4-5 tests written for reports list (Task 3.1)
    - Review the 4-5 tests written for published report view (Task 4.1)
    - Total existing tests: approximately 15-19 tests
  - [x] 5.2 Analyze test coverage gaps for this feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows: preview flow, tenant report viewing flow
  - [x] 5.3 Write up to 8 additional strategic tests maximum
    - Integration test: Agency Admin can preview report with tenant branding
    - Integration test: Tenant user can view published report list
    - Integration test: Tenant user can view individual published report
    - Test: Draft reports hidden from tenant user API response
    - Test: Preview page shows all four content sections
    - Test: Empty content sections hidden in both preview and published view
    - Focus on integration points between components
    - Do NOT write comprehensive coverage for all scenarios
  - [x] 5.4 Run feature-specific tests only
    - Run ONLY tests related to report preview and published view feature
    - Expected total: approximately 23-27 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 23-27 tests total)
- Critical user workflows for preview and published view are covered
- No more than 8 additional tests added when filling gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Shared Components (Task Group 1)** - Build ReportSectionCard first
   - No dependencies, foundational component for both preview and published views
   - Provides consistent section rendering across features

2. **Admin Preview (Task Group 2)** - Build preview button and page
   - Depends on ReportSectionCard component
   - Can verify content rendering with tenant branding

3. **Tenant Report List (Task Group 3)** - Build reports API and list page
   - Can run in parallel with Task Group 2 after Task Group 1 completes
   - Independent API and list page for tenant users

4. **Published Report View (Task Group 4)** - Build individual report view
   - Depends on ReportSectionCard and reports list for navigation
   - Final user-facing feature for tenant users

5. **Test Review (Task Group 5)** - Fill critical testing gaps
   - Run after all features implemented
   - Focus on integration and end-to-end workflow testing

---

## Technical Notes

### Existing Code to Reference
- **DashboardLayout:** `src/layouts/DashboardLayout.astro` - tenant branding, CSS variables
- **CollapsibleSection:** `src/components/admin/content/CollapsibleSection.tsx` - card styling reference
- **ContentEditorForm:** `src/components/admin/content/ContentEditorForm.tsx` - add Preview button
- **Report Week Queries:** `src/lib/report-weeks/queries.ts` - getReportWeekById, getReportWeeksForTenant
- **Authorization:** `src/lib/auth/authorization.ts` - requireAgencyAdmin, requireTenantAccess
- **Themes:** `src/lib/themes/index.ts` - generateCSSRootBlock utility
- **Card Components:** `src/components/ui/Card.tsx` - Card, CardHeader, CardContent

### Database Tables Used
- `reportWeeks` - id, tenantId, weekEndingDate, periodStartAt, periodEndAt, status
- `reportWeekManual` - reportWeekId, narrativeRich, initiativesRich, needsRich, discoveryDaysRich
- `tenantBranding` - tenantId, tenantLogoUrl, themeId, accentColorOverride
- `tenants` - id, name, timezone, status

### API Response Format
```typescript
{ success: boolean, data?: T, error?: string }
```

### URL Structure
- Preview (Agency Admin): `/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/preview`
- Reports List (Tenant User): `/reports`
- Report View (Tenant User): `/reports/[reportWeekId]`

### Content Sections (Four Total)
1. Narrative (narrativeRich)
2. Initiatives (initiativesRich)
3. Needs From Client (needsRich)
4. Discovery Days (discoveryDaysRich)

### Out of Scope (Do Not Implement)
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
