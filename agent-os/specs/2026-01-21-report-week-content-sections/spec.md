# Specification: Report Week Content Sections

## Goal
Enable agency administrators to author rich text content (Narrative, Initiatives, Needs From Client) for each report week using a Tiptap-based editor, with explicit save behavior and read-only mode for published reports.

## User Stories
- As an agency admin, I want to write weekly narrative content with formatting so that I can communicate performance updates clearly to clients
- As an agency admin, I want to see a clear warning when navigating away with unsaved changes so that I do not accidentally lose my work

## Specific Requirements

**Tiptap Rich Text Editor Component**
- Install @tiptap/react, @tiptap/starter-kit, and @tiptap/extension-link packages
- Create a reusable RichTextEditor component in `/src/components/editor/RichTextEditor.tsx`
- Support formatting: bold, italic, bullet lists, numbered lists, links, and headings (H2, H3)
- Output content as HTML strings (Tiptap default)
- Include a toolbar with buttons for each formatting option using icons consistent with existing UI
- Accept `value`, `onChange`, `disabled`, and `placeholder` props for controlled behavior
- Apply Tailwind prose classes for consistent rendering of HTML content

**Content Sections UI Layout**
- Display three collapsible card sections on the report week edit page: Narrative, Initiatives, Needs From Client
- Use shadcn/ui Collapsible or Accordion pattern with Card component styling
- Each section has a header with title and collapse/expand toggle icon
- Sections default to expanded state when content exists, collapsed when empty
- Maintain consistent spacing and visual hierarchy with existing admin components

**Eager Creation of reportWeekManual Record**
- Modify the `createReportWeek` function in `/src/lib/report-weeks/queries.ts` to also create the associated `reportWeekManual` record
- Use a database transaction to ensure both records are created atomically
- Initialize all rich text fields (narrativeRich, initiativesRich, needsRich) as null
- Add unique constraint on reportWeekManual.reportWeekId if not already present

**API Endpoint for Content CRUD**
- Create `GET /api/tenants/[id]/report-weeks/[reportWeekId]/manual` to fetch content
- Create `PATCH /api/tenants/[id]/report-weeks/[reportWeekId]/manual` to update content
- Follow existing API patterns from `/src/pages/api/tenants/[id]/report-weeks/[reportWeekId]/index.ts`
- Return structured response with success flag, data/error, and appropriate HTTP status codes
- Validate that report week is in draft status before allowing updates (return 400 if published)

**Explicit Save Behavior**
- Include a "Save" button at the bottom of the content editor page
- Track dirty state for each field using React state comparison
- Display "Unsaved changes" indicator near the save button when any field is modified
- Disable save button when no changes exist or when save is in progress
- Show success/error toast notification after save attempt

**Unsaved Changes Navigation Warning**
- Implement a custom React hook `useUnsavedChangesWarning` in `/src/hooks/useUnsavedChangesWarning.ts`
- Use beforeunload event to warn on browser navigation/refresh
- For client-side navigation, show a confirmation dialog before leaving the page
- Clear warning state after successful save

**Read-Only Mode for Published Reports**
- Pass `disabled={true}` to RichTextEditor when report week status is "published"
- Render content in view-only mode using a styled HTML container with prose classes
- Hide the Save button when in read-only mode
- Display a "Published" badge and informational message explaining content cannot be edited

**Report Week Edit Page Integration**
- Create or modify the report week edit page at `/src/pages/admin/tenants/[tenantId]/report-weeks/[reportWeekId]/edit.astro`
- Fetch both report week metadata and manual content on page load
- Render the React content editor island with initial data as props
- Include breadcrumb navigation back to the report weeks list

## Visual Design
No visual assets provided.

## Existing Code to Leverage

**Report Week Queries (`/src/lib/report-weeks/queries.ts`)**
- Contains createReportWeek, updateReportWeek, getReportWeekById functions
- Pattern for database operations with Drizzle ORM
- Extend createReportWeek to include reportWeekManual record creation in a transaction

**Report Week API Routes (`/src/pages/api/tenants/[id]/report-weeks/`)**
- Established pattern for validateAgencyAdmin authorization check
- validateTenant helper for tenant existence verification
- formatReportWeekResponse for consistent API response structure
- Standard error response format with success, error, and code fields

**Card Component (`/src/components/ui/Card.tsx`)**
- Reusable Card, CardHeader, CardTitle, CardContent components
- Use as base for collapsible content section wrappers
- Follow existing className patterns with cn utility

**Button Component (`/src/components/ui/Button.tsx`)**
- Use for Save button with appropriate variant (default or destructive for discard)
- Consistent styling with buttonVariants and size options

**Database Schema (`/src/lib/db/schema.ts`)**
- reportWeekManual table already exists with narrativeRich, initiativesRich, needsRich, discoveryDaysRich columns
- One-to-one relationship via reportWeekId foreign key to reportWeeks
- Use existing pattern for adding query functions

## Out of Scope
- Image uploads in the rich text editor
- Tables in the rich text editor
- Code blocks in the rich text editor
- @mentions or user tagging functionality
- Comments or annotations on content
- Version history or revision tracking for content changes
- Debounced or automatic autosave functionality
- discoveryDaysRich field editing (exists in schema but excluded from this spec)
- Preview page for report weeks (separate roadmap item #18)
- Published report view for tenant clients (separate roadmap item #19)
