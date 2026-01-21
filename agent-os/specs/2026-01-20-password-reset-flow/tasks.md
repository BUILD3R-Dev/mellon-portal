# Task Breakdown: Password Reset Flow

## Overview
Total Tasks: 4 Task Groups

This feature enables users to securely reset their password through a forgot password request, email-based token verification, and automatic login after successful reset.

## Task List

### Database Layer

#### Task Group 1: Database Schema Extension
**Dependencies:** None

- [x] 1.0 Complete database layer for password reset tokens
  - [x] 1.1 Write 2-4 focused tests for password reset token functionality
    - Test that resetToken and resetExpiresAt can be set on a user record
    - Test that resetToken can be cleared (set to null)
    - Test that resetExpiresAt correctly stores timestamp values
  - [x] 1.2 Create migration to add reset token columns to users table
    - Add `resetToken` column (text, nullable)
    - Add `resetExpiresAt` column (timestamp, nullable)
    - Follow same pattern as existing `inviteToken` and `inviteExpiresAt` columns
    - Migration file: `src/lib/db/migrations/XXXX_add_reset_token_to_users.ts`
  - [x] 1.3 Update users schema definition
    - Add resetToken and resetExpiresAt to schema at `src/lib/db/schema.ts`
    - Ensure types match migration (text nullable, timestamp nullable)
  - [x] 1.4 Ensure database layer tests pass
    - Run ONLY the 2-4 tests written in 1.1
    - Verify migration runs successfully
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- Migration adds resetToken and resetExpiresAt columns to users table
- Schema correctly defines new nullable columns
- Migration is reversible

---

### API Layer

#### Task Group 2: Password Reset API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer for password reset flow
  - [x] 2.1 Write 4-8 focused tests for API endpoints
    - Test POST /api/auth/forgot-password returns success regardless of email existence
    - Test POST /api/auth/forgot-password generates token for existing user
    - Test POST /api/auth/reset-password validates token exists
    - Test POST /api/auth/reset-password rejects expired tokens
    - Test POST /api/auth/reset-password validates password minimum 8 characters
    - Test POST /api/auth/reset-password successfully updates password and clears token
    - Test POST /api/auth/reset-password creates session after success
    - Test POST /api/auth/reset-password updates pending user status to active
  - [x] 2.2 Create forgot-password API endpoint
    - Create `POST /api/auth/forgot-password` at `src/pages/api/auth/forgot-password.ts`
    - Accept email in request body
    - Look up user by email (any status: active, pending, inactive)
    - Generate cryptographically secure token using `crypto.randomUUID()`
    - Set token expiration to 1 hour from creation time
    - Clear any existing reset token before generating new one
    - Store resetToken and resetExpiresAt in users table
    - Return success response regardless of email existence (prevent enumeration)
    - Return appropriate HTTP status codes (200 for success)
  - [x] 2.3 Implement password reset email sending
    - Use AWS SES email service at `src/lib/email/ses.ts`
    - Follow same patterns as User Invite Flow email sending
    - Email subject: "Reset your Mellon Portal password"
    - Email body includes: reset link, 1 hour expiration notice, "ignore if not requested" message
    - Reset link format: `{BASE_URL}/reset-password?token={resetToken}`
    - Use HTML email template with plain text fallback
    - Only send email if user exists (but return same success response either way)
  - [x] 2.4 Create reset-password API endpoint
    - Create `POST /api/auth/reset-password` at `src/pages/api/auth/reset-password.ts`
    - Accept token and newPassword in request body
    - Validate token exists in database
    - Validate token has not expired (compare resetExpiresAt with current time)
    - Validate password meets minimum 8 character requirement
    - Hash password using bcrypt before storing in passwordHash field
    - Clear resetToken and resetExpiresAt after successful reset
    - Update user status to 'active' if currently 'pending'
    - Return appropriate HTTP status codes (200 success, 400 validation error, 404 invalid token)
  - [x] 2.5 Implement automatic login after password reset
    - Create session using Better Auth after successful password update
    - Follow same session creation patterns as Authentication System spec
    - Include redirect destination in response based on user memberships
    - Agency admin returns redirect to `/admin/dashboard`
    - Single tenant user returns redirect to `/dashboard`
    - Multi-tenant user returns redirect to `/select-workspace`
  - [x] 2.6 Ensure API layer tests pass
    - Run ONLY the 4-8 tests written in 2.1
    - Verify all endpoint behaviors work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-8 tests written in 2.1 pass
- Forgot password endpoint returns consistent success message
- Reset tokens are generated securely with 1 hour expiration
- Password reset email is sent via AWS SES
- Reset password endpoint validates token and password
- Password is hashed with bcrypt before storage
- Pending users are activated upon password reset
- Session is created and redirect destination is returned

---

### Frontend Layer

#### Task Group 3: Password Reset UI Pages
**Dependencies:** Task Group 2

- [x] 3.0 Complete UI pages for password reset flow
  - [x] 3.1 Write 3-6 focused tests for UI pages
    - Test forgot password page renders email form correctly
    - Test forgot password page shows success message after submission
    - Test reset password page reads token from query parameter
    - Test reset password page shows error for invalid/expired token
    - Test reset password page validates password confirmation matches
    - Test reset password page redirects after successful reset
  - [x] 3.2 Create forgot password page
    - Create page at `src/pages/forgot-password.astro`
    - Use centered card layout matching login page design
    - Include email input field with same styling as login page
    - Input styling: `w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900`
    - Submit button styling: `w-full px-4 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800`
    - Form submits to `POST /api/auth/forgot-password`
    - Display success message: "If an account exists with this email, you will receive a password reset link shortly"
    - Include link back to login page
  - [x] 3.3 Implement forgot password form handling
    - Handle form submission with fetch to API endpoint
    - Show loading state during submission
    - Display success message regardless of API response (consistent UX)
    - Handle network errors gracefully with user-friendly message
    - Clear form after successful submission
  - [x] 3.4 Create reset password page
    - Create page at `src/pages/reset-password.astro`
    - Read token from query parameter on page load
    - Use centered card layout matching login page design
    - Validate token server-side before rendering form
    - Display clear error message for invalid or expired tokens
    - Include link to request new reset when token is invalid
  - [x] 3.5 Implement reset password form
    - Include password input field
    - Include password confirmation input field
    - Use same input styling as login page
    - Client-side validation: passwords must match
    - Client-side validation: minimum 8 characters
    - Submit button with same styling as login page
    - Form submits to `POST /api/auth/reset-password`
  - [x] 3.6 Implement reset password form handling
    - Handle form submission with fetch to API endpoint
    - Show loading state during submission
    - Display validation errors (password too short, passwords don't match)
    - Display server errors (token expired, invalid token)
    - On success, redirect to destination from API response
    - Handle network errors gracefully
  - [x] 3.7 Ensure accessibility and responsive design
    - Use semantic HTML elements (form, label, input, button)
    - Ensure keyboard navigation works correctly
    - Add proper aria-labels and form labels
    - Ensure visible focus indicators on all interactive elements
    - Test responsive layout on mobile, tablet, and desktop
    - Maintain readable typography across breakpoints
  - [x] 3.8 Ensure UI tests pass
    - Run ONLY the 3-6 tests written in 3.1
    - Verify pages render and function correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-6 tests written in 3.1 pass
- Forgot password page matches login page styling
- Success message displays consistently regardless of email existence
- Reset password page validates token before showing form
- Password form validates input client-side
- Successful reset redirects to appropriate destination
- Pages are accessible and responsive

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review tests from Task Groups 1-3
    - Review the 2-4 tests written by database layer (Task 1.1)
    - Review the 4-8 tests written by API layer (Task 2.1)
    - Review the 3-6 tests written by UI layer (Task 3.1)
    - Total existing tests: approximately 9-18 tests
  - [x] 4.2 Analyze test coverage gaps for password reset feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
    - Key workflows to verify coverage:
      - Complete forgot password to email sent flow
      - Complete reset password to logged in flow
      - Pending user activation via password reset
  - [x] 4.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new tests to fill identified critical gaps
    - Focus on integration points and end-to-end workflows
    - Potential gap areas:
      - Integration test: forgot password request generates token and sends email
      - Integration test: reset password with valid token logs user in
      - Integration test: pending user becomes active after reset
      - Edge case: multiple reset requests overwrite previous token
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases unless business-critical
  - [x] 4.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature (tests from 1.1, 2.1, 3.1, and 4.3)
    - Expected total: approximately 19-28 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 19-28 tests total)
- Critical user workflows for password reset are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Database Layer (Task Group 1)** - Must be completed first as all other layers depend on the schema changes
2. **API Layer (Task Group 2)** - Depends on database schema; provides backend logic for frontend to consume
3. **Frontend Layer (Task Group 3)** - Depends on API endpoints being available
4. **Test Review and Gap Analysis (Task Group 4)** - Final review after all implementation complete

## Files to Create/Modify

### New Files
- `src/lib/db/migrations/XXXX_add_reset_token_to_users.ts`
- `src/pages/api/auth/forgot-password.ts`
- `src/pages/api/auth/reset-password.ts`
- `src/pages/forgot-password.astro`
- `src/pages/reset-password.astro`

### Modified Files
- `src/lib/db/schema.ts` (add resetToken and resetExpiresAt columns)

### Reference Files
- `src/lib/email/ses.ts` (existing AWS SES email service)
- `src/pages/login.astro` (styling reference)
- `src/lib/db/schema.ts` (existing inviteToken pattern reference)
