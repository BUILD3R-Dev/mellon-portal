# Spec Requirements: Report Week Foundation

## Initial Description

Build the foundational Report Week data model and CRUD interface for agency admins to create, list, and manage report weeks per tenant. This corresponds to roadmap items #11 (Report Week Data Model), #12 (Report Week CRUD), and #13 (Draft/Publish Workflow) from Milestone 2.

The feature enables Mellon Agency staff to define weekly reporting periods for each franchise brand tenant, establishing the container structure that will later hold weekly narrative content and synced dashboard data.

## Requirements Discussion

### First Round Questions

**Q1:** For the report week date handling, should we use Friday as the "week ending" date (representing a Monday-Friday business week), or Sunday (representing a full calendar week)? I'm assuming Friday for business week alignment.
**Answer:** Use Friday as the week ending date (Monday-Friday periods) - confirmed.

**Q2:** When creating a report week, should the user select a single "week ending" date (and we auto-calculate the start), or should they pick both start and end dates explicitly?
**Answer:** Select only the week ending date (Friday), auto-calculate the Monday start date.

**Q3:** For date storage and display, should we use the tenant's configured timezone, or store everything in UTC and convert on display?
**Answer:** Use the tenant's configured timezone for date interpretation.

**Q4:** Should the system prevent creating overlapping report weeks for the same tenant, or allow flexibility for special cases?
**Answer:** Show an error if trying to create overlapping report weeks for the same tenant.

**Q5:** For the CRUD interface location, should report weeks be managed within a tenant context (e.g., `/admin/tenants/[id]/report-weeks`) or as a global list filterable by tenant?
**Answer:** Manage report weeks within a tenant context (e.g., `/admin/tenants/[id]/report-weeks`).

**Q6:** For the list view, I'm thinking: sortable by week ending date (newest first by default), filterable by status (draft/published), and optionally by year/month. Does that cover the needed functionality?
**Answer:** Confirmed as proposed - list view with sorting by week ending date (newest first), filtering by status (draft/published), filtering by year/month.

**Q7:** For the draft/publish workflow, once published should a report week be permanently locked, or should admins be able to "unpublish" to make corrections?
**Answer:** Allow unpublishing - two-way workflow (draft <-> published) so notes can be updated if needed. Admin users (Agency Admins) should be able to unlock published reports for corrections.

**Q8:** Should there be a confirmation dialog before publishing, warning that it will make the report visible to tenant users?
**Answer:** Show confirmation dialog before publishing with warning that it locks the report.

**Q9:** Are there any features you explicitly want to exclude from this foundational spec (beyond the rich text content sections already planned for a later spec)?
**Answer:** No additional exclusions specified.

### Existing Code to Reference

No similar existing features identified for reference. This is foundational work for a new feature area.

### Follow-up Questions

None required - user provided comprehensive answers to all questions.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files found in the visuals folder.

## Requirements Summary

### Functional Requirements

**Data Model:**
- Report week entity with tenant association (foreign key to tenants table)
- Week ending date (Friday) as the primary date field
- Week starting date (Monday) auto-calculated from week ending date
- Status field with values: draft, published
- Timestamps for created_at, updated_at, published_at
- Tenant timezone used for date interpretation

**CRUD Operations:**
- Create new report week by selecting a Friday week ending date
- Auto-calculate Monday start date (4 days before Friday)
- Validate no overlapping weeks exist for the tenant
- List all report weeks for a tenant with pagination
- Sort by week ending date (newest first by default)
- Filter by status (draft/published)
- Filter by year/month
- Edit report week (when in draft status)
- Delete report week (when in draft status only)

**Draft/Publish Workflow:**
- New report weeks created in draft status
- Publish action transitions draft to published
- Confirmation dialog before publishing with lock warning
- Unpublish action transitions published back to draft
- Only Agency Admins can unpublish (unlock) published reports
- Track published_at timestamp when publishing

**Access Control:**
- Report week management restricted to Agency Admin role
- Interface located at `/admin/tenants/[id]/report-weeks`
- All operations scoped to the specific tenant context

### Reusability Opportunities

- Tenant CRUD patterns from existing tenant management (Milestone 1)
- Role-based access control patterns already implemented
- Tenant-scoped data access patterns from tenant user management
- shadcn/ui table components for list view
- shadcn/ui dialog components for confirmation dialogs
- shadcn/ui date picker for week selection

### Scope Boundaries

**In Scope:**
- Report week database schema and migrations
- Report week CRUD API endpoints
- Report week list page with sorting and filtering
- Report week create/edit forms
- Draft/Publish status workflow with confirmation
- Unpublish capability for Agency Admins
- Overlap validation for same tenant
- Date auto-calculation (Monday from Friday)

**Out of Scope:**
- Rich text editor for weekly narratives (separate spec #14-17)
- Report week preview functionality (separate spec #18)
- Published report view for tenant users (separate spec #19)
- ClientTether data sync integration (Milestone 3)
- Reports history browsing for tenant users (Milestone 4)
- PDF export functionality (Milestone 4)

### Technical Considerations

- Use Drizzle ORM for schema definition and migrations
- Store dates as PostgreSQL date type (not timestamp)
- Tenant timezone configuration must exist or be added to tenant settings
- Follow existing patterns for tenant-scoped API routes
- Use Astro SSR with React islands for interactive list/form components
- Implement optimistic UI updates for status transitions
- Add appropriate database indexes for common query patterns (tenant_id, status, week_ending_date)
