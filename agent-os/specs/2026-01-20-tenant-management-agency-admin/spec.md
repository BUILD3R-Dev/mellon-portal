# Specification: Tenant Management (Agency Admin)

## Goal
Create a CRUD interface for agency admins to create, view, update, and soft-delete tenants (franchise brands) with list view, detail page, and modal forms following existing admin patterns.

## User Stories
- As an agency admin, I want to view all tenants in a searchable/filterable table so that I can quickly find and manage franchise brand accounts
- As an agency admin, I want to create new tenants with name, timezone, and status so that I can onboard new franchise brand clients

## Specific Requirements

**Tenant List Page**
- Route at `/admin/tenants` using Astro SSR page with React island for interactivity
- Table displays columns: Name, Status (badge), Timezone, Created Date
- Search input filters tenants by name (client-side filtering acceptable for MVP)
- Status filter dropdown with options: All, Active, Inactive, Suspended
- Sortable columns with click-to-sort functionality
- "Create Tenant" button in header opens modal form
- Each row has action menu with View, Edit, Delete options

**Create Tenant Modal**
- Modal form triggered by "Create Tenant" button (follows InviteUserModal pattern)
- Fields: Name (required text input), Timezone (dropdown with default "America/New_York"), Status (dropdown with default "active")
- Form validation with field-specific error messages
- Submit calls `POST /api/tenants` endpoint
- Success shows toast notification and refreshes list
- Modal includes Cancel and Create buttons with loading state

**Edit Tenant Modal**
- Pre-populates form with existing tenant values
- Additional fields: Mellon Logo URL (text input), Tenant Logo URL (text input)
- Logo fields store URLs directly to tenantBranding table (not file upload widget)
- Submit calls `PATCH /api/tenants/[id]` endpoint
- Upserts tenantBranding record if logo URLs provided

**Tenant Detail Page**
- Route at `/admin/tenants/[id]` using Astro SSR with dynamic route parameter
- Header shows tenant name, status badge, and Edit/Delete action buttons
- Info section displays: Name, Timezone, Status, Created At, Updated At
- Users section lists associated users via memberships table with link to user management
- Links section provides navigation to: Branding Settings (placeholder), Integration Settings (placeholder), Field Mappings (placeholder)
- Placeholder links display "Coming Soon" badge indicating future features

**Status Change Confirmation**
- Confirmation dialog appears when changing status between active/inactive/suspended
- Dialog explains impact: "Changing status to [X] will affect user access to this tenant"
- Dialog has Cancel and Confirm buttons
- Status change calls `PATCH /api/tenants/[id]` with new status value

**Soft Delete Flow**
- No hard delete option in the UI
- Delete action triggers confirmation dialog explaining deactivation
- Dialog text: "This will deactivate the tenant and revoke access for all associated users"
- Confirmation sets tenant status to "inactive" via `PATCH /api/tenants/[id]`
- Does not delete associated users but they lose access due to tenant status

**API Endpoints**
- `GET /api/tenants` returns list of all tenants with optional status query parameter
- `POST /api/tenants` creates new tenant with name, timezone, status fields
- `GET /api/tenants/[id]` returns single tenant with associated users count
- `PATCH /api/tenants/[id]` updates tenant fields including status and branding
- All endpoints require agency_admin role verified via session
- Return consistent JSON response format: `{ success: boolean, data?: T, error?: string }`

**Timezone Dropdown Options**
- Reuse COMMON_TIMEZONES array from RegistrationForm.tsx
- Default selection is "America/New_York"
- Display friendly labels (e.g., "Eastern Time (US & Canada)")

## Visual Design
No visual mockups were provided for this specification.

## Existing Code to Leverage

**UserManagement.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/admin/UserManagement.tsx`)**
- Reuse table structure with header row styling and hover states
- Follow StatusBadge component pattern for tenant status display
- Replicate notification toast pattern for success/error feedback
- Use same button styling for primary actions

**InviteUserModal.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/admin/InviteUserModal.tsx`)**
- Follow modal structure with backdrop, header, content sections
- Reuse form field styling and validation error display pattern
- Implement same escape key and click-outside-to-close behavior
- Use matching button layout with Cancel/Submit actions

**RegistrationForm.tsx (`/Users/dustin/dev/github/mellon-portal/src/components/forms/RegistrationForm.tsx`)**
- Import and reuse COMMON_TIMEZONES constant for timezone dropdown
- Follow same form state management pattern with useState
- Replicate validation approach with field-specific error messages

**Database Schema (`/Users/dustin/dev/github/mellon-portal/src/lib/db/schema.ts`)**
- Use existing tenants table: id, name, timezone, status, createdAt, updatedAt
- Use existing tenantBranding table for logo URLs (mellonLogoUrl, tenantLogoUrl)
- Reference tenantStatusEnum for valid status values: active, inactive, suspended
- Query memberships table to get associated users for detail view

**Admin Dashboard (`/Users/dustin/dev/github/mellon-portal/src/pages/admin/dashboard.astro`)**
- Follow same page layout structure with DashboardLayout wrapper
- Replicate agency admin role check pattern in page frontmatter
- Use consistent card styling for detail page sections

## Out of Scope
- Bulk operations (multi-select, bulk status change, bulk delete)
- Export functionality (CSV, Excel export of tenant list)
- Audit history display (who changed what and when)
- ClientTether Web Key configuration (separate Integration Settings feature)
- Detailed branding configuration including colors and header layouts (roadmap item #6)
- Field mappings configuration (separate feature)
- File upload widget for logos (use URL text inputs instead)
- User assignment within tenant detail page (handled by User Management feature)
- Pagination for tenant list (client-side filtering sufficient for expected tenant count)
- Advanced search with multiple field matching
