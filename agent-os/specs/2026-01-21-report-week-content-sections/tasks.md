# Task Breakdown: Report Week Content Sections

## Overview
Total Tasks: 31

This feature enables agency administrators to author rich text content (Narrative, Initiatives, Needs From Client) for each report week using a Tiptap-based editor, with explicit save behavior and read-only mode for published reports.

## Task List

### Tiptap Setup & Rich Text Editor

#### Task Group 1: Tiptap Installation and Editor Component
**Dependencies:** None

- [x] 1.0 Complete Tiptap editor setup
  - [x] 1.1 Write 4 focused tests for RichTextEditor component
    - Test that editor renders with initial content
    - Test that toolbar buttons toggle formatting
    - Test that onChange fires when content changes
    - Test that disabled state prevents editing
  - [x] 1.2 Install Tiptap packages
    - `@tiptap/react`
    - `@tiptap/starter-kit`
    - `@tiptap/extension-link`
  - [x] 1.3 Create RichTextEditor component at `/src/components/editor/RichTextEditor.tsx`
    - Props: `value`, `onChange`, `disabled`, `placeholder`
    - Configure extensions: StarterKit (bold, italic, lists, headings), Link
    - Enable only H2/H3 headings, bullet/numbered lists, bold, italic, links
    - Output content as HTML strings
  - [x] 1.4 Create EditorToolbar component at `/src/components/editor/EditorToolbar.tsx`
    - Toolbar buttons for: Bold, Italic, H2, H3, Bullet List, Numbered List, Link
    - Use icons consistent with existing admin UI (simple SVG icons)
    - Style with Tailwind matching Button component patterns
    - Disable buttons when editor is disabled
  - [x] 1.5 Add Tailwind prose styles for rich text rendering
    - Apply `prose` class for consistent HTML content display
    - Ensure prose styles match portal design system
  - [x] 1.6 Ensure editor component tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify editor initialization works correctly

**Acceptance Criteria:**
- The 4 tests written in 1.1 pass
- Tiptap editor renders with toolbar
- All specified formatting options work
- Editor outputs HTML strings
- Disabled state prevents editing

### Database Layer

#### Task Group 2: Eager Creation of reportWeekManual Record
**Dependencies:** None (can run in parallel with Task Group 1)

- [x] 2.0 Complete database layer modifications
  - [x] 2.1 Write 3 focused tests for reportWeekManual eager creation
    - Test that creating a report week also creates reportWeekManual record
    - Test that reportWeekManual fields are initialized as null
    - Test that transaction rolls back if reportWeekManual creation fails
  - [x] 2.2 Add unique constraint on reportWeekManual.reportWeekId
    - Create migration if needed
    - Ensure one-to-one relationship enforcement
  - [x] 2.3 Modify `createReportWeek` function in `/src/lib/report-weeks/queries.ts`
    - Use database transaction to create both records atomically
    - Initialize narrativeRich, initiativesRich, needsRich as null
    - Return the created report week
  - [x] 2.4 Add query functions for reportWeekManual in `/src/lib/report-weeks/queries.ts`
    - `getReportWeekManualByReportWeekId(reportWeekId: string)`
    - `updateReportWeekManual(reportWeekId: string, data: {...})`
    - Follow existing query patterns with Drizzle ORM
  - [x] 2.5 Ensure database layer tests pass
    - Run ONLY the 3 tests written in 2.1
    - Verify transaction behavior works correctly

**Acceptance Criteria:**
- The 3 tests written in 2.1 pass
- Creating a report week also creates associated reportWeekManual record
- Transaction ensures atomic creation
- Query functions work correctly

### API Layer

#### Task Group 3: Manual Content API Endpoints
**Dependencies:** Task Group 2

- [x] 3.0 Complete API endpoints for manual content
  - [x] 3.1 Write 5 focused tests for manual content API
    - Test GET returns manual content for report week
    - Test PATCH updates manual content successfully
    - Test PATCH returns 400 when report week is published
    - Test proper authorization (agency admin required)
    - Test 404 when report week not found
  - [x] 3.2 Create `/src/pages/api/tenants/[id]/report-weeks/[reportWeekId]/manual.ts`
    - Follow existing API patterns from `[reportWeekId]/index.ts`
    - Reuse `validateAgencyAdmin` and `validateTenant` helper functions
  - [x] 3.3 Implement GET handler
    - Fetch reportWeekManual by reportWeekId
    - Return structured response: `{ success: true, data: { narrativeRich, initiativesRich, needsRich } }`
    - Include report week status in response for UI state management
  - [x] 3.4 Implement PATCH handler
    - Accept partial updates for narrativeRich, initiativesRich, needsRich
    - Validate report week is in draft status before allowing updates
    - Return 400 with clear error if report week is published
    - Return updated content on success
  - [x] 3.5 Add proper error responses
    - Use consistent error format: `{ success: false, error: string, code: string }`
    - Handle NOT_FOUND, VALIDATION_ERROR, FORBIDDEN, INTERNAL_ERROR codes
  - [x] 3.6 Ensure API layer tests pass
    - Run ONLY the 5 tests written in 3.1
    - Verify CRUD operations work correctly

**Acceptance Criteria:**
- The 5 tests written in 3.1 pass
- GET returns manual content data
- PATCH updates content for draft report weeks
- PATCH rejects updates for published report weeks
- Proper authorization enforced
- Consistent response format

### Frontend Components

#### Task Group 4: Collapsible Content Sections UI
**Dependencies:** Task Group 1

- [x] 4.0 Complete collapsible content sections
  - [x] 4.1 Write 4 focused tests for CollapsibleSection component
    - Test section renders with title and content
    - Test collapse/expand toggle works
    - Test section is expanded when content exists
    - Test section is collapsed when content is empty
  - [x] 4.2 Create CollapsibleSection component at `/src/components/admin/content/CollapsibleSection.tsx`
    - Props: `title`, `children`, `defaultExpanded`, `hasContent`
    - Use Card component as base styling
    - Add collapse/expand toggle icon (chevron)
    - Support controlled and uncontrolled modes
  - [x] 4.3 Style collapse/expand animation
    - Smooth height transition
    - Rotate chevron icon on state change
    - Maintain accessibility (aria-expanded, aria-controls)
  - [x] 4.4 Ensure collapsible section tests pass
    - Run ONLY the 4 tests written in 4.1
    - Verify expand/collapse behavior works

**Acceptance Criteria:**
- The 4 tests written in 4.1 pass
- Sections expand/collapse smoothly
- Default state based on content presence
- Accessible keyboard navigation

#### Task Group 5: Unsaved Changes Warning Hook
**Dependencies:** None (can run in parallel)

- [x] 5.0 Complete unsaved changes warning functionality
  - [x] 5.1 Write 3 focused tests for useUnsavedChangesWarning hook
    - Test that beforeunload event is attached when hasChanges is true
    - Test that beforeunload event is removed when hasChanges is false
    - Test that hook returns correct hasChanges state
  - [x] 5.2 Create `/src/hooks/useUnsavedChangesWarning.ts`
    - Accept `hasChanges: boolean` parameter
    - Attach beforeunload event listener when changes exist
    - Clean up listener on unmount or when changes are saved
  - [x] 5.3 Add client-side navigation warning
    - Use window.confirm for simple navigation blocking
    - Return function to check if navigation should be blocked
  - [x] 5.4 Ensure hook tests pass
    - Run ONLY the 3 tests written in 5.1
    - Verify event listeners work correctly

**Acceptance Criteria:**
- The 3 tests written in 5.1 pass
- Browser warns on refresh/close with unsaved changes
- Warning clears after successful save

#### Task Group 6: Content Editor Form Component
**Dependencies:** Task Groups 1, 4, 5

- [x] 6.0 Complete content editor form
  - [x] 6.1 Write 5 focused tests for ContentEditorForm component
    - Test renders three collapsible sections (Narrative, Initiatives, Needs)
    - Test tracks dirty state when content changes
    - Test save button disabled when no changes
    - Test displays "Unsaved changes" indicator when dirty
    - Test read-only mode hides save button and disables editors
  - [x] 6.2 Create ContentEditorForm component at `/src/components/admin/content/ContentEditorForm.tsx`
    - Props: `reportWeekId`, `tenantId`, `initialData`, `status`, `weekPeriod`
    - Render three CollapsibleSection components
    - Each section contains RichTextEditor
    - Section labels: "Narrative", "Initiatives", "Needs From Client"
  - [x] 6.3 Implement dirty state tracking
    - Compare current values against initial values
    - Set `hasChanges` flag when any field differs
    - Pass to useUnsavedChangesWarning hook
  - [x] 6.4 Add save functionality
    - Save button at bottom of form
    - Display "Unsaved changes" indicator next to button when dirty
    - Disable button when no changes or during save
    - Call PATCH API on save
    - Show success/error toast after save
  - [x] 6.5 Implement read-only mode for published reports
    - Pass `disabled={true}` to all editors when status is "published"
    - Hide save button and unsaved changes indicator
    - Display "Published" badge with informational message
    - Render content in view mode with prose styles
  - [x] 6.6 Ensure content editor form tests pass
    - Run ONLY the 5 tests written in 6.1
    - Verify form behavior works correctly

**Acceptance Criteria:**
- The 5 tests written in 6.1 pass
- Three content sections render correctly
- Dirty state tracked accurately
- Save with success/error feedback
- Read-only mode for published reports

### Page Integration

#### Task Group 7: Report Week Edit Page
**Dependencies:** Task Groups 3, 6

- [x] 7.0 Complete report week edit page integration
  - [x] 7.1 Write 3 focused tests for edit page
    - Test page loads report week and manual content
    - Test breadcrumb navigation renders correctly
    - Test page passes correct props to ContentEditorForm
  - [x] 7.2 Create edit page at `/src/pages/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/edit.astro`
    - Fetch report week metadata using getReportWeekById
    - Fetch manual content using getReportWeekManualByReportWeekId
    - Pass data as props to React island
  - [x] 7.3 Add breadcrumb navigation
    - Path: Admin > Tenants > [Tenant Name] > Report Weeks > [Week Period] > Edit
    - Use existing breadcrumb patterns from admin pages
  - [x] 7.4 Mount ContentEditorForm as React island
    - Pass initialData with content fields
    - Pass report week status and weekPeriod
    - Ensure client:load directive for interactivity
  - [x] 7.5 Add "Edit Content" action to ReportWeekList
    - Modify `/src/components/admin/ReportWeekList.tsx`
    - Add "Edit Content" button linking to edit page
    - Show for both draft and published report weeks (published shows read-only view)
  - [x] 7.6 Ensure edit page tests pass
    - Run ONLY the 3 tests written in 7.1
    - Verify page loads and renders correctly

**Acceptance Criteria:**
- The 3 tests written in 7.1 pass
- Edit page loads report week and content data
- Breadcrumb navigation works
- ContentEditorForm receives correct props
- Navigation from report weeks list works

### Testing

#### Task Group 8: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-7

- [x] 8.0 Review existing tests and fill critical gaps only
  - [x] 8.1 Review tests from Task Groups 1-7
    - Review the 4 tests from Task 1.1 (RichTextEditor)
    - Review the 3 tests from Task 2.1 (database layer)
    - Review the 5 tests from Task 3.1 (API endpoints)
    - Review the 4 tests from Task 4.1 (CollapsibleSection)
    - Review the 3 tests from Task 5.1 (unsaved changes hook)
    - Review the 5 tests from Task 6.1 (ContentEditorForm)
    - Review the 3 tests from Task 7.1 (edit page)
    - Total existing tests: 27 tests
  - [x] 8.2 Analyze test coverage gaps for this feature only
    - Identify critical user workflows that lack test coverage
    - Focus on end-to-end content editing flow
    - Check for integration gaps between components
  - [x] 8.3 Write up to 5 additional strategic tests maximum
    - Add tests for critical integration points if needed
    - Focus on complete save workflow if gaps exist
    - Do NOT write comprehensive coverage
  - [x] 8.4 Run feature-specific tests only
    - Run tests from all task groups (1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.3)
    - Expected total: approximately 27-32 tests maximum
    - Verify all feature-specific tests pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 27-32 tests total)
- Critical user workflows for content editing are covered
- No more than 5 additional tests added when filling gaps
- Testing focused exclusively on this spec's feature requirements

## Execution Order

Recommended implementation sequence:

1. **Parallel Phase 1:**
   - Task Group 1: Tiptap Installation and Editor Component
   - Task Group 2: Eager Creation of reportWeekManual Record
   - Task Group 5: Unsaved Changes Warning Hook

2. **Sequential Phase 2:**
   - Task Group 3: Manual Content API Endpoints (depends on Task Group 2)
   - Task Group 4: Collapsible Content Sections UI (depends on Task Group 1)

3. **Sequential Phase 3:**
   - Task Group 6: Content Editor Form Component (depends on Task Groups 1, 4, 5)

4. **Sequential Phase 4:**
   - Task Group 7: Report Week Edit Page (depends on Task Groups 3, 6)

5. **Final Phase:**
   - Task Group 8: Test Review & Gap Analysis (depends on all previous groups)

## Key Files to Create/Modify

### New Files
- `/src/components/editor/RichTextEditor.tsx`
- `/src/components/editor/EditorToolbar.tsx`
- `/src/components/admin/content/CollapsibleSection.tsx`
- `/src/components/admin/content/ContentEditorForm.tsx`
- `/src/hooks/useUnsavedChangesWarning.ts`
- `/src/pages/api/tenants/[id]/report-weeks/[reportWeekId]/manual.ts`
- `/src/pages/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/edit.astro`

### Modified Files
- `/src/lib/report-weeks/queries.ts` - Add transaction for reportWeekManual creation, add query functions
- `/src/lib/db/schema.ts` - Add unique constraint on reportWeekManual.reportWeekId (if needed)
- `/src/components/admin/ReportWeekList.tsx` - Add "Edit Content" action button

## Notes

- Tiptap outputs HTML by default - store as-is in text columns
- discoveryDaysRich field exists in schema but is out of scope for this spec
- Follow existing patterns for API responses, component styling, and error handling
- No visual assets provided - match existing admin UI patterns
