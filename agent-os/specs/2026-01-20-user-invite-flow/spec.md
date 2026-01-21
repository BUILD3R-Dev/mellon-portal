# Specification: User Invite Flow

## Goal

Enable controlled user onboarding to the Mellon Portal through admin-generated invite links with pre-assigned roles and tenants, secure token validation, and a streamlined registration page.

## User Stories

- As an agency admin, I want to invite new users with pre-assigned roles so that I can control who has access to the portal and what they can do
- As a franchise brand contact, I want to receive an invite email and complete registration easily so that I can access my organization's performance data

## Specific Requirements

**Invite Creation API Endpoint**
- Create `POST /api/invites` endpoint for agency admins to generate invites
- Request body includes: email (required), role (agency_admin | tenant_admin | tenant_viewer), tenantId (required for tenant roles)
- Generate cryptographically secure token using `crypto.randomUUID()`
- Set `inviteExpiresAt` to 7 days from creation time
- Create user record with `status = 'pending'` and store `inviteToken` and `inviteExpiresAt`
- Create membership record with the specified role and tenantId (null for agency_admin)
- Return 400 if email already exists with active status
- For existing pending users, allow re-invite (regenerate token, reset expiration)

**Invite Email Sending**
- Configure AWS SES client with credentials from environment variables (AWS_SES_REGION, AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY)
- Create email service module at `src/lib/email/ses.ts` for sending emails
- Email subject: "You've been invited to Mellon Portal"
- Email body includes: invite link, tenant/organization name (for tenant users), expiration notice (7 days), clear call-to-action
- Invite link format: `{BASE_URL}/invite/accept?token={inviteToken}`
- Use HTML email template with plain text fallback
- Handle SES errors gracefully and return appropriate API error response

**Registration Page**
- Create page at `src/pages/invite/accept.astro` that handles the invite acceptance flow
- On page load, validate token exists via query parameter and is not expired
- Display error page with clear message for invalid or expired tokens
- Show the user's pre-assigned role and tenant name (if applicable) on the registration form
- Form fields: name (required), password (required), password confirmation (required), timezone (auto-detected, editable)

**Timezone Auto-Detection**
- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` in browser to detect user timezone
- Pre-fill timezone field with detected value
- Provide dropdown of common timezones for manual override (use IANA timezone database format)
- Store timezone in user record for future date/time formatting

**Registration Form Submission**
- Create `POST /api/invite/accept` endpoint to process registration
- Validate token exists and has not expired (server-side validation)
- Validate password meets requirements: minimum 8 characters
- Hash password using bcrypt before storing in `passwordHash` field
- Update user record: set name, passwordHash, timezone, status to 'active', clear inviteToken and inviteExpiresAt
- Create session using Better Auth (coordinate with Authentication System spec)
- Return redirect URL based on membership role (same logic as login routing)

**Re-send Invite Functionality**
- Create `POST /api/invites/{userId}/resend` endpoint for agency admins
- Validate user exists and has `status = 'pending'`
- Generate new token and reset expiration to 7 days from now
- Invalidate previous token by overwriting it
- Send new invite email with updated link
- Return 404 if user not found, 400 if user is not in pending status

**Admin Invite UI**
- Add "Invite User" button to agency admin user management interface
- Create invite modal/form with fields: email, role selector, tenant selector (conditional)
- Show tenant selector only when role is tenant_admin or tenant_viewer
- Display success message with option to copy invite link
- Add "Resend Invite" action button for users with pending status in user list

**Token Security**
- Tokens are single-use and cleared upon successful registration
- Expired tokens cannot be used (enforce via server-side check)
- Token lookup queries must be timing-safe to prevent enumeration
- Rate limit invite creation to prevent abuse (10 invites per hour per admin)

## Visual Design

No visual assets provided. Follow existing design patterns from `src/pages/login.astro` for the registration page, using the same card-based centered layout, form styling, and input components.

## Existing Code to Leverage

**Database Schema (`src/lib/db/schema.ts`)**
- `users` table already has `inviteToken` (text), `inviteExpiresAt` (timestamp), `status` (user_status enum with pending/active/inactive), `name`, `email`, `passwordHash` fields
- `memberships` table has `role` (membership_role enum), `tenantId` (nullable for agency admins), `userId` foreign key
- `tenants` table for looking up tenant names to display in invite emails and registration page

**Database Client (`src/lib/db/index.ts`)**
- Drizzle ORM client exported as `db` with schema
- Use for all database queries following existing patterns

**Login Page (`src/pages/login.astro`)**
- Replicate the centered card layout, form styling, and input field design for the registration page
- Same Tailwind classes for inputs: `w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900`
- Same button styling: `w-full px-4 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800`

**UI Components (`src/components/ui/`)**
- `Button.tsx` with variant props for consistent button styling
- `Card.tsx` components for form containers

**Authentication System Spec (`agent-os/specs/2026-01-20-authentication-system/`)**
- Coordinate session creation after registration with Better Auth configuration
- Use same session storage and cookie settings defined in auth spec
- Follow same post-login routing logic for redirecting based on role/memberships

## Out of Scope

- Bulk invites (inviting multiple users in a single operation)
- Invitation tracking/analytics (open rates, click rates, conversion metrics)
- Custom invite messages (personalized text per invite)
- Self-registration (all users must be invited by an admin)
- OAuth/social registration options
- Invite link previews or OG meta tags
- Email template customization per tenant
- Invite expiration extension or modification
- Admin notification when invite is accepted
- Audit logging of invite events (may be added separately)
