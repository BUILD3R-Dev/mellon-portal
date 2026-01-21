# Specification: RBAC, Tenant User Management, and User Profile

## Goal

Complete Milestone 1: Foundations by implementing role-based access control enforcement across all routes and API endpoints, enabling Tenant Admins to manage users within their tenant, and providing a user profile page for personal settings management.

## User Stories

- As an Agency Admin, I want role-based permissions enforced across the portal so that users can only access features appropriate to their role
- As a Tenant Admin, I want to invite, list, and manage users within my tenant so that I can control access for my team
- As a user, I want to update my display name, password, and timezone preference so that I can personalize my account settings

## Specific Requirements

**RBAC Middleware Implementation**
- Create a reusable authorization helper function similar to `validateAgencyAdmin()` in `/src/pages/api/tenants/[id]/index.ts`
- Implement role-checking utilities: `requireAgencyAdmin()`, `requireTenantAdmin()`, `requireTenantAccess()`
- Return 403 Forbidden for insufficient permissions; do not reveal protected resource existence
- Middleware attaches `locals.memberships` already; leverage this for authorization checks
- Authorization helpers should accept the role requirement and current user's memberships as inputs

**Permission Enforcement per Role**
- Agency Admin: Full access to all admin routes (`/admin/*`), can view any tenant data after selecting workspace
- Tenant Admin: Access to tenant dashboard, reports, and tenant user management for their assigned tenant only
- Tenant Viewer: Read-only access to tenant dashboard and reports; all edit controls must be hidden (not disabled)
- Enforce tenant isolation at the data access layer for all tenant-scoped queries

**Workspace Selector for Agency Admins**
- Agency Admins must select a tenant context via `/select-workspace` before viewing tenant-specific data
- Store selected tenant in `tenantId` cookie (already implemented via `TENANT_COOKIE_NAME`)
- Agency Admin routes (`/admin/*`) do not require tenant context; dashboard/reports routes do
- Show workspace selector in header for Agency Admins to switch tenant context

**Tenant User Management Page**
- Create `/admin/tenants/[id]/users` route for Tenant Admins and Agency Admins to manage users
- Display user list with columns: Name/Email, Role, Status, Actions
- Tenant Admins can invite users with `tenant_admin` or `tenant_viewer` roles to their own tenant only
- Implement filtering by status (active, inactive, pending) and search by name/email

**Tenant User Invite Flow**
- Reuse existing `InviteUserModal` component pattern from `/src/components/admin/InviteUserModal.tsx`
- For Tenant Admin context, restrict role dropdown to `tenant_admin` and `tenant_viewer` only
- Pre-fill tenant ID based on context (Tenant Admin's own tenant or selected tenant for Agency Admin)
- Leverage existing `/api/invites` endpoint but add tenant context validation for Tenant Admins

**User Deactivation (Soft Delete)**
- Add "Deactivate" action that sets membership status to inactive (soft delete)
- Deactivated users cannot log in; existing sessions should be invalidated
- No email notification on deactivation (silent deactivation as per requirements)
- Show confirmation modal before deactivation using pattern from `DeactivationConfirmModal`

**User Removal from Tenant**
- Add "Remove from Tenant" action that permanently deletes the membership record
- Show warning that this action cannot be undone
- If user has no other memberships after removal, set user status to inactive
- Invalidate user's sessions after removal

**User Profile Page**
- Create `/profile` route accessible to all authenticated users
- Display email as read-only (no email change functionality)
- Editable display name field with save button
- Timezone preference dropdown using standard IANA timezone list
- Password change section with current password verification

**Password Change with Session Invalidation**
- Require current password verification before allowing password change
- Use existing `verifyPassword()` and `hashPassword()` from `/src/lib/auth/validate-user.ts`
- New password must meet minimum 8 character requirement (use `validatePassword()` pattern)
- After successful password change, invalidate all other sessions using `deleteAllUserSessions()`
- Keep current session active so user is not logged out

**Profile API Endpoint**
- Create `PATCH /api/profile` endpoint for updating name and timezone
- Create `POST /api/profile/password` endpoint for password changes
- Return appropriate error codes: 400 for validation, 401 for wrong current password
- Profile updates should update `users.updatedAt` timestamp

## Existing Code to Leverage

**Authorization Pattern from `/src/pages/api/tenants/[id]/index.ts`**
- `validateAgencyAdmin()` function demonstrates the pattern for role-based authorization
- Returns `{ isAuthorized, userId, errorResponse }` structure for clean early returns
- Should be extracted to a shared utility and extended for other role checks

**Invite System from `/src/lib/invites/index.ts`**
- `createInvite()` function handles user creation, membership creation, and email sending
- Rate limiting implemented via `checkRateLimit()`
- Extend for Tenant Admin invites by adding tenantId validation for their context

**Session Management from `/src/lib/auth/session.ts`**
- `deleteAllUserSessions()` available for invalidating sessions on password change
- `getUserMemberships()` returns memberships with tenant details for authorization
- Session validation already runs in middleware and populates `locals.memberships`

**Admin UI Components in `/src/components/admin/`**
- `TenantManagement.tsx`: Table pattern with search, filter, sort, status badges
- `InviteUserModal.tsx`: Modal pattern with form validation, loading states, success feedback
- `DeactivationConfirmModal.tsx`: Confirmation dialog pattern for destructive actions
- `StatusBadge` component for consistent status display across tables

**Password Handling from `/src/lib/auth/validate-user.ts` and `/src/lib/password-reset/index.ts`**
- `hashPassword()` and `verifyPassword()` for password operations
- `validatePassword()` for minimum length validation (8 characters)
- Pattern for updating password and clearing tokens in user record

## Out of Scope

- Email change functionality (email is read-only on profile)
- Profile photo upload
- Two-factor authentication (2FA)
- Audit logging of permission changes
- Bulk user operations (bulk invite, bulk deactivate)
- Email notifications for deactivation
- Custom role creation or permission customization
- User impersonation functionality
- Account deletion (only deactivation/removal from tenant)
- Multi-tenant membership for tenant users (one tenant per tenant user)
