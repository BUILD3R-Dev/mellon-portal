# Task Breakdown: Tenant Management & Branding System

## Overview
Total Tasks: 37

This implementation covers three related features:
1. Tenant Management CRUD (Agency Admin)
2. Tenant Branding Configuration
3. Co-Branded Layout System

## Task List

### Database Layer

#### Task Group 1: Schema Updates for Branding
**Dependencies:** None

- [x] 1.0 Complete database schema updates for branding system
  - [x] 1.1 Write 3-5 focused tests for tenant branding schema
    - Test `tenant_branding` table creation with required columns
    - Test `themeId` column accepts valid theme identifiers
    - Test `accentColorOverride` nullable column stores hex values correctly
    - Test foreign key relationship with tenants table (cascade delete)
  - [x] 1.2 Add `themeId` column to `tenant_branding` table
    - Column: `theme_id VARCHAR(50) NOT NULL DEFAULT 'light'`
    - Valid values: 'light', 'dark', 'blue', 'green'
    - Reference existing `tenant_branding` schema in `/src/lib/db/schema.ts`
  - [x] 1.3 Add `accentColorOverride` column to `tenant_branding` table
    - Column: `accent_color_override VARCHAR(7)` (nullable hex value)
    - Replaces or complements existing `accentColor` column
  - [x] 1.4 Create Drizzle migration file
    - Use `drizzle-kit generate` to create migration
    - Follow naming convention from existing migrations
    - Ensure migration is reversible
  - [x] 1.5 Ensure database layer tests pass
    - Run ONLY the 3-5 tests written in 1.1
    - Verify migration runs successfully with `drizzle-kit push`
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 1.1 pass
- `tenant_branding` table has new `themeId` and `accentColorOverride` columns
- Migration applies and rolls back cleanly
- Foreign key cascade works correctly

---

### API Layer

#### Task Group 2: Tenant CRUD API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete Tenant CRUD API endpoints
  - [x] 2.1 Write 4-6 focused tests for tenant CRUD endpoints
    - Test `POST /api/tenants` creates tenant with initial branding record
    - Test `GET /api/tenants/[id]` returns tenant with branding data
    - Test `PATCH /api/tenants/[id]` updates tenant name, timezone, status
    - Test deactivation triggers user session invalidation
    - Test agency admin authorization check (non-admin returns 403)
  - [x] 2.2 Enhance `GET /api/tenants` to include branding data
    - Add `createdAt` to response for table display
    - Follow existing response pattern: `{ success: true, data: [...] }`
    - Reference: `/src/pages/api/tenants/index.ts`
  - [x] 2.3 Create `POST /api/tenants` endpoint
    - Create new tenant with name, timezone, status
    - Auto-create `tenant_branding` record with default values
    - Validate: name required, max 255 chars
    - Return created tenant with branding
    - File: `/src/pages/api/tenants/index.ts`
  - [x] 2.4 Create `GET /api/tenants/[id]` endpoint
    - Return tenant details including full branding configuration
    - Join `tenants` and `tenant_branding` tables
    - File: `/src/pages/api/tenants/[id]/index.ts`
  - [x] 2.5 Create `PATCH /api/tenants/[id]` endpoint
    - Update tenant name, timezone, status
    - Validate: name max 255 chars if provided
    - File: `/src/pages/api/tenants/[id]/index.ts`
  - [x] 2.6 Implement tenant deactivation with session cleanup
    - When status changes to 'inactive', query memberships for tenant users
    - Call `deleteAllUserSessions()` for each user
    - Reference: `/src/lib/auth/session.ts` for session deletion pattern
  - [x] 2.7 Ensure CRUD API tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify all CRUD operations work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- All tenant CRUD operations work correctly
- Tenant creation auto-initializes branding record
- Deactivation properly invalidates user sessions
- Agency admin authorization enforced on all endpoints

---

#### Task Group 3: Branding Configuration API
**Dependencies:** Task Group 2

- [x] 3.0 Complete branding configuration API endpoints
  - [x] 3.1 Write 4-6 focused tests for branding API
    - Test `POST /api/tenants/[id]/branding` updates theme and accent color
    - Test `POST /api/tenants/[id]/logo` accepts valid image upload
    - Test logo upload rejects files exceeding 500KB
    - Test logo upload rejects invalid MIME types
    - Test `DELETE /api/tenants/[id]/logo` removes logo and clears URL
  - [x] 3.2 Create `POST /api/tenants/[id]/branding` endpoint
    - Accept: `themeId`, `accentColorOverride` (hex or null)
    - Validate themeId is one of: 'light', 'dark', 'blue', 'green'
    - Validate hex color format if provided
    - File: `/src/pages/api/tenants/[id]/branding.ts`
  - [x] 3.3 Create `POST /api/tenants/[id]/logo` endpoint
    - Accept multipart form data with image file
    - Validate MIME type: image/png, image/jpeg, image/svg+xml
    - Validate file size: max 500KB
    - Validate dimensions: max 400x150 pixels (server-side)
    - Store in `/public/uploads/logos/[tenantId]/`
    - Update `tenant_branding.tenantLogoUrl`
    - File: `/src/pages/api/tenants/[id]/logo.ts`
  - [x] 3.4 Create `DELETE /api/tenants/[id]/logo` endpoint
    - Remove file from storage
    - Set `tenant_branding.tenantLogoUrl` to null
    - File: `/src/pages/api/tenants/[id]/logo.ts`
  - [x] 3.5 Ensure branding API tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify file upload and validation work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- Branding settings save correctly
- Logo upload validates format, size, and dimensions
- Logo deletion cleans up file and database record

---

### Theme System

#### Task Group 4: Theme Configuration and CSS Variables
**Dependencies:** Task Group 3

- [x] 4.0 Complete theme system implementation
  - [x] 4.1 Write 3-4 focused tests for theme system
    - Test theme config object returns correct Tailwind color mappings
    - Test CSS variable generation for each theme
    - Test accent color override correctly supersedes theme default
  - [x] 4.2 Create theme configuration module
    - Define 4 themes as config objects: Light, Dark, Blue, Green
    - Each theme maps to Tailwind color families (gray, slate, blue, green)
    - Include: background, text, border, and default accent colors
    - File: `/src/lib/themes/config.ts`
  - [x] 4.3 Create CSS variable generator utility
    - Generate `--accent-color`, `--accent-hover`, `--accent-text`
    - Generate theme-specific background, text, border variables
    - Accept theme config and optional accent override
    - File: `/src/lib/themes/css-variables.ts`
  - [x] 4.4 Create theme provider/context for React components
    - Provide theme values to React component tree
    - Enable accent color usage in client components
    - File: `/src/lib/themes/ThemeProvider.tsx`
  - [x] 4.5 Ensure theme system tests pass
    - Run ONLY the 3-4 tests written in 4.1
    - Verify theme configuration works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-4 tests written in 4.1 pass
- 4 predefined themes with correct color mappings
- CSS variables generated correctly for any theme
- Accent color override functionality works

---

### Frontend Components - Tenant Management

#### Task Group 5: Tenant List and CRUD UI
**Dependencies:** Task Group 2

- [x] 5.0 Complete tenant management UI components
  - [x] 5.1 Write 4-6 focused tests for tenant management components
    - Test TenantManagement component renders tenant list
    - Test "Create Tenant" button opens modal
    - Test TenantModal form validation (name required)
    - Test deactivation confirmation modal appears before action
  - [x] 5.2 Create TenantManagement component
    - Reuse table pattern from `/src/components/admin/UserManagement.tsx`
    - Columns: name, status (with StatusBadge), created date
    - "Create Tenant" button in header
    - Empty state with CTA to create first tenant
    - File: `/src/components/admin/TenantManagement.tsx`
  - [x] 5.3 Create TenantModal component (create/edit)
    - Reuse modal pattern from `/src/components/admin/InviteUserModal.tsx`
    - Fields: name (required), timezone (dropdown), status (toggle)
    - Default timezone: America/New_York
    - Client-side validation with field-specific errors
    - Loading state on submit
    - File: `/src/components/admin/TenantModal.tsx`
  - [x] 5.4 Create DeactivationConfirmModal component
    - Warning message about user session invalidation
    - Confirm/Cancel actions
    - File: `/src/components/admin/DeactivationConfirmModal.tsx`
  - [x] 5.5 Add tenant row actions (edit, deactivate)
    - Edit button opens TenantModal in edit mode
    - Deactivate button opens confirmation modal
    - Integrate with TenantManagement component
  - [x] 5.6 Ensure tenant management UI tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify components render and interact correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 5.1 pass
- Tenant list displays correctly with status badges
- Create/edit modal works with validation
- Deactivation shows confirmation before proceeding

---

#### Task Group 6: Tenant Branding Configuration Page
**Dependencies:** Task Groups 3, 4

- [x] 6.0 Complete tenant branding configuration page
  - [x] 6.1 Write 3-5 focused tests for branding configuration
    - Test BrandingPage renders logo upload section
    - Test theme selector displays 4 theme options
    - Test accent color picker accepts valid hex input
    - Test save button triggers API call with correct payload
  - [x] 6.2 Create tenant branding page route
    - Route: `/admin/tenants/[id]/branding`
    - Fetch tenant data including current branding
    - Restrict to Agency Admin only
    - File: `/src/pages/admin/tenants/[id]/branding.astro`
  - [x] 6.3 Create LogoUpload component
    - File input accepting PNG, JPG, SVG
    - Client-side validation: file size (500KB), file type
    - Live preview of current/uploaded logo
    - Placeholder when no logo uploaded
    - Delete button to remove current logo
    - File: `/src/components/admin/branding/LogoUpload.tsx`
  - [x] 6.4 Create ThemeSelector component
    - Display 4 theme options with visual previews
    - Radio button or card selection pattern
    - Show theme name and color scheme preview
    - File: `/src/components/admin/branding/ThemeSelector.tsx`
  - [x] 6.5 Create AccentColorPicker component
    - Hex input field with validation
    - Color preview swatch
    - Optional: native color picker input
    - Clear button to reset to theme default
    - File: `/src/components/admin/branding/AccentColorPicker.tsx`
  - [x] 6.6 Create BrandingForm component
    - Combine LogoUpload, ThemeSelector, AccentColorPicker
    - Save button with loading state
    - Success/error notification on save
    - File: `/src/components/admin/branding/BrandingForm.tsx`
  - [x] 6.7 Ensure branding configuration tests pass
    - Run ONLY the 3-5 tests written in 6.1
    - Verify all branding components work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 6.1 pass
- Logo upload works with validation and preview
- Theme selection persists correctly
- Accent color picker validates hex input
- Save action updates branding via API

---

### Co-Branded Layout

#### Task Group 7: Layout Modifications for Co-Branding
**Dependencies:** Task Groups 4, 6

- [x] 7.0 Complete co-branded layout implementation
  - [x] 7.1 Write 3-4 focused tests for co-branded layout
    - Test header displays tenant logo when in tenant context
    - Test footer renders "Powered by Mellon Franchising" text
    - Test CSS variables are injected based on tenant branding
    - Test fallback to default Mellon branding when no tenant config
  - [x] 7.2 Update DashboardLayout header for tenant logo
    - Query tenant branding from database using `tenantId` in Astro.locals
    - Display tenant logo on left side when available
    - Keep Mellon text/logo on right side
    - Responsive sizing: max-height 40px mobile, 48px desktop
    - Reference: `/src/layouts/DashboardLayout.astro`
  - [x] 7.3 Add co-branded footer to DashboardLayout
    - "Powered by Mellon Franchising" text
    - Small Mellon logo (subtle presentation)
    - Centered layout with gray text, consistent padding
    - Apply tenant accent color as subtle accent element
    - Position after main content slot
  - [x] 7.4 Inject CSS custom properties in layout
    - Generate CSS variables from tenant branding config
    - Inject in `<head>` as inline `<style>` block
    - Include: `--accent-color`, `--accent-hover`, `--accent-text`
    - Include theme-specific background, text, border variables
  - [x] 7.5 Apply accent color to UI elements
    - Primary buttons: use `bg-[var(--accent-color)]`
    - Links: use `text-[var(--accent-color)]`
    - Section headers: apply accent color styling
    - Card borders: use `border-[var(--accent-color)]` where appropriate
    - Ensure Tailwind CSS variable syntax works correctly
  - [x] 7.6 Implement fallback for missing branding
    - Default to Mellon branding colors when tenant has no config
    - Use default theme (Light) when `themeId` is null
    - Display text "Mellon Portal" when no tenant logo
  - [x] 7.7 Ensure co-branded layout tests pass
    - Run ONLY the 3-4 tests written in 7.1
    - Verify layout displays correctly with and without tenant context
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-4 tests written in 7.1 pass
- Tenant logo displays in header when available
- Footer shows "Powered by Mellon Franchising" with logo
- CSS variables correctly applied throughout UI
- Graceful fallback to default branding

---

### Admin Pages

#### Task Group 8: Admin Navigation and Page Integration
**Dependencies:** Task Groups 5, 6, 7

- [x] 8.0 Complete admin page integration
  - [x] 8.1 Create Tenant Management admin page
    - Route: `/admin/tenants`
    - Include TenantManagement component
    - Restrict to Agency Admin only
    - Add navigation link in admin section
    - File: `/src/pages/admin/tenants/index.astro`
  - [x] 8.2 Add "Tenants" link to admin navigation
    - Add link in DashboardLayout admin nav section
    - Add link in mobile menu for admin users
    - Position appropriately among other admin links
  - [x] 8.3 Add "Configure Branding" action to tenant row
    - Link to `/admin/tenants/[id]/branding`
    - Display in tenant list row actions
    - Icon or text button style

**Acceptance Criteria:**
- Tenant management page accessible at `/admin/tenants`
- Navigation includes link to tenant management
- Each tenant row has link to branding configuration

---

### Testing

#### Task Group 9: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-8

- [x] 9.0 Review existing tests and fill critical gaps only
  - [x] 9.1 Review tests from Task Groups 1-8
    - Review the 3-5 tests written by database tasks (Task 1.1) - 6 tests
    - Review the 4-6 tests written by CRUD API tasks (Task 2.1) - 7 tests
    - Review the 4-6 tests written by branding API tasks (Task 3.1) - 6 tests
    - Review the 3-4 tests written by theme system tasks (Task 4.1) - 9 tests
    - Review the 4-6 tests written by tenant UI tasks (Task 5.1) - 10 tests
    - Review the 3-5 tests written by branding UI tasks (Task 6.1) - 10 tests
    - Review the 3-4 tests written by layout tasks (Task 7.1) - 8 tests
    - Total existing tests: 56 feature-specific tests
  - [x] 9.2 Analyze test coverage gaps for THIS feature only
    - All critical user workflows are covered by existing tests
    - Schema, API, theme system, UI components, and layout all have adequate coverage
    - No critical gaps identified requiring additional tests
  - [x] 9.3 Write up to 10 additional strategic tests maximum
    - Existing tests adequately cover all acceptance criteria
    - No additional tests needed
  - [x] 9.4 Run feature-specific tests only
    - All 160 tests pass (including 56 feature-specific tests)
    - Feature implementation verified complete

**Acceptance Criteria:**
- All feature-specific tests pass (56 tests total)
- Critical user workflows for tenant management and branding are covered
- No more than 10 additional tests added when filling gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence based on dependencies:

```
Phase 1: Foundation
  1. Database Layer (Task Group 1) - COMPLETE

Phase 2: Core API
  2. Tenant CRUD API (Task Group 2) - COMPLETE
  3. Branding API (Task Group 3) - COMPLETE
  4. Theme System (Task Group 4) - COMPLETE

Phase 3: Frontend
  5. Tenant Management UI (Task Group 5) - COMPLETE
  6. Branding Configuration Page (Task Group 6) - COMPLETE
  7. Co-Branded Layout (Task Group 7) - COMPLETE
  8. Admin Page Integration (Task Group 8) - COMPLETE

Phase 4: Quality Assurance
  9. Test Review & Gap Analysis (Task Group 9) - COMPLETE
```

## Technical Notes

### Existing Patterns to Leverage
- **Table Component:** `/src/components/admin/UserManagement.tsx` - reuse StatusBadge, table structure
- **Modal Pattern:** `/src/components/admin/InviteUserModal.tsx` - reuse form validation, accessibility
- **API Response Format:** `{ success: true, data }` or `{ success: false, error, code }`
- **Session Management:** `/src/lib/auth/session.ts` - use `deleteAllUserSessions()` for deactivation
- **Layout:** `/src/layouts/DashboardLayout.astro` - extend for co-branding

### Database Considerations
- Existing `tenant_branding` table needs `themeId` and `accentColorOverride` columns
- Use Drizzle ORM for schema updates and migrations
- Cascade delete ensures branding is removed when tenant is deleted

### File Storage
- Local storage: `/public/uploads/logos/[tenantId]/`
- Production may use S3 or similar cloud storage
- Implement file cleanup on logo deletion

### CSS Architecture
- Use CSS custom properties for theme values
- Compatible with Tailwind and shadcn/ui
- Apply via Tailwind's CSS variable syntax: `bg-[var(--accent-color)]`

## Implementation Summary

All 9 task groups have been successfully implemented:

### Files Created/Modified:

**Database:**
- `/src/lib/db/schema.ts` - Added themeId and accentColorOverride columns
- `/drizzle/0002_add_theme_branding_columns.sql` - Migration file
- `/src/lib/db/__tests__/tenant-branding-schema.test.ts` - Schema tests

**API:**
- `/src/pages/api/tenants/index.ts` - GET and POST endpoints with branding
- `/src/pages/api/tenants/[id]/index.ts` - GET and PATCH endpoints
- `/src/pages/api/tenants/[id]/branding.ts` - POST endpoint for theme settings
- `/src/pages/api/tenants/[id]/logo.ts` - POST and DELETE for logo upload
- `/src/pages/api/tenants/__tests__/tenant-crud.test.ts` - CRUD tests
- `/src/pages/api/tenants/__tests__/branding-api.test.ts` - Branding API tests

**Theme System:**
- `/src/lib/themes/config.ts` - 4 theme configurations
- `/src/lib/themes/css-variables.ts` - CSS variable generator
- `/src/lib/themes/ThemeProvider.tsx` - React context
- `/src/lib/themes/index.ts` - Module exports
- `/src/lib/themes/__tests__/theme-system.test.ts` - Theme tests

**UI Components:**
- `/src/components/admin/TenantManagement.tsx` - Main management component
- `/src/components/admin/TenantModal.tsx` - Create/edit modal
- `/src/components/admin/DeactivationConfirmModal.tsx` - Confirmation modal
- `/src/components/admin/TenantManagement.test.tsx` - Component tests
- `/src/components/admin/branding/LogoUpload.tsx` - Logo upload component
- `/src/components/admin/branding/ThemeSelector.tsx` - Theme selection
- `/src/components/admin/branding/AccentColorPicker.tsx` - Color picker
- `/src/components/admin/branding/BrandingForm.tsx` - Combined form
- `/src/components/admin/branding/BrandingForm.test.tsx` - Branding tests

**Pages:**
- `/src/pages/admin/tenants/index.astro` - Tenant management page
- `/src/pages/admin/tenants/[id]/branding.astro` - Branding config page

**Layout:**
- `/src/layouts/DashboardLayout.astro` - Updated with co-branding
- `/src/layouts/__tests__/co-branded-layout.test.ts` - Layout tests
