# Spec Requirements: Tenant Management (Agency Admin)

## Initial Description
Create CRUD interface for agency admins to create, view, update, and delete tenants (franchise brands).

This is for the Mellon Franchising Client Portal - a multi-tenant portal for franchise brand clients. From the PRD:
- Mellon Agency Admin/Staff creates and manages tenants (franchise brands)
- Tenant = franchise brand with isolated data and branding settings
- Tenant settings include: Name, timezone, branding (logos, colors), ClientTether integration settings

## Requirements Discussion

### First Round Questions

**Q1:** What columns and information should be displayed in the tenant list view?
**Answer:** Table layout similar to User Management with columns: Name, Status, Timezone, Created Date. Include search and filter capabilities.

**Q2:** What fields are required when creating a new tenant?
**Answer:** Modal form with Name (required), Timezone (dropdown, default "America/New_York"), Status (default "active"). ClientTether Web Key is NOT included in this form - it belongs in a separate Integration Settings feature.

**Q3:** Should branding configuration (logos, colors) be part of the tenant create/edit form?
**Answer:** Include basic logo upload in tenant edit form only. Detailed branding configuration (colors, layouts) is handled by separate roadmap item #6 (Tenant Branding Configuration).

**Q4:** How should field mappings be handled?
**Answer:** Field mappings are a separate feature/sub-page, not part of this CRUD interface.

**Q5:** Should there be confirmation dialogs for status changes?
**Answer:** Yes, confirmation dialogs when changing status between active/inactive/suspended states.

**Q6:** How should tenant deletion work?
**Answer:** Prevent hard deletion. Use soft delete approach by changing status to inactive, with confirmation dialog explaining the action.

**Q7:** Should there be a tenant detail view separate from the edit form?
**Answer:** Yes, a dedicated detail page at `/admin/tenants/[id]` showing tenant info, associated users, and links to branding/integrations sections.

**Q8:** What functionality should be excluded from this feature?
**Answer:** Bulk operations, export functionality, audit history display, ClientTether integration settings, detailed branding configuration, and field mappings configuration are all out of scope.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: User Management - Path: `src/components/admin/UserManagement.tsx`
- Feature: Invite Modal - Path: `src/components/admin/InviteUserModal.tsx`
- Feature: Registration Form - Path: `src/components/auth/RegistrationForm.tsx`
- Components to potentially reuse: Table styling with status badges, modal form patterns
- Backend logic to reference: Admin dashboard layout at `/admin/dashboard`

### Follow-up Questions
No follow-up questions were needed - requirements were clearly defined in initial answers.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files were provided for analysis.

## Requirements Summary

### Functional Requirements

**Tenant List View:**
- Table-based layout matching User Management styling
- Columns: Name, Status (with badge), Timezone, Created Date
- Search functionality for filtering tenants by name
- Filter by status (active/inactive/suspended)
- Sortable columns

**Create Tenant Flow:**
- Modal-based form (similar to InviteUserModal pattern)
- Fields:
  - Name (required, text input)
  - Timezone (dropdown, default "America/New_York")
  - Status (dropdown, default "active")
- Form validation with error messages
- Success/error toast notifications

**Edit Tenant Flow:**
- Same modal form as create, pre-populated with existing values
- Additional field: Basic logo upload (Mellon logo, tenant logo)
- Logo upload stores URL to tenantBranding table

**Tenant Detail View:**
- Dedicated page at `/admin/tenants/[id]`
- Display tenant information (name, timezone, status, created/updated dates)
- List of associated users with links to user management
- Navigation links to:
  - Branding settings (roadmap item #6)
  - Integration settings (future feature)
  - Field mappings (future feature)

**Status Management:**
- Support transitions between: active, inactive, suspended
- Confirmation dialog for all status changes
- Dialog explains the impact of the status change

**Soft Delete:**
- No hard delete option in UI
- "Delete" action triggers confirmation dialog
- Confirmation explains tenant will be deactivated (status set to inactive)
- Associated users are not deleted but lose access

### Reusability Opportunities
- Table component patterns from UserManagement.tsx
- Modal form structure from InviteUserModal.tsx
- Form validation patterns from RegistrationForm.tsx
- Status badge styling from existing admin components
- Admin page layout from `/admin/dashboard`

### Scope Boundaries

**In Scope:**
- Tenant list view with search/filter
- Create tenant modal form
- Edit tenant modal form with basic logo upload
- Tenant detail page at `/admin/tenants/[id]`
- Status change confirmation dialogs
- Soft delete with confirmation dialog
- Navigation to related settings (as links only)

**Out of Scope:**
- Bulk operations (multi-select, bulk status change)
- Export functionality (CSV, Excel)
- Audit history display (who changed what, when)
- ClientTether Web Key and integration settings (separate feature)
- Detailed branding configuration - colors, header layouts (roadmap item #6)
- Field mappings configuration (separate feature)
- User assignment/management within tenant detail (handled by User Management)

### Technical Considerations

**Database Schema:**
- `tenants` table: id, name, timezone, status, createdAt, updatedAt
- `tenantBranding` table: tenantId, mellonLogoUrl, tenantLogoUrl, primaryColor, accentColor, headerLayout, updatedAt
- Note: clienttetherWebKey exists in schema but is NOT exposed in this UI

**Routes:**
- `/admin/tenants` - List view page
- `/admin/tenants/[id]` - Detail view page
- API endpoints for CRUD operations

**Tech Stack:**
- Astro SSR page with React islands for interactive components
- Drizzle ORM for database queries
- shadcn/ui components (Table, Dialog, Form, Input, Select, Button)
- Tailwind CSS for styling

**Integration Points:**
- Auth.js session for agency admin verification
- Existing admin layout and navigation
- Tenant-scoped queries pattern for associated users

**Similar Code Patterns to Follow:**
- UserManagement.tsx for table rendering and state management
- InviteUserModal.tsx for modal form pattern
- RegistrationForm.tsx for form validation approach
