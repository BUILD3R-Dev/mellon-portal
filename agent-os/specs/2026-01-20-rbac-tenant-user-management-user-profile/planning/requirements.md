# Spec Requirements: RBAC, Tenant User Management, and User Profile

## Initial Description

This spec covers the final three items to complete Milestone 1: Foundations:

1. **Role-Based Access Control (#8)** - Enforce Agency Admin, Tenant Admin, and Tenant Viewer permissions across all routes and API endpoints

2. **Tenant User Management (#9)** - Allow Tenant Admins to invite, list, and deactivate view-only users within their tenant

3. **User Profile & Settings (#10)** - Build profile page for users to update their name and password

### Context from Existing Codebase
- This is an Astro project with React islands, Drizzle ORM, shadcn/ui
- Auth system is already implemented (Auth.js with Postgres sessions)
- User invite flow and password reset already exist
- Tenant management and branding are complete
- Database has users, tenants, memberships (tenant_users), sessions tables
- Three roles exist: Agency Admin, Tenant Admin, Tenant Viewer

## Requirements Discussion

### First Round Questions

**Q1:** For RBAC enforcement, do you have a preference for route-level vs per-endpoint vs both approaches?
**Answer:** Keep it simple - no strong preference. Go with whatever is simplest.

**Q2:** When a Tenant Viewer tries to access admin-only features, should they see a "no permission" message or should the controls be hidden entirely?
**Answer:** Hide edit controls from Tenant Viewers (don't show any indication of lack of permissions).

**Q3:** Do Agency Admins need to select a tenant context via workspace selector to view tenant-specific data?
**Answer:** Yes, Agency Admins need to select tenant context via workspace selector to view tenant-specific data.

**Q4:** Can Tenant Admins invite both `tenant_viewer` AND `tenant_admin` roles, or are they restricted to inviting viewer-only users?
**Answer:** Tenant Admins CAN invite both `tenant_viewer` AND `tenant_admin` roles (not restricted to viewer-only).

**Q5:** For user deactivation, should this be a soft-delete (set status to inactive) or a "remove from tenant" option that deletes the membership?
**Answer:** Both options: soft-delete (set status to inactive) AND "remove from tenant" option that deletes the membership.

**Q6:** Should deactivated users receive an email notification about their deactivation?
**Answer:** Silent deactivation - no email notification.

**Q7:** What fields should be editable on the user profile page, and should password changes require current password verification?
**Answer:** Profile page at `/profile` with: update display name, change password (with current password verification), email (read-only), timezone preference.

**Q8:** Should password changes invalidate all other active sessions?
**Answer:** Yes, password changes should invalidate all other active sessions.

**Q9:** What functionality should be explicitly excluded from this spec?
**Answer:** Confirmed exclusions:
- No email change functionality
- No profile photo upload
- No two-factor authentication
- No audit logging of permission changes
- No bulk user operations

### Existing Code to Reference

No similar existing features identified for reference by the user. However, the initialization notes that the following are already implemented and should be referenced:
- Auth system (Auth.js with Postgres sessions)
- User invite flow
- Password reset flow
- Tenant management and branding
- Database schema with users, tenants, memberships (tenant_users), sessions tables

### Follow-up Questions

No follow-up questions were required.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
Not applicable.

## Requirements Summary

### Functional Requirements

**Role-Based Access Control (#8):**
- Enforce permissions for three roles: Agency Admin, Tenant Admin, Tenant Viewer
- Use simplest approach for enforcement (route-level or per-endpoint based on implementation simplicity)
- Hide edit controls from Tenant Viewers entirely (no permission denied messages)
- Implement workspace selector for Agency Admins to choose tenant context
- Agency Admins must select a tenant to view tenant-specific data

**Tenant User Management (#9):**
- Tenant Admins can invite new users to their tenant
- Tenant Admins can invite users with either `tenant_viewer` OR `tenant_admin` role
- Display list of all users within a tenant
- Implement soft-delete: set user/membership status to inactive
- Implement remove from tenant: delete the tenant_users membership record
- No email notification on deactivation (silent deactivation)

**User Profile & Settings (#10):**
- Profile page accessible at `/profile` route
- Display email as read-only field
- Allow updating display name
- Allow changing password with current password verification required
- Add timezone preference setting
- Password changes must invalidate all other active sessions for the user

### Reusability Opportunities

Based on existing codebase context:
- Reuse existing Auth.js session management for session invalidation on password change
- Leverage existing user invite flow patterns for tenant user invitations
- Reference existing password reset flow for password change validation logic
- Use existing tenant management patterns for tenant context switching
- Build on existing tenant_users (memberships) table structure

### Scope Boundaries

**In Scope:**
- Role-based access control enforcement across routes/endpoints
- UI hiding of admin controls from Tenant Viewers
- Workspace/tenant selector for Agency Admins
- Tenant user invitation (both admin and viewer roles)
- Tenant user listing
- User deactivation (soft-delete to inactive status)
- User removal from tenant (membership deletion)
- User profile page at `/profile`
- Display name editing
- Password change with current password verification
- Email display (read-only)
- Timezone preference setting
- Session invalidation on password change

**Out of Scope:**
- Email change functionality
- Profile photo upload
- Two-factor authentication (2FA)
- Audit logging of permission changes
- Bulk user operations (bulk invite, bulk deactivate, etc.)
- Email notifications for deactivation

### Technical Considerations

- Astro SSR with React islands architecture
- Auth.js with Postgres session storage already implemented
- Drizzle ORM for database operations
- shadcn/ui for UI components
- Existing database tables: users, tenants, tenant_users (memberships), sessions
- Three roles already defined: Agency Admin, Tenant Admin, Tenant Viewer
- Tenant data isolation must be maintained at the data access layer
- Session security with HTTP-only cookies already in place
