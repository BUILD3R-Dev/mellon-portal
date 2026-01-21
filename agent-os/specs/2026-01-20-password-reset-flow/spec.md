# Specification: Password Reset Flow

## Goal

Enable users to securely reset their password through a forgot password request, email-based token verification, and automatic login after successful reset.

## User Stories

- As a user who has forgotten my password, I want to request a password reset email so that I can regain access to my account
- As a pending user whose invite email did not arrive, I want to reset my password so that I can complete my account setup through an alternative path

## Specific Requirements

**Forgot Password Page**
- Create page at `src/pages/forgot-password.astro` with email input form
- Display same success message regardless of whether email exists in system to prevent email enumeration attacks
- Success message: "If an account exists with this email, you will receive a password reset link shortly"
- Style consistently with login page using centered card layout and same form input styling
- Include link back to login page

**Reset Token Generation**
- Add `resetToken` (text, nullable) and `resetExpiresAt` (timestamp, nullable) columns to users table via migration
- Generate cryptographically secure token using `crypto.randomUUID()`
- Set token expiration to 1 hour from creation time
- Clear any existing reset token before generating new one
- Allow token generation for users with any status (active, pending, inactive)

**Password Reset Email**
- Send email via AWS SES using same configuration and patterns as User Invite Flow
- Use email service module at `src/lib/email/ses.ts`
- Email subject: "Reset your Mellon Portal password"
- Email body includes: reset link, expiration notice (1 hour), "ignore if you did not request this" message
- Reset link format: `{BASE_URL}/reset-password?token={resetToken}`
- Use HTML email template with plain text fallback

**Reset Password Page**
- Create page at `src/pages/reset-password.astro` that handles password reset
- Read token from query parameter on page load
- Validate token exists and has not expired (server-side)
- Display clear error message for invalid or expired tokens with link to request new reset
- Show password and password confirmation form fields
- Style consistently with login page design

**Password Update and Validation**
- Create `POST /api/auth/reset-password` endpoint to process password reset
- Validate token exists and has not expired (server-side validation)
- Validate password meets requirements: minimum 8 characters
- Hash password using bcrypt before storing in `passwordHash` field
- Clear `resetToken` and `resetExpiresAt` after successful reset
- Update user status to 'active' if currently 'pending' (enables invite alternative path)

**Automatic Login After Reset**
- Create session using Better Auth after successful password update
- Follow same session creation patterns as Authentication System spec
- Redirect to appropriate destination based on user memberships (same routing logic as login)
- Agency admin redirects to `/admin/dashboard`
- Single tenant user redirects to `/dashboard`
- Multi-tenant user redirects to `/select-workspace`

**API Endpoints**
- `POST /api/auth/forgot-password` - Accept email, generate token, send email, return success (regardless of email existence)
- `POST /api/auth/reset-password` - Accept token and new password, validate, update password, create session
- Follow RESTful conventions with appropriate HTTP status codes

## Visual Design

No visual assets provided. Follow existing design patterns from `src/pages/login.astro` for both forgot password and reset password pages, using the same card-based centered layout, form styling, and input components.

## Existing Code to Leverage

**Database Schema (`src/lib/db/schema.ts`)**
- `users` table already has `passwordHash`, `status`, `inviteToken`, `inviteExpiresAt` fields as reference pattern
- Same column pattern will be used for `resetToken` and `resetExpiresAt`
- `sessions` table available for session creation after reset

**Login Page (`src/pages/login.astro`)**
- Replicate the centered card layout and form styling for forgot password and reset password pages
- Same Tailwind classes for inputs: `w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900`
- Same button styling: `w-full px-4 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800`
- Already contains "Forgot password?" link pointing to `/forgot-password`

**User Invite Flow Spec (`agent-os/specs/2026-01-20-user-invite-flow/`)**
- AWS SES email service configuration and patterns at `src/lib/email/ses.ts`
- Token generation using `crypto.randomUUID()`
- Password validation (minimum 8 characters)
- HTML email template structure with plain text fallback

**Authentication System Spec (`agent-os/specs/2026-01-20-authentication-system/`)**
- Better Auth session creation patterns
- Post-login routing logic based on user memberships
- Session storage configuration

## Out of Scope

- Rate limiting on forgot password requests
- Security questions for identity verification
- Email notification after successful password reset
- Account lockout policies
- Password strength meter or complexity requirements beyond 8 character minimum
- Password history (preventing reuse of old passwords)
- Invalidation of existing sessions after password reset
- Admin ability to trigger password reset for users
- Audit logging of password reset events
- Custom reset email templates per tenant
