# Task Breakdown: Authentication System

## Overview
Total Tasks: 6 Task Groups (approximately 32 sub-tasks)

This spec implements secure email/password authentication with Better Auth, PostgreSQL session storage, and intelligent post-login routing based on user memberships and roles.

## Task List

### Backend Layer

#### Task Group 1: Better Auth Configuration & Core Setup
**Dependencies:** None

- [x] 1.0 Complete Better Auth configuration and core authentication setup
  - [x] 1.1 Write 2-6 focused tests for Better Auth configuration
    - Test Better Auth client initialization
    - Test password hashing functionality (bcrypt/argon2)
    - Test session token generation
    - Test CSRF protection is enabled
  - [x] 1.2 Install and configure Better Auth library
    - Run `npm install better-auth`
    - Create `src/lib/auth/auth.ts` configuration file
    - Configure email/password credentials provider
    - Set session duration to 30 days
    - Enable built-in CSRF protection
  - [x] 1.3 Configure PostgreSQL session adapter
    - Create Better Auth adapter to use existing `sessions` table schema
    - Configure adapter to use Drizzle ORM client from `src/lib/db/index.ts`
    - Map session fields: id, userId, token, expiresAt, createdAt
  - [x] 1.4 Create auth utility functions
    - Create `src/lib/auth/utils.ts` for helper functions
    - Implement password verification function
    - Implement session token generation function
    - Export types for session and user data
  - [x] 1.5 Ensure Better Auth configuration tests pass
    - Run ONLY the 2-6 tests written in 1.1
    - Verify configuration loads correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-6 tests written in 1.1 pass
- Better Auth is properly configured with email/password provider
- Session storage uses existing PostgreSQL sessions table
- CSRF protection is enabled
- Session duration is set to 30 days

---

#### Task Group 2: User Validation & Session Management
**Dependencies:** Task Group 1

- [x] 2.0 Complete user validation and session management logic
  - [x] 2.1 Write 2-6 focused tests for user validation and session management
    - Test active user can authenticate
    - Test pending user receives "Account is pending activation" error
    - Test inactive user receives "Account has been deactivated" error
    - Test session is created in database on successful login
    - Test session is deleted from database on logout
  - [x] 2.2 Implement user status validation
    - Create `src/lib/auth/validate-user.ts`
    - Query user by email from `users` table using Drizzle ORM
    - Check user status against `userStatusEnum` (active, inactive, pending)
    - Return appropriate error messages for non-active users
  - [x] 2.3 Implement session creation logic
    - Create session record in `sessions` table upon successful authentication
    - Generate unique session token
    - Set expiration to 30 days from creation
    - Store userId reference from authenticated user
  - [x] 2.4 Implement session deletion logic
    - Delete session record from `sessions` table by token
    - Handle case where session does not exist gracefully
  - [x] 2.5 Ensure user validation and session tests pass
    - Run ONLY the 2-6 tests written in 2.1
    - Verify all user status scenarios work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-6 tests written in 2.1 pass
- Only users with status='active' can authenticate
- Appropriate error messages returned for pending and inactive users
- Sessions are created and deleted correctly in database

---

### API Layer

#### Task Group 3: Authentication API Endpoints
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete authentication API endpoints
  - [x] 3.1 Write 2-6 focused tests for API endpoints
    - Test POST /api/auth/login returns 200 and session cookie on valid credentials
    - Test POST /api/auth/login returns 401 on invalid credentials
    - Test POST /api/auth/logout clears session and returns 200
    - Test GET /api/auth/session returns user info when authenticated
    - Test GET /api/auth/session returns 401 when not authenticated
  - [x] 3.2 Create login endpoint
    - Create `src/pages/api/auth/login.ts`
    - Accept POST with email and password in request body
    - Validate credentials against user's passwordHash
    - Check user status before allowing authentication
    - Create session and set HTTP-only secure cookie
    - Return user info and redirect URL on success
    - Return appropriate error status codes (401, 403)
  - [x] 3.3 Create logout endpoint
    - Create `src/pages/api/auth/logout.ts`
    - Accept POST request
    - Extract session token from cookie
    - Delete session from database
    - Clear session cookie from browser
    - Return 200 on success
  - [x] 3.4 Create session check endpoint
    - Create `src/pages/api/auth/session.ts`
    - Accept GET request
    - Validate session token from cookie
    - Return current user and session info if valid
    - Return 401 if no valid session
  - [x] 3.5 Implement post-login routing logic
    - Query user's memberships from `memberships` table
    - If agency_admin with tenantId=null: return redirect to `/admin/dashboard`
    - If exactly one tenant membership: return redirect to `/dashboard`
    - If multiple tenant memberships: return redirect to `/select-workspace`
    - Include redirect URL in login response
  - [x] 3.6 Ensure API endpoint tests pass
    - Run ONLY the 2-6 tests written in 3.1
    - Verify all CRUD operations work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-6 tests written in 3.1 pass
- All three endpoints work correctly (login, logout, session)
- HTTP-only secure cookies are used for session tokens
- Proper HTTP status codes returned (200, 401, 403)
- Post-login routing logic returns correct redirect URLs

---

#### Task Group 4: Authentication Middleware
**Dependencies:** Task Group 3

- [x] 4.0 Complete authentication middleware for protected routes
  - [x] 4.1 Write 2-4 focused tests for middleware
    - Test unauthenticated user is redirected to /login with return URL
    - Test authenticated user can access protected route
    - Test user and session data is available in Astro.locals
  - [x] 4.2 Create authentication middleware
    - Create `src/middleware/auth.ts`
    - Extract session token from cookie
    - Validate session exists and is not expired
    - Query user data from database
    - Attach user and session to `Astro.locals`
  - [x] 4.3 Configure protected route patterns
    - Protect routes under `/dashboard/*`
    - Protect routes under `/admin/*`
    - Protect routes under `/reports/*`
    - Protect route `/select-workspace`
    - Redirect unauthenticated users to `/login?returnUrl=[original-path]`
  - [x] 4.4 Create middleware index file
    - Create `src/middleware/index.ts`
    - Export middleware for Astro to use
    - Configure route matching patterns
  - [x] 4.5 Ensure middleware tests pass
    - Run ONLY the 2-4 tests written in 4.1
    - Verify protected routes redirect correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 4.1 pass
- Unauthenticated users are redirected to /login with return URL
- Authenticated user data is available in Astro.locals
- All protected routes are properly guarded

---

### Frontend Layer

#### Task Group 5: Login Form Enhancement & Workspace Selection
**Dependencies:** Task Groups 3, 4

- [x] 5.0 Complete login form and workspace selection UI
  - [x] 5.1 Write 2-6 focused tests for UI components
    - Test login form submits credentials to API
    - Test login form displays error messages for invalid credentials
    - Test login form displays error for pending/inactive users
    - Test workspace selection page renders user's workspaces
    - Test clicking workspace redirects to dashboard
  - [x] 5.2 Enhance login form with form submission
    - Update `src/pages/login.astro`
    - Add form action pointing to `/api/auth/login`
    - Add client-side JavaScript for form submission handling
    - Handle response and redirect based on returned URL
  - [x] 5.3 Add error message display to login form
    - Add error message container element
    - Display field-specific validation errors
    - Display authentication error messages (invalid credentials, pending, inactive)
    - Style error messages consistently with existing design
  - [x] 5.4 Add loading state to login form
    - Add loading spinner or disabled state to submit button during authentication
    - Disable form inputs during submission
    - Re-enable form on error
  - [x] 5.5 Create workspace selection page
    - Create `src/pages/select-workspace.astro`
    - Query user's memberships with tenant details in page load
    - Display list of workspaces showing tenant name and user's role
    - Style consistently with login page using existing Card component
  - [x] 5.6 Implement workspace selection interaction
    - Add click handler to workspace items
    - Store selected tenant context in cookie or session
    - Redirect to `/dashboard` after selection
  - [x] 5.7 Ensure UI component tests pass
    - Run ONLY the 2-6 tests written in 5.1
    - Verify form submission and error handling work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-6 tests written in 5.1 pass
- Login form submits to API and handles responses
- Error messages display correctly for all scenarios
- Loading state shows during authentication
- Workspace selection page lists available workspaces
- Workspace selection stores context and redirects correctly

---

#### Task Group 6: Dashboard Layout & Logout Integration
**Dependencies:** Task Group 5

- [x] 6.0 Complete dashboard layout updates and logout functionality
  - [x] 6.1 Write 2-4 focused tests for logout and dashboard integration
    - Test logout button triggers logout API call
    - Test user is redirected to /login after logout
    - Test dashboard header displays current user name
  - [x] 6.2 Update DashboardLayout header with user info
    - Update `src/layouts/DashboardLayout.astro`
    - Display authenticated user's name from Astro.locals
    - Display current workspace/tenant name if applicable
  - [x] 6.3 Add logout button to dashboard header
    - Add logout button/link to user area in header
    - Style consistently with existing navigation
  - [x] 6.4 Implement logout button functionality
    - Add click handler to call `/api/auth/logout`
    - Redirect to `/login` after successful logout
    - Handle logout errors gracefully
  - [x] 6.5 Ensure logout and dashboard integration tests pass
    - Run ONLY the 2-4 tests written in 6.1
    - Verify logout flow works end-to-end
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 6.1 pass
- User info displays in dashboard header
- Logout button is visible and styled correctly
- Clicking logout clears session and redirects to login

---

### Testing

#### Task Group 7: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-6

- [x] 7.0 Review existing tests and fill critical gaps only
  - [x] 7.1 Review tests from Task Groups 1-6
    - Review the 2-6 tests written by backend tasks (Task 1.1)
    - Review the 2-6 tests written by validation tasks (Task 2.1)
    - Review the 2-6 tests written by API tasks (Task 3.1)
    - Review the 2-4 tests written by middleware tasks (Task 4.1)
    - Review the 2-6 tests written by UI tasks (Task 5.1)
    - Review the 2-4 tests written by dashboard tasks (Task 6.1)
    - Total existing tests: approximately 12-32 tests
  - [x] 7.2 Analyze test coverage gaps for authentication feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to authentication spec requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
  - [x] 7.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new tests to fill identified critical gaps
    - Focus on integration points and end-to-end workflows
    - Suggested focus areas:
      - Full login flow from form to dashboard redirect
      - Session persistence across page navigation
      - Workspace selection and context persistence
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases unless business-critical
  - [x] 7.4 Run feature-specific tests only
    - Run ONLY tests related to authentication spec (tests from 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, and 7.3)
    - Expected total: approximately 22-42 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical authentication workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 22-42 tests total)
- Critical authentication user workflows are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on authentication feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Backend Layer - Better Auth Configuration** (Task Group 1)
   - Foundation for all authentication features
   - No dependencies

2. **Backend Layer - User Validation & Session Management** (Task Group 2)
   - Depends on Task Group 1
   - Provides core authentication logic

3. **API Layer - Authentication Endpoints** (Task Group 3)
   - Depends on Task Groups 1, 2
   - Exposes authentication functionality via REST API

4. **API Layer - Authentication Middleware** (Task Group 4)
   - Depends on Task Group 3
   - Protects routes and provides user context

5. **Frontend Layer - Login & Workspace Selection** (Task Group 5)
   - Depends on Task Groups 3, 4
   - User-facing authentication interfaces

6. **Frontend Layer - Dashboard & Logout** (Task Group 6)
   - Depends on Task Group 5
   - Completes the authentication user experience

7. **Testing - Gap Analysis** (Task Group 7)
   - Depends on all previous groups
   - Final verification and test coverage review

---

## Files to Create/Modify

### New Files
- `src/lib/auth/auth.ts` - Better Auth configuration
- `src/lib/auth/utils.ts` - Auth utility functions
- `src/lib/auth/validate-user.ts` - User status validation
- `src/lib/auth/session.ts` - Session management functions
- `src/lib/auth/index.ts` - Auth module exports
- `src/pages/api/auth/login.ts` - Login API endpoint
- `src/pages/api/auth/logout.ts` - Logout API endpoint
- `src/pages/api/auth/session.ts` - Session check endpoint
- `src/pages/api/auth/set-workspace.ts` - Set workspace context endpoint
- `src/middleware/index.ts` - Middleware exports and configuration
- `src/pages/select-workspace.astro` - Workspace selection page
- `src/pages/admin/dashboard.astro` - Admin dashboard page
- `src/lib/auth/utils.test.ts` - Utils unit tests
- `src/lib/auth/validate-user.test.ts` - Validation unit tests
- `vitest.config.ts` - Vitest configuration

### Modified Files
- `src/pages/login.astro` - Add form submission and error handling
- `src/layouts/DashboardLayout.astro` - Add user info and logout button
- `package.json` - Add vitest and test scripts

---

## Technical Notes

- **Session Storage:** Uses existing `sessions` table schema with Drizzle ORM
- **Password Hashing:** Better Auth handles bcrypt/argon2 automatically
- **Cookie Settings:** HTTP-only, Secure flag in production
- **CSRF Protection:** Built-in Better Auth CSRF enabled
- **Database Queries:** Use Drizzle ORM from `src/lib/db/index.ts`
- **UI Components:** Reuse Button and Card from `src/components/ui/`
