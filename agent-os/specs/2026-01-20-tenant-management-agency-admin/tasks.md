# Task Breakdown: Tenant Management (Agency Admin)

## Overview
Total Tasks: 4 Task Groups with 28 sub-tasks

This feature provides agency admins with CRUD functionality for managing tenants (franchise brands) including a list view, detail page, and modal forms for create/edit operations.

## Task List

### API Layer

#### Task Group 1: API Endpoints for Tenant CRUD
**Dependencies:** None (database schema already exists)

- [x] 1.0 Complete API layer for tenant management
  - [x] 1.1 Write 4-6 focused tests for API endpoints
    - Test GET /api/tenants returns list of tenants
    - Test POST /api/tenants creates tenant with valid data
    - Test GET /api/tenants/[id] returns single tenant with user count
    - Test PATCH /api/tenants/[id] updates tenant fields
    - Test authorization check (agency_admin role required)
    - Skip exhaustive validation and error case testing
  - [x] 1.2 Create GET /api/tenants endpoint
    - Route: `src/pages/api/tenants/index.ts`
    - Query tenants table using Drizzle ORM
    - Optional status query parameter for filtering
    - Return consistent JSON: `{ success: boolean, data: Tenant[] }`
    - Require agency_admin role via session check
  - [x] 1.3 Create POST /api/tenants endpoint
    - Route: `src/pages/api/tenants/index.ts`
    - Accept fields: name (required), timezone (default "America/New_York"), status (default "active")
    - Validate required fields with field-specific error messages
    - Insert into tenants table using Drizzle
    - Return created tenant with 201 status
  - [x] 1.4 Create GET /api/tenants/[id] endpoint
    - Route: `src/pages/api/tenants/[id].ts`
    - Query single tenant by UUID
    - Include count of associated users via memberships table
    - Return 404 if tenant not found
    - Return tenant data with userCount field
  - [x] 1.5 Create PATCH /api/tenants/[id] endpoint
    - Route: `src/pages/api/tenants/[id].ts`
    - Accept partial updates: name, timezone, status
    - Accept logo URLs: mellonLogoUrl, tenantLogoUrl
    - Upsert tenantBranding record if logo URLs provided
    - Update updatedAt timestamp
    - Return updated tenant data
  - [x] 1.6 Ensure API layer tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify all endpoints return correct response format
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 1.1 pass
- All endpoints require agency_admin authentication
- GET /api/tenants returns tenant list with optional status filter
- POST /api/tenants creates new tenant
- GET /api/tenants/[id] returns tenant with user count
- PATCH /api/tenants/[id] updates tenant and branding

---

### Frontend Components - List View

#### Task Group 2: Tenant List Page with Search and Filter
**Dependencies:** Task Group 1

- [x] 2.0 Complete tenant list page
  - [x] 2.1 Write 3-5 focused tests for list components
    - Test TenantManagement component renders table with tenants
    - Test search input filters tenants by name
    - Test status filter dropdown filters by status
    - Test "Create Tenant" button opens modal
    - Skip testing all sorting combinations and edge cases
  - [x] 2.2 Create Astro page at /admin/tenants
    - Route: `src/pages/admin/tenants/index.astro`
    - Use DashboardLayout wrapper (follow admin/dashboard.astro pattern)
    - Verify agency_admin role in page frontmatter
    - Fetch tenants list server-side
    - Pass tenants to React island component
  - [x] 2.3 Create TenantManagement React component
    - Path: `src/components/admin/TenantManagement.tsx`
    - Reuse table structure from UserManagement.tsx
    - Display columns: Name, Status (badge), Timezone, Created Date
    - Include search input with client-side filtering by name
    - Include status filter dropdown (All, Active, Inactive, Suspended)
  - [x] 2.4 Implement sortable columns
    - Click-to-sort on Name, Status, Timezone, Created Date columns
    - Toggle ascending/descending on repeated clicks
    - Show sort indicator (arrow) on active column
  - [x] 2.5 Add action menu for each row
    - Three-dot menu or action buttons per row
    - Options: View (links to detail page), Edit (opens modal), Delete (opens confirmation)
    - Follow existing action button patterns
  - [x] 2.6 Reuse StatusBadge component pattern
    - Map tenant status to badge colors
    - Active: green, Inactive: gray, Suspended: amber/orange
  - [x] 2.7 Ensure list view tests pass
    - Run ONLY the 3-5 tests written in 2.1
    - Verify table renders and filtering works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 2.1 pass
- Page accessible at /admin/tenants
- Table displays tenant data with proper styling
- Search filters tenants by name
- Status dropdown filters by status
- Columns are sortable
- Row actions navigate to detail or open modals

---

### Frontend Components - Modals and Detail Page

#### Task Group 3: Create/Edit Modals and Detail Page
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete modal forms and detail page
  - [x] 3.1 Write 4-6 focused tests for modals and detail page
    - Test CreateTenantModal renders form fields correctly
    - Test CreateTenantModal submits to POST /api/tenants
    - Test EditTenantModal pre-populates form with tenant data
    - Test tenant detail page displays tenant information
    - Test status change confirmation dialog appears
    - Skip exhaustive validation and interaction testing
  - [x] 3.2 Create CreateTenantModal component
    - Path: `src/components/admin/TenantModal.tsx` (combined create/edit modal)
    - Follow InviteUserModal.tsx structure (backdrop, header, content)
    - Fields: Name (required text), Timezone (dropdown), Status (dropdown)
    - Import COMMON_TIMEZONES from RegistrationForm.tsx
    - Default timezone: "America/New_York", default status: "active"
    - Implement escape key and click-outside-to-close
    - Submit calls POST /api/tenants
    - Show loading state on submit button
    - On success: show toast notification, call onSuccess prop to refresh list
  - [x] 3.3 Create EditTenantModal component
    - Path: `src/components/admin/TenantModal.tsx` (combined with create mode)
    - Extend CreateTenantModal with pre-populated values
    - Add logo URL fields: Mellon Logo URL, Tenant Logo URL (text inputs)
    - Submit calls PATCH /api/tenants/[id]
    - Show loading state during submission
  - [x] 3.4 Create StatusChangeDialog component
    - Path: `src/components/admin/StatusChangeDialog.tsx`
    - Confirmation dialog for status changes
    - Message: "Changing status to [X] will affect user access to this tenant"
    - Cancel and Confirm buttons
    - On confirm: call PATCH /api/tenants/[id] with new status
  - [x] 3.5 Create DeleteConfirmDialog component
    - Path: `src/components/admin/DeactivationConfirmModal.tsx` (already exists)
    - Triggered by Delete action in row menu
    - Message: "This will deactivate the tenant and revoke access for all associated users"
    - On confirm: call PATCH /api/tenants/[id] with status: "inactive"
    - No hard delete - soft delete via status change
  - [x] 3.6 Create Astro page at /admin/tenants/[id]
    - Route: `src/pages/admin/tenants/[id]/index.astro`
    - Dynamic route with tenant ID parameter
    - Use DashboardLayout wrapper
    - Verify agency_admin role
    - Fetch tenant data with associated users server-side
  - [x] 3.7 Create TenantDetail React component
    - Path: `src/components/admin/TenantDetail.tsx`
    - Header: tenant name, status badge, Edit and Delete action buttons
    - Info section: Name, Timezone, Status, Created At, Updated At
    - Users section: list associated users via memberships with link to user management
    - Links section: Branding Settings, Integration Settings, Field Mappings
    - Placeholder links display "Coming Soon" badge
  - [x] 3.8 Ensure modal and detail page tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify modals open, submit, and close correctly
    - Verify detail page renders tenant information
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- CreateTenantModal creates tenants with validation
- EditTenantModal updates tenants including logo URLs
- Status change shows confirmation dialog
- Delete triggers soft delete confirmation
- Detail page at /admin/tenants/[id] displays tenant info
- Placeholder links show "Coming Soon" badge

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review tests from Task Groups 1-3
    - Review the 4-6 tests written by API engineer (Task 1.1)
    - Review the 3-5 tests written by list view engineer (Task 2.1)
    - Review the 4-6 tests written by modal/detail engineer (Task 3.1)
    - Total existing tests: approximately 11-17 tests
  - [x] 4.2 Analyze test coverage gaps for tenant management feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows: create tenant -> view in list -> edit -> view detail
  - [x] 4.3 Write up to 8 additional strategic tests maximum
    - Integration test: full create-edit-view workflow
    - Test: tenant branding upsert works correctly
    - Test: soft delete changes status to inactive
    - Test: search and filter work together
    - Test: detail page shows correct user count
    - Focus on integration points between components
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases unless business-critical
  - [x] 4.4 Run feature-specific tests only
    - Run ONLY tests related to tenant management feature
    - Expected total: approximately 19-25 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 19-25 tests total)
- Critical user workflows for tenant management are covered
- No more than 8 additional tests added
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **API Layer (Task Group 1)** - Build API endpoints first since schema exists
   - No database changes needed (schema already has tenants, tenantBranding tables)
   - Provides backend for all frontend components

2. **Tenant List Page (Task Group 2)** - Build list view with search/filter
   - Depends on GET /api/tenants endpoint
   - Provides foundation for navigation to detail and modals

3. **Modals and Detail Page (Task Group 3)** - Complete CRUD UI
   - Depends on all API endpoints
   - Integrates with list page for modal triggers and navigation

4. **Test Review (Task Group 4)** - Fill critical testing gaps
   - Run after all features implemented
   - Focus on integration and workflow testing

---

## Technical Notes

### Existing Code to Reference
- **Table styling:** `src/components/admin/UserManagement.tsx`
- **Modal pattern:** `src/components/admin/InviteUserModal.tsx`
- **Form validation:** `src/components/forms/RegistrationForm.tsx`
- **Page layout:** `src/pages/admin/dashboard.astro`
- **StatusBadge pattern:** Already in UserManagement.tsx

### Database Schema (Already Exists)
- `tenants` table: id, name, timezone, status, createdAt, updatedAt
- `tenantBranding` table: tenantId, mellonLogoUrl, tenantLogoUrl, etc.
- `memberships` table: for user-tenant associations
- `tenantStatusEnum`: 'active', 'inactive', 'suspended'

### API Response Format
```typescript
{ success: boolean, data?: T, error?: string }
```

### Timezone Dropdown
- Import `COMMON_TIMEZONES` from RegistrationForm.tsx
- Default: "America/New_York"

### Out of Scope (Do Not Implement)
- Bulk operations (multi-select, bulk actions)
- Export functionality (CSV, Excel)
- Audit history display
- ClientTether integration settings
- Detailed branding configuration (colors, layouts)
- Field mappings configuration
- File upload widget for logos
- User assignment within tenant detail
- Pagination (client-side filtering sufficient)
