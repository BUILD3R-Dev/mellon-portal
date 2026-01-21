# Task Breakdown: RBAC, Tenant User Management, and User Profile

## Overview
Total Tasks: 34

This implementation completes Milestone 1: Foundations by implementing:
1. Role-based access control (RBAC) enforcement across all routes and API endpoints
2. Tenant user management for Tenant Admins to invite, list, and manage users
3. User profile page for personal settings management

## Task List

### RBAC Foundation

#### Task Group 1: Authorization Utilities
**Dependencies:** None

- [x] 1.0 Complete RBAC authorization utilities
  - [x] 1.1 Write 4-6 focused tests for authorization helpers
    - Test `requireAgencyAdmin()` returns correct result for agency admin user
    - Test `requireTenantAdmin()` validates role and tenant access
    - Test `requireTenantAccess()` enforces tenant isolation
    - Test authorization helpers return 403 for insufficient permissions
    - Test authorization helpers return 401 for unauthenticated requests
  - [x] 1.2 Create `/src/lib/auth/authorization.ts` with role-checking utilities
    - Extract and generalize `validateAgencyAdmin()` pattern from `/src/pages/api/tenants/[id]/index.ts`
    - Implement `requireAgencyAdmin(memberships)` - checks for agency_admin role with null tenantId
    - Implement `requireTenantAdmin(memberships, tenantId)` - checks tenant_admin role for specific tenant
    - Implement `requireTenantAccess(memberships, tenantId)` - checks any role for tenant (admin or viewer)
    - Implement `hasRole(memberships, role, tenantId?)` - generic role check helper
    - Return `{ isAuthorized, membership?, errorResponse }` structure for clean early returns
  - [x] 1.3 Create authorization error response helpers
    - `createUnauthorizedResponse()` - 401 for missing/invalid session
    - `createForbiddenResponse()` - 403 for insufficient permissions (do not reveal resource existence)
    - Follow JSON response format from existing API endpoints
  - [x] 1.4 Export authorization utilities from `/src/lib/auth/index.ts`
    - Add exports for all new authorization functions
    - Ensure TypeScript types are properly exported
  - [x] 1.5 Ensure authorization utility tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify all role-checking scenarios work correctly

**Acceptance Criteria:**
- The 4-6 tests written in 1.1 pass
- Authorization utilities can be imported from `@/lib/auth`
- Functions return consistent response structure
- 403 responses do not reveal protected resource existence

---

#### Task Group 2: Route-Level RBAC Enforcement
**Dependencies:** Task Group 1

- [x] 2.0 Complete route-level RBAC enforcement
  - [x] 2.1 Write 4-6 focused tests for RBAC route protection
    - Test `/admin/*` routes reject non-agency-admin users with redirect
    - Test tenant dashboard routes require valid tenant context
    - Test Tenant Viewer cannot access edit routes
    - Test Agency Admin can access admin routes without tenant context
    - Test middleware correctly attaches authorization context to locals
  - [x] 2.2 Update `/src/middleware/index.ts` with role-based route protection
    - Add `/profile` to PROTECTED_ROUTES
    - Add route classification: `AGENCY_ADMIN_ROUTES = ['/admin']`
    - Add route classification: `TENANT_REQUIRED_ROUTES = ['/dashboard', '/reports']`
    - Check agency admin role for `/admin/*` routes, redirect to `/dashboard` if unauthorized
    - Check tenant context exists for tenant-required routes, redirect to `/select-workspace` if missing
    - Attach `locals.isAgencyAdmin`, `locals.isTenantAdmin`, `locals.isTenantViewer` boolean flags
  - [x] 2.3 Create utility function to determine user's effective role for current context
    - `getEffectiveRole(memberships, tenantId)` returns current role based on tenant context
    - Agency Admins viewing a tenant context should have full access to that tenant
    - Return role hierarchy: agency_admin > tenant_admin > tenant_viewer
  - [x] 2.4 Update protected admin pages to use authorization checks
    - Add server-side authorization check to `/src/pages/admin/dashboard.astro`
    - Add server-side authorization check to `/src/pages/admin/tenants/index.astro`
    - Add server-side authorization check to `/src/pages/admin/tenants/[id].astro`
    - Redirect unauthorized users to appropriate page
  - [x] 2.5 Ensure route-level RBAC tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify middleware correctly enforces role-based access

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- Admin routes only accessible to Agency Admins
- Tenant routes require valid tenant context
- Appropriate redirects for unauthorized access

---

### Tenant User Management

#### Task Group 3: Tenant Users API Layer
**Dependencies:** Task Group 1

- [x] 3.0 Complete tenant users API endpoints
  - [x] 3.1 Write 4-6 focused tests for tenant users API
    - Test `GET /api/tenants/[id]/users` returns user list with correct fields
    - Test `POST /api/tenants/[id]/users/invite` creates invite for valid tenant
    - Test `PATCH /api/tenants/[id]/users/[userId]/deactivate` sets membership inactive
    - Test `DELETE /api/tenants/[id]/users/[userId]` removes membership
    - Test Tenant Admin can only manage users in their own tenant
    - Test proper error responses for unauthorized access
  - [x] 3.2 Create `GET /api/tenants/[id]/users` endpoint
    - File: `/src/pages/api/tenants/[id]/users/index.ts`
    - Use `requireTenantAdmin()` or `requireAgencyAdmin()` for authorization
    - Query memberships joined with users for the specified tenant
    - Return fields: id, email, name, role, status (from user), createdAt
    - Support query params: `?status=active|inactive|pending&search=term`
    - Follow existing API response pattern from `/src/pages/api/tenants/[id]/index.ts`
  - [x] 3.3 Create `POST /api/tenants/[id]/users/invite` endpoint
    - File: `/src/pages/api/tenants/[id]/users/invite.ts`
    - Use `requireTenantAdmin()` or `requireAgencyAdmin()` for authorization
    - For Tenant Admin: validate tenantId matches their membership
    - For Tenant Admin: restrict roles to `tenant_admin` and `tenant_viewer` only
    - Leverage existing `createInvite()` from `/src/lib/invites/index.ts`
    - Pass `adminUserId` from session for rate limiting
    - Return created user data and success message
  - [x] 3.4 Create `PATCH /api/tenants/[id]/users/[userId]/deactivate` endpoint
    - File: `/src/pages/api/tenants/[id]/users/[userId]/deactivate.ts`
    - Use `requireTenantAdmin()` or `requireAgencyAdmin()` for authorization
    - Set user status to 'inactive' (soft delete)
    - Call `deleteAllUserSessions(userId)` to invalidate sessions
    - Return success response (no email notification per requirements)
  - [x] 3.5 Create `DELETE /api/tenants/[id]/users/[userId]` endpoint
    - File: `/src/pages/api/tenants/[id]/users/[userId]/index.ts`
    - Use `requireTenantAdmin()` or `requireAgencyAdmin()` for authorization
    - Delete the membership record from database
    - Check if user has other memberships; if not, set user status to 'inactive'
    - Call `deleteAllUserSessions(userId)` to invalidate sessions
    - Return success response with warning that action cannot be undone
  - [x] 3.6 Ensure tenant users API tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify all CRUD operations work correctly

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- All tenant user management endpoints work correctly
- Proper authorization enforced (Tenant Admin restricted to own tenant)
- Session invalidation occurs on deactivation/removal

---

#### Task Group 4: Tenant User Management UI
**Dependencies:** Task Group 3

- [x] 4.0 Complete tenant user management UI components
  - [x] 4.1 Write 4-6 focused tests for tenant user management UI
    - Test `TenantUserManagement` renders user list correctly
    - Test invite modal submits correct data for Tenant Admin context
    - Test deactivation confirmation modal shows warning and submits
    - Test removal confirmation modal shows permanent action warning
    - Test search and status filter functionality
  - [x] 4.2 Create `/src/pages/admin/tenants/[id]/users.astro` page
    - Add server-side authorization: require Tenant Admin or Agency Admin
    - Fetch initial users list via server-side query
    - Pass `tenantId`, `tenantName`, `initialUsers`, `userRole` to React component
    - Use layout pattern from `/src/pages/admin/tenants/[id].astro`
  - [x] 4.3 Create `/src/components/admin/TenantUserManagement.tsx` component
    - Follow pattern from `TenantManagement.tsx` for table structure
    - Columns: Name/Email, Role, Status, Actions
    - Include search input (search by name/email)
    - Include status filter dropdown (all, active, inactive, pending)
    - Include sort functionality on columns
    - Use `StatusBadge` pattern for user status display
    - Show "Invite User" button in header
  - [x] 4.4 Create `/src/components/admin/TenantUserInviteModal.tsx` component
    - Adapt `InviteUserModal.tsx` pattern for tenant context
    - Props: `isOpen`, `onClose`, `onSuccess`, `tenantId`, `tenantName`, `allowedRoles`
    - For Tenant Admin context: show only `tenant_admin` and `tenant_viewer` roles
    - For Agency Admin context: show all roles
    - Pre-fill tenant (read-only) based on context
    - Submit to `POST /api/tenants/[id]/users/invite`
    - Show success state with "Invite another" option
  - [x] 4.5 Create `/src/components/admin/UserDeactivationModal.tsx` component
    - Adapt `DeactivationConfirmModal.tsx` pattern for user context
    - Props: `isOpen`, `onClose`, `onConfirm`, `userName`, `userEmail`, `isLoading`
    - Warning: "User will be logged out immediately and cannot log in"
    - Note: "User data will be preserved and can be reactivated later"
    - Buttons: Cancel, Deactivate User
  - [x] 4.6 Create `/src/components/admin/UserRemovalModal.tsx` component
    - Similar to deactivation modal but with stronger warning
    - Props: `isOpen`, `onClose`, `onConfirm`, `userName`, `userEmail`, `isLoading`
    - Warning: "This action cannot be undone"
    - Warning: "User will be permanently removed from this tenant"
    - Require typing user email to confirm (destructive action pattern)
    - Buttons: Cancel, Remove from Tenant (red/destructive)
  - [x] 4.7 Implement action handlers in TenantUserManagement
    - Handle invite success: add user to list, show notification
    - Handle deactivate: call API, update user status in list
    - Handle remove: call API, remove user from list
    - Show appropriate loading states during API calls
    - Display success/error notifications using existing pattern
  - [x] 4.8 Ensure tenant user management UI tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify component rendering and interactions

**Acceptance Criteria:**
- The 4-6 tests written in 4.1 pass
- User list displays correctly with all columns
- Invite modal restricts roles appropriately per user context
- Deactivation and removal modals show appropriate warnings
- Actions update UI state correctly

---

### User Profile

#### Task Group 5: Profile API Layer
**Dependencies:** Task Group 1

- [x] 5.0 Complete user profile API endpoints
  - [x] 5.1 Write 4-6 focused tests for profile API
    - Test `GET /api/profile` returns current user data
    - Test `PATCH /api/profile` updates name and timezone
    - Test `POST /api/profile/password` requires current password verification
    - Test `POST /api/profile/password` validates new password minimum length
    - Test `POST /api/profile/password` invalidates other sessions on success
    - Test proper error codes (400 validation, 401 wrong password)
  - [x] 5.2 Create `GET /api/profile` endpoint
    - File: `/src/pages/api/profile/index.ts`
    - Require authenticated session (use `locals.user`)
    - Return user data: id, email, name, timezone, createdAt, updatedAt
    - Do not return sensitive fields (passwordHash, tokens)
  - [x] 5.3 Create `PATCH /api/profile` endpoint
    - File: `/src/pages/api/profile/index.ts` (add PATCH handler)
    - Require authenticated session
    - Accept body: `{ name?: string, timezone?: string }`
    - Validate name is non-empty string if provided
    - Validate timezone is valid IANA timezone if provided
    - Update `users.updatedAt` timestamp
    - Return updated user data
  - [x] 5.4 Create `POST /api/profile/password` endpoint
    - File: `/src/pages/api/profile/password.ts`
    - Require authenticated session
    - Accept body: `{ currentPassword, newPassword, confirmPassword }`
    - Verify current password using `verifyPassword()` from `/src/lib/auth/validate-user.ts`
    - Validate new password meets minimum 8 character requirement using `validatePassword()`
    - Validate newPassword matches confirmPassword
    - Hash new password using `hashPassword()`
    - Update user record with new passwordHash
    - Get current session token from cookie
    - Call `deleteAllUserSessions(userId)` then recreate current session
    - Return success response
  - [x] 5.5 Ensure profile API tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify all profile operations work correctly

**Acceptance Criteria:**
- The 4-6 tests written in 5.1 pass
- Profile read and update operations work correctly
- Password change requires valid current password
- Other sessions invalidated on password change (current session preserved)

---

#### Task Group 6: User Profile UI
**Dependencies:** Task Group 5

- [x] 6.0 Complete user profile UI components
  - [x] 6.1 Write 4-6 focused tests for profile UI
    - Test `ProfilePage` renders user info correctly
    - Test display name form submits and shows success
    - Test timezone selector updates preference
    - Test password change form validates current password
    - Test password change form enforces minimum length
  - [x] 6.2 Create `/src/pages/profile.astro` page
    - Add to PROTECTED_ROUTES in middleware (already done in Task Group 2)
    - Fetch current user data from `locals.user`
    - Pass user data to React component
    - Use authenticated layout pattern
  - [x] 6.3 Create `/src/components/profile/ProfilePage.tsx` component
    - Display email as read-only field (styled as disabled input)
    - Section: Personal Information (name, timezone)
    - Section: Security (password change)
    - Use card-based layout for each section
    - Include success/error notification display
  - [x] 6.4 Create `/src/components/profile/PersonalInfoForm.tsx` component
    - Editable display name field
    - Timezone dropdown using IANA timezone list (common timezones)
    - Save button with loading state
    - Submit to `PATCH /api/profile`
    - Show inline success message on save
  - [x] 6.5 Create `/src/components/profile/PasswordChangeForm.tsx` component
    - Current password field (required)
    - New password field with minimum length indicator
    - Confirm password field with match validation
    - Submit to `POST /api/profile/password`
    - Show validation errors inline
    - Show success message: "Password updated. Other sessions have been logged out."
    - Clear form on success
  - [x] 6.6 Create timezone data utility
    - File: `/src/lib/utils/timezones.ts`
    - Export common IANA timezone list with display labels
    - Group by region (Americas, Europe, Asia, etc.)
    - Include user's current timezone at top if not in common list
  - [x] 6.7 Ensure profile UI tests pass
    - Run ONLY the 4-6 tests written in 6.1
    - Verify component rendering and form submissions

**Acceptance Criteria:**
- The 4-6 tests written in 6.1 pass
- Profile page displays user information correctly
- Name and timezone can be updated
- Password change validates and provides feedback
- Email shown as read-only

---

### Workspace Selector Enhancement

#### Task Group 7: Agency Admin Workspace Selector
**Dependencies:** Task Group 2

- [x] 7.0 Complete workspace selector for Agency Admins
  - [x] 7.1 Write 2-4 focused tests for workspace selector
    - Test workspace selector appears for Agency Admins in header
    - Test workspace selector is hidden for non-Agency Admins
    - Test selecting workspace updates tenant context cookie
    - Test current workspace name displays in selector
  - [x] 7.2 Create `/src/components/layout/WorkspaceSelector.tsx` component
    - Show current tenant name or "Select Workspace" if none selected
    - Dropdown with list of all tenants (fetch from API or pass as props)
    - On selection: set `tenantId` cookie via `TENANT_COOKIE_NAME`
    - On selection: redirect to current page to refresh context
    - Include visual indicator (chevron, building icon)
  - [x] 7.3 Update header component to include WorkspaceSelector
    - Only show for Agency Admins (`locals.isAgencyAdmin`)
    - Pass current tenant name from `locals.tenantId` lookup
    - Position appropriately in header layout
  - [x] 7.4 Create `GET /api/tenants/list` endpoint for workspace selector
    - File: `/src/pages/api/tenants/list.ts`
    - Require Agency Admin authorization
    - Return minimal tenant data: id, name, status
    - Filter to active tenants only
    - Used by WorkspaceSelector to populate dropdown
  - [x] 7.5 Ensure workspace selector tests pass
    - Run ONLY the 2-4 tests written in 7.1
    - Verify selector appears and functions correctly

**Acceptance Criteria:**
- The 2-4 tests written in 7.1 pass
- Workspace selector visible only for Agency Admins
- Tenant context updates correctly on selection
- Current workspace clearly indicated

---

### Testing and Integration

#### Task Group 8: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-7

- [x] 8.0 Review existing tests and fill critical gaps only
  - [x] 8.1 Review tests from Task Groups 1-7
    - Review the tests written by each task group (approximately 24-34 tests)
    - Verify test coverage for authorization utilities (Task 1.1)
    - Verify test coverage for route-level RBAC (Task 2.1)
    - Verify test coverage for tenant users API (Task 3.1)
    - Verify test coverage for tenant user management UI (Task 4.1)
    - Verify test coverage for profile API (Task 5.1)
    - Verify test coverage for profile UI (Task 6.1)
    - Verify test coverage for workspace selector (Task 7.1)
  - [x] 8.2 Analyze test coverage gaps for THIS feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to RBAC, tenant user management, and profile features
    - Prioritize end-to-end workflows: invite -> accept -> login -> manage
    - Check integration between RBAC and UI components
  - [x] 8.3 Write up to 8 additional strategic tests maximum
    - Add integration test: Agency Admin can invite and manage users across tenants
    - Add integration test: Tenant Admin restricted to their own tenant's users
    - Add integration test: Password change invalidates sessions correctly
    - Add integration test: Deactivated user cannot log in
    - Add integration test: Removed user loses access immediately
    - Focus on security-critical paths (authorization boundaries)
    - Do NOT write exhaustive coverage for all edge cases
  - [x] 8.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's features
    - Expected total: approximately 32-42 tests maximum
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 32-42 tests total)
- Critical authorization boundaries are tested
- User lifecycle flows (invite, deactivate, remove) are covered
- No more than 8 additional tests added

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: RBAC Foundation
  1. Authorization Utilities (Task Group 1) - No dependencies
  2. Route-Level RBAC Enforcement (Task Group 2) - Depends on 1

Phase 2: Tenant User Management
  3. Tenant Users API Layer (Task Group 3) - Depends on 1
  4. Tenant User Management UI (Task Group 4) - Depends on 3

Phase 3: User Profile
  5. Profile API Layer (Task Group 5) - Depends on 1
  6. User Profile UI (Task Group 6) - Depends on 5

Phase 4: Integration
  7. Workspace Selector Enhancement (Task Group 7) - Depends on 2
  8. Test Review and Gap Analysis (Task Group 8) - Depends on all
```

### Parallel Execution Opportunities

The following task groups can be executed in parallel after Task Group 1 completes:
- Task Group 2 (Route RBAC) and Task Group 3 (Tenant Users API) can run in parallel
- Task Group 5 (Profile API) can run in parallel with Task Groups 3-4

### Key Files Reference

**Existing patterns to follow:**
- Authorization: `/src/pages/api/tenants/[id]/index.ts` - `validateAgencyAdmin()` pattern
- Invites: `/src/lib/invites/index.ts` - `createInvite()` function
- Session management: `/src/lib/auth/session.ts` - `deleteAllUserSessions()`
- Password handling: `/src/lib/auth/validate-user.ts` - `verifyPassword()`, `hashPassword()`
- Password validation: `/src/lib/password-reset/index.ts` - `validatePassword()`
- UI Table: `/src/components/admin/TenantManagement.tsx` - search, filter, sort, actions
- UI Modal: `/src/components/admin/InviteUserModal.tsx` - form validation, success state
- UI Confirmation: `/src/components/admin/DeactivationConfirmModal.tsx` - destructive action pattern
- Middleware: `/src/middleware/index.ts` - route protection pattern

**New files to create:**
- `/src/lib/auth/authorization.ts` - RBAC utilities
- `/src/pages/api/tenants/[id]/users/index.ts` - List users endpoint
- `/src/pages/api/tenants/[id]/users/invite.ts` - Invite endpoint
- `/src/pages/api/tenants/[id]/users/[userId]/index.ts` - Remove user endpoint
- `/src/pages/api/tenants/[id]/users/[userId]/deactivate.ts` - Deactivate endpoint
- `/src/pages/api/profile/index.ts` - Profile read/update endpoint
- `/src/pages/api/profile/password.ts` - Password change endpoint
- `/src/pages/api/tenants/list.ts` - Tenant list for workspace selector
- `/src/pages/admin/tenants/[id]/users.astro` - User management page
- `/src/pages/profile.astro` - Profile page
- `/src/components/admin/TenantUserManagement.tsx` - User list component
- `/src/components/admin/TenantUserInviteModal.tsx` - Tenant invite modal
- `/src/components/admin/UserDeactivationModal.tsx` - User deactivation modal
- `/src/components/admin/UserRemovalModal.tsx` - User removal modal
- `/src/components/profile/ProfilePage.tsx` - Profile page component
- `/src/components/profile/PersonalInfoForm.tsx` - Name/timezone form
- `/src/components/profile/PasswordChangeForm.tsx` - Password change form
- `/src/components/layout/WorkspaceSelector.tsx` - Workspace dropdown
- `/src/lib/utils/timezones.ts` - Timezone data
