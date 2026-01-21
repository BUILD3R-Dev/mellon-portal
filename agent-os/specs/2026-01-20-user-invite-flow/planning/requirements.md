# Spec Requirements: User Invite Flow

## Initial Description

Build invite token generation, email sending, and registration page for new users to join via invite links. This is item #3 in the Product Roadmap (Milestone 1: Foundations) and is a medium-sized feature that enables controlled user onboarding to the multi-tenant Mellon Portal.

## Requirements Discussion

### First Round Questions

**Q1:** What should the token expiration period be for invite links?
**Answer:** 7 days

**Q2:** What URL format should be used for invite tokens?
**Answer:** Query parameter format (`/invite/accept?token=abc123`) - user preferred this approach but was open to suggestions

**Q3:** Should roles be pre-assigned at invite time, or should users select their role during registration?
**Answer:** Yes, admin pre-assigns role (agency_admin, tenant_admin, tenant_viewer) at invite time

**Q4:** For tenant user invites, should the admin be required to select which tenant the user belongs to?
**Answer:** Yes, tenant selection is required for tenant user invites (admin must select which tenant)

**Q5:** What email service should be used for sending invite emails?
**Answer:** AWS SES

**Q6:** What information should be included in the invite email content?
**Answer:** Include which tenant/organization the user is being invited to

**Q7:** What fields should be collected on the registration page?
**Answer:** Name, password (with confirmation), and auto-detect timezone from browser

**Q8:** Should admins be able to re-send invites for pending users?
**Answer:** Yes, allow re-sending invites (regenerate token, invalidate old one)

**Q9:** Any features explicitly out of scope?
**Answer:** Bulk invites, invitation tracking/analytics, and custom invite messages are out of scope

### Existing Code to Reference

**Similar Features Identified:**
- Table: `users` - Path: `src/db/schema.ts` (or similar)
  - Fields to leverage: `inviteToken`, `inviteExpiresAt`, `status` (pending/active/inactive), `name`, `email`, `timezone`
- Table: `memberships` - Path: `src/db/schema.ts` (or similar)
  - Fields to leverage: `role` (agency_admin/tenant_admin/tenant_viewer), `tenantId` (nullable for agency admins)

### Follow-up Questions

No follow-up questions were needed. User provided comprehensive answers covering all aspects of the invite flow.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
Not applicable - no visual assets were submitted for this spec.

## Requirements Summary

### Functional Requirements

**Invite Creation (Admin Side):**
- Agency admins can invite new users to the platform
- Admin must specify the user's email address
- Admin must pre-assign a role: agency_admin, tenant_admin, or tenant_viewer
- For tenant_admin and tenant_viewer roles, admin must select the target tenant
- System generates a secure invite token
- Invite tokens expire after 7 days
- Admins can re-send invites for pending users (regenerates token, invalidates old one)

**Invite Email:**
- Send invite emails via AWS SES
- Email includes the invite link with token as query parameter: `/invite/accept?token=abc123`
- Email content includes which tenant/organization the user is being invited to
- Email clearly explains next steps for the recipient

**Registration Page (Invitee Side):**
- Accessible via invite link with valid token
- Validate token exists and has not expired
- Display error for invalid or expired tokens
- Collect user information:
  - Name (required)
  - Password (required, with confirmation field)
  - Timezone (auto-detected from browser, user can override if needed)
- On successful registration:
  - Create the user account with status "active"
  - Create membership record with pre-assigned role and tenant (if applicable)
  - Invalidate the invite token
  - Log the user in and redirect to appropriate dashboard

**User Status Flow:**
- New invite creates user record with status "pending"
- Completed registration updates status to "active"
- Existing `inviteToken` and `inviteExpiresAt` fields track invite state

### Reusability Opportunities

- Leverage existing `users` table schema fields: `inviteToken`, `inviteExpiresAt`, `status`, `name`, `email`, `timezone`
- Leverage existing `memberships` table schema fields: `role`, `tenantId`
- Follow existing Auth.js patterns for session creation after registration
- Reuse shadcn/ui form components for the registration page
- Follow existing Drizzle ORM query patterns for database operations

### Scope Boundaries

**In Scope:**
- Single-user invite creation by admins
- Invite token generation with 7-day expiration
- Invite email sending via AWS SES
- Registration page with name, password, and timezone fields
- Re-send invite functionality (regenerate token)
- Role and tenant pre-assignment at invite time
- Token validation and expiration handling

**Out of Scope:**
- Bulk invites (inviting multiple users at once)
- Invitation tracking/analytics (e.g., open rates, click rates)
- Custom invite messages (personalized text per invite)
- Self-registration (all users must be invited)
- Social/OAuth registration options

### Technical Considerations

**Integration Points:**
- AWS SES for email delivery (requires SES configuration and credentials)
- Auth.js for session creation after successful registration
- Existing database schema for users and memberships tables

**Security Requirements:**
- Invite tokens must be cryptographically secure (use crypto.randomUUID or similar)
- Tokens are single-use and invalidated after registration
- Re-sending an invite invalidates any previous token
- Password must meet security requirements (to be defined in implementation)
- Registration endpoint must validate token server-side

**Technology Stack (per tech-stack.md):**
- Astro SSR with React islands for the registration page
- Tailwind CSS and shadcn/ui for styling and components
- Drizzle ORM for database operations
- TypeScript throughout

**URL Structure:**
- Invite acceptance: `GET /invite/accept?token=abc123`
- Registration form submission: `POST /invite/accept`
