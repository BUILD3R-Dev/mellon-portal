# Specification: Report Week Foundation

## Goal
Build the foundational Report Week data model and CRUD interface for agency admins to create, list, and manage report weeks per tenant. This establishes the container structure for weekly reporting periods that will later hold narrative content and synced dashboard data.

## User Stories
- As an Agency Admin, I want to create report weeks for each tenant by selecting a Friday week-ending date so that I can establish weekly reporting periods for franchise brands.
- As an Agency Admin, I want to publish and unpublish report weeks so that I can control when reports become visible to tenant users and make corrections if needed.

## Specific Requirements

**Report Week List Page**
- Located at `/admin/tenants/[id]/report-weeks` within the tenant context
- Display sortable table with columns: week ending date, week period (Mon-Fri range), status, published date, actions
- Default sort by week ending date descending (newest first)
- Filter by status (draft/published) and by year/month
- Include "Create Report Week" button in header
- Show empty state when no report weeks exist with call-to-action to create first one
- Add link to this page from TenantDetail settings section

**Create/Edit Report Week Modal**
- Single date input for week ending date (Friday only validation)
- Auto-calculate and display the Monday start date (4 days before Friday)
- Show the full week period in a read-only display (e.g., "Jan 13 - Jan 17, 2025")
- Client-side validation: selected date must be a Friday
- Server-side validation: no overlapping weeks for the same tenant
- Edit mode only available for draft status report weeks

**Date Handling and Timezone**
- Use tenant's configured timezone for all date interpretation and display
- Store `week_ending_date` as PostgreSQL date type (not timestamp)
- Store `period_start_at` and `period_end_at` as timestamps with timezone boundaries (Monday 00:00:00 to Friday 23:59:59 in tenant timezone)
- Auto-calculate Monday start date by subtracting 4 days from the Friday week ending date
- Date picker should restrict selection to Fridays only

**Draft/Publish Workflow**
- New report weeks created in draft status
- Publish action shows confirmation dialog warning that report will be visible to tenant users
- Track `published_at` timestamp and `published_by` user reference when publishing
- Unpublish action transitions published back to draft, clears published_at/published_by
- Only Agency Admins can publish and unpublish (RBAC enforced at API level)
- Status badge styling: draft (gray), published (green)

**Overlap Validation**
- Server-side validation to prevent overlapping date ranges for same tenant
- Check if any existing report week's period overlaps with the new/edited week's period
- Return specific error message: "A report week already exists that overlaps with this date range"
- Overlap check must exclude the current report week when editing

**Delete Report Week**
- Only allow deletion of draft status report weeks
- Show confirmation dialog before deletion
- Published report weeks cannot be deleted (button disabled or hidden)

**API Endpoints**
- `GET /api/tenants/[id]/report-weeks` - List report weeks with optional status/year/month filters
- `POST /api/tenants/[id]/report-weeks` - Create new report week
- `GET /api/tenants/[id]/report-weeks/[reportWeekId]` - Get single report week details
- `PATCH /api/tenants/[id]/report-weeks/[reportWeekId]` - Update report week (date, status)
- `DELETE /api/tenants/[id]/report-weeks/[reportWeekId]` - Delete draft report week
- All endpoints require Agency Admin authorization using existing `requireAgencyAdmin` helper

**Database Indexes**
- Add composite index on `(tenant_id, week_ending_date)` for efficient queries
- Add index on `status` for filtering
- Existing indexes on `tenant_id` and `week_ending_date` from schema already defined

## Visual Design
No visual mockups provided. Follow existing TenantManagement and TenantDetail component patterns for list view, modals, and confirmation dialogs.

## Existing Code to Leverage

**TenantManagement.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantManagement.tsx`)**
- Reuse table structure with sortable columns, search, and status filter patterns
- Follow StatusBadge component pattern for draft/published status display
- Use same notification pattern for success/error feedback
- Mirror the filtering/sorting state management approach

**TenantModal.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/admin/TenantModal.tsx`)**
- Follow modal structure with header, content, and action buttons
- Reuse form validation patterns and error display
- Apply same escape key handling and focus trap implementation
- Use create/edit mode pattern for the ReportWeekModal

**StatusChangeDialog.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/admin/StatusChangeDialog.tsx`)**
- Use as template for publish/unpublish confirmation dialogs
- Follow the impact message pattern to warn about visibility changes
- Reuse loading state and button patterns

**API route patterns (`/Users/dustin/dev/github/mellon-portal/src/pages/api/tenants/index.ts`)**
- Follow `validateAgencyAdmin` pattern for authorization
- Use same response structure: `{ success: true, data: ... }` or `{ success: false, error: ..., code: ... }`
- Apply same error handling and status code conventions

**Database schema (`/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`)**
- `reportWeeks` table already defined with all required fields
- `reportWeekStatusEnum` already defined with 'draft' and 'published' values
- Follow existing foreign key and index patterns

## Out of Scope
- Rich text editor for weekly narratives (future spec)
- Report week preview functionality (future spec)
- Published report view for tenant users (future spec)
- ClientTether data sync integration (Milestone 3)
- Reports history browsing for tenant users (Milestone 4)
- PDF export functionality (Milestone 4)
- Bulk operations (publish/unpublish multiple weeks)
- Report week duplication/copying
- Automated report week creation scheduling
- Email notifications when reports are published
