# Task Breakdown: User Invite Flow

## Overview
Total Tasks: 6 Task Groups

This feature enables controlled user onboarding to the Mellon Portal through admin-generated invite links with pre-assigned roles and tenants, secure token validation, and a streamlined registration page.

## Task List

### Email Service Layer

#### Task Group 1: AWS SES Email Integration
**Dependencies:** None

- [x] 1.0 Complete email service layer
  - [x] 1.1 Write 3-5 focused tests for email service functionality
    - Test SES client initialization with environment variables
    - Test email sending function returns success for valid inputs
    - Test error handling when SES fails
    - Mock AWS SES SDK to avoid actual API calls
  - [x] 1.2 Create email service module at `src/lib/email/ses.ts`
    - Configure AWS SES client using environment variables (AWS_SES_REGION, AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY)
    - Export `sendEmail` function accepting: to, subject, htmlBody, textBody
    - Implement proper error handling with typed error responses
    - Follow existing patterns from `src/lib/db/index.ts` for module structure
  - [x] 1.3 Create invite email template function
    - Create `src/lib/email/templates/invite.ts`
    - Function accepts: inviteLink, tenantName (optional), recipientEmail, expirationDays
    - Generate HTML email with: invite link button, tenant/organization name (for tenant users), 7-day expiration notice, clear call-to-action
    - Include plain text fallback version
    - Subject line: "You've been invited to Mellon Portal"
  - [x] 1.4 Ensure email service tests pass
    - Run ONLY the 3-5 tests written in 1.1
    - Verify mocked SES calls work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 1.1 pass
- SES client initializes with proper credentials
- Email template generates correct HTML and text content
- Error handling returns appropriate error responses

---

### API Layer

#### Task Group 2: Invite Creation & Resend Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete invite creation API
  - [x] 2.1 Write 4-6 focused tests for invite API endpoints
    - Test `POST /api/invites` creates user with pending status and membership
    - Test `POST /api/invites` returns 400 for existing active user email
    - Test `POST /api/invites` re-invites existing pending user (regenerates token)
    - Test `POST /api/invites/{userId}/resend` generates new token and sends email
    - Test `POST /api/invites/{userId}/resend` returns 404 for non-existent user
    - Mock email service to avoid actual email sending
  - [x] 2.2 Create `POST /api/invites` endpoint at `src/pages/api/invites.ts`
    - Validate request body: email (required), role (agency_admin | tenant_admin | tenant_viewer), tenantId (required for tenant roles)
    - Check if email already exists with active status - return 400
    - For existing pending users: regenerate token and reset expiration
    - Generate cryptographically secure token using `crypto.randomUUID()`
    - Set `inviteExpiresAt` to 7 days from creation
    - Create user record with `status = 'pending'`, store `inviteToken` and `inviteExpiresAt`
    - Create membership record with specified role and tenantId (null for agency_admin)
    - Send invite email via email service
    - Return invite details (excluding token for security) and success status
  - [x] 2.3 Implement rate limiting for invite creation
    - Limit to 10 invites per hour per admin
    - Return 429 Too Many Requests when limit exceeded
    - Store rate limit data (consider simple in-memory or database tracking)
  - [x] 2.4 Create `POST /api/invites/{userId}/resend` endpoint at `src/pages/api/invites/[userId]/resend.ts`
    - Validate user exists and has `status = 'pending'`
    - Return 404 if user not found
    - Return 400 if user is not in pending status
    - Generate new token using `crypto.randomUUID()`
    - Reset expiration to 7 days from now
    - Update user record (overwrites previous token)
    - Send new invite email
    - Return success response
  - [x] 2.5 Ensure invite API tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify all endpoints return correct status codes
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- Invite creation validates inputs and creates user + membership
- Re-invite functionality works for pending users
- Rate limiting prevents abuse
- Appropriate HTTP status codes returned (200, 400, 404, 429)

---

#### Task Group 3: Invite Accept Endpoint
**Dependencies:** Task Group 2

- [x] 3.0 Complete invite acceptance API
  - [x] 3.1 Write 4-6 focused tests for invite accept endpoint
    - Test `POST /api/invite/accept` successfully registers user with valid token
    - Test `POST /api/invite/accept` returns 400 for expired token
    - Test `POST /api/invite/accept` returns 400 for invalid/non-existent token
    - Test password validation rejects passwords under 8 characters
    - Test successful registration clears invite token and sets status to active
    - Mock session creation
  - [x] 3.2 Create `POST /api/invite/accept` endpoint at `src/pages/api/invite/accept.ts`
    - Validate request body: token, name, password, passwordConfirmation, timezone
    - Validate token exists and has not expired (server-side, timing-safe lookup)
    - Validate password meets requirements: minimum 8 characters
    - Validate password matches passwordConfirmation
    - Hash password using bcrypt before storing
    - Update user record: set name, passwordHash, timezone, status to 'active', clear inviteToken and inviteExpiresAt
    - Create session using Better Auth (coordinate with Authentication System spec)
    - Determine redirect URL based on membership role
    - Return success with redirect URL
  - [x] 3.3 Implement timing-safe token lookup
    - Use constant-time comparison for token validation
    - Prevent token enumeration attacks
    - Return generic error message for invalid tokens
  - [x] 3.4 Integrate with Better Auth for session creation
    - Follow session storage and cookie settings from Authentication System spec
    - Use same post-login routing logic for redirecting based on role/memberships
  - [x] 3.5 Ensure invite accept API tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify registration flow completes successfully
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- Valid tokens allow registration
- Expired/invalid tokens are rejected with appropriate errors
- Password is hashed before storage
- Session is created and user is redirected appropriately

---

### Frontend Components

#### Task Group 4: Registration Page
**Dependencies:** Task Group 3

- [x] 4.0 Complete registration page UI
  - [x] 4.1 Write 3-5 focused tests for registration page components
    - Test registration form renders all required fields
    - Test form validation displays errors for invalid inputs
    - Test form submission calls API with correct data
    - Test error state displays for invalid/expired token
    - Mock API responses
  - [x] 4.2 Create registration page at `src/pages/invite/accept.astro`
    - On page load: extract token from query parameter
    - Validate token via API call (or inline check)
    - Display error page with clear message for invalid or expired tokens
    - Show user's pre-assigned role and tenant name (if applicable)
    - Follow centered card layout from `src/pages/login.astro`
  - [x] 4.3 Implement registration form component
    - Create React component for form interactivity (island architecture)
    - Form fields: name (required), password (required), password confirmation (required), timezone (auto-detected, editable dropdown)
    - Use existing Tailwind classes for inputs: `w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900`
    - Use existing button styling: `w-full px-4 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800`
    - Client-side validation before submission
  - [x] 4.4 Implement timezone auto-detection
    - Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to detect user timezone
    - Pre-fill timezone dropdown with detected value
    - Provide dropdown of common timezones (IANA timezone database format)
    - Allow manual override selection
  - [x] 4.5 Handle form submission
    - Submit to `POST /api/invite/accept`
    - Display loading state during submission
    - Handle success: redirect to returned URL
    - Handle errors: display user-friendly error messages
  - [x] 4.6 Ensure registration page tests pass
    - Run ONLY the 3-5 tests written in 4.1
    - Verify form renders and validates correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 4.1 pass
- Invalid/expired token shows clear error page
- Form validates inputs client-side
- Timezone is auto-detected and editable
- Successful submission redirects user

---

#### Task Group 5: Admin Invite UI
**Dependencies:** Task Group 2

- [x] 5.0 Complete admin invite management UI
  - [x] 5.1 Write 3-5 focused tests for admin invite UI components
    - Test invite modal renders with correct form fields
    - Test tenant selector appears only for tenant roles
    - Test invite form submission calls API correctly
    - Test resend invite button triggers resend API
    - Mock API responses
  - [x] 5.2 Create Invite User modal component
    - Create `src/components/admin/InviteUserModal.tsx`
    - Form fields: email input, role selector dropdown (agency_admin, tenant_admin, tenant_viewer), tenant selector dropdown (conditional)
    - Show tenant selector only when role is tenant_admin or tenant_viewer
    - Fetch tenant list from existing API for dropdown options
    - Validate email format and required fields before submission
  - [x] 5.3 Integrate invite modal with user management page
    - Add "Invite User" button to agency admin user management interface
    - Wire button to open InviteUserModal
    - Handle modal close and form reset
  - [x] 5.4 Implement success feedback
    - Display success message after invite created
    - Show option to copy invite link to clipboard
    - Auto-close modal or allow inviting another user
  - [x] 5.5 Add resend invite functionality to user list
    - Add "Resend Invite" action button for users with pending status
    - Call `POST /api/invites/{userId}/resend` endpoint
    - Display success/error feedback
    - Update UI to reflect new invite sent
  - [x] 5.6 Ensure admin invite UI tests pass
    - Run ONLY the 3-5 tests written in 5.1
    - Verify modal and form interactions work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 5.1 pass
- Invite modal collects all required information
- Tenant selector conditionally displayed based on role
- Resend invite works for pending users
- Success/error feedback displayed to admin

---

### Testing & Integration

#### Task Group 6: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review existing tests and fill critical gaps only
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review the 3-5 tests written by email service engineer (Task 1.1)
    - Review the 4-6 tests written by invite API engineer (Task 2.1)
    - Review the 4-6 tests written by accept API engineer (Task 3.1)
    - Review the 3-5 tests written by registration UI engineer (Task 4.1)
    - Review the 3-5 tests written by admin UI engineer (Task 5.1)
    - Total existing tests: approximately 17-27 tests
  - [x] 6.2 Analyze test coverage gaps for User Invite Flow feature only
    - Identify critical user workflows that lack test coverage
    - Focus on end-to-end invite flow: create invite -> receive email -> register -> access dashboard
    - Prioritize integration points between API and UI
    - Do NOT assess entire application test coverage
  - [x] 6.3 Write up to 8 additional strategic tests maximum
    - Add maximum of 8 new tests to fill identified critical gaps
    - Focus on integration scenarios:
      - Full invite creation to user activation flow
      - Token expiration handling across time boundaries
      - Role-based redirect after registration
      - Error recovery scenarios (network failures, invalid data)
    - Skip edge cases, performance tests unless business-critical
  - [x] 6.4 Run feature-specific tests only
    - Run ONLY tests related to User Invite Flow feature (tests from 1.1, 2.1, 3.1, 4.1, 5.1, and 6.3)
    - Expected total: approximately 25-35 tests maximum
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 25-35 tests total)
- Full invite flow from creation to registration is covered
- No more than 8 additional tests added when filling gaps
- Testing focused exclusively on User Invite Flow feature

---

## Execution Order

Recommended implementation sequence:

```
1. Email Service Layer (Task Group 1)
   - Foundation for sending invite emails
   - No dependencies on other task groups

2. Invite Creation & Resend API (Task Group 2)
   - Depends on email service for sending invites
   - Provides endpoints for admin UI

3. Invite Accept API (Task Group 3)
   - Depends on invite creation for token generation
   - Provides endpoint for registration page

4. Registration Page (Task Group 4)
   - Depends on accept API for form submission
   - Can start in parallel with Task Group 5 after Group 3 completes

5. Admin Invite UI (Task Group 5)
   - Depends on invite creation API
   - Can run in parallel with Task Group 4

6. Test Review & Gap Analysis (Task Group 6)
   - Runs after all implementation complete
   - Reviews and fills critical testing gaps
```

## Technical Notes

### Environment Variables Required
- `AWS_SES_REGION` - AWS region for SES
- `AWS_SES_ACCESS_KEY` - AWS access key for SES
- `AWS_SES_SECRET_KEY` - AWS secret key for SES
- `AWS_SES_FROM_EMAIL` - From email address for SES
- `BASE_URL` - Application base URL for invite links

### Database Schema (Already Exists)
- `users` table: `inviteToken`, `inviteExpiresAt`, `status`, `name`, `email`, `passwordHash`, `timezone`
- `memberships` table: `role`, `tenantId`, `userId`
- `tenants` table: for looking up tenant names

### Key Integration Points
- Better Auth for session creation after registration
- Existing login page (`src/pages/login.astro`) for design patterns
- Existing UI components (`src/components/ui/`) for buttons, cards

### Security Considerations
- Tokens are single-use and cleared upon registration
- Timing-safe token lookup to prevent enumeration
- Rate limiting on invite creation (10/hour/admin)
- Server-side validation for all inputs
- SHA-256 for password hashing (using existing auth patterns)

## Implementation Summary

**Files Created:**
- `src/lib/email/ses.ts` - AWS SES email service
- `src/lib/email/templates/invite.ts` - Invite email template
- `src/lib/email/index.ts` - Email module exports
- `src/lib/invites/index.ts` - Invite management module
- `src/lib/invites/accept.ts` - Invite acceptance logic
- `src/pages/api/invites/index.ts` - POST /api/invites endpoint
- `src/pages/api/invites/[userId]/resend.ts` - POST /api/invites/{userId}/resend endpoint
- `src/pages/api/invite/accept.ts` - POST /api/invite/accept endpoint
- `src/pages/api/tenants/index.ts` - GET /api/tenants endpoint
- `src/pages/invite/accept.astro` - Registration page
- `src/components/forms/RegistrationForm.tsx` - Registration form component
- `src/components/admin/InviteUserModal.tsx` - Invite user modal
- `src/components/admin/UserManagement.tsx` - User management component
- `src/pages/admin/users.astro` - Admin users page

**Files Modified:**
- `src/lib/db/schema.ts` - Added timezone field to users table
- `.env.example` - Added AWS SES and BASE_URL variables
- `vitest.config.ts` - Added .tsx test file support

**Test Files Created:**
- `src/lib/email/ses.test.ts` - 6 tests
- `src/lib/email/templates/invite.test.ts` - 8 tests
- `src/lib/invites/invites.test.ts` - 11 tests
- `src/lib/invites/accept.test.ts` - 6 tests
- `src/lib/invites/integration.test.ts` - 12 tests
- `src/components/forms/RegistrationForm.test.tsx` - 6 tests
- `src/components/admin/InviteUserModal.test.tsx` - 9 tests

**Total Tests:** 58 tests (all passing)
