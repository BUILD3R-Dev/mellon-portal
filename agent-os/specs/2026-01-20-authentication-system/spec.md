# Specification: Authentication System

## Goal

Implement secure email/password authentication with Better Auth, PostgreSQL session storage, and intelligent post-login routing based on user memberships and roles for the Mellon Franchising Client Portal.

## User Stories

- As a franchise brand user, I want to log in with my email and password so that I can access my tenant's dashboard and performance data
- As an agency admin, I want to be automatically routed to the admin dashboard after login so that I can manage all tenants efficiently
- As a user with multiple tenant memberships, I want to select which workspace to access so that I can switch between my different franchise brand accounts

## Specific Requirements

**Better Auth Configuration**
- Install and configure Better Auth library with email/password credentials provider
- Configure PostgreSQL as the session storage backend using the existing `sessions` table schema
- Set session duration to 30 days for long-lived sessions
- Enable Better Auth's built-in CSRF protection
- Use bcrypt or argon2 for password hashing (via Better Auth defaults)

**Login Form Enhancement**
- Connect existing login form (`src/pages/login.astro`) to Better Auth authentication endpoint
- Add form submission handler that posts credentials to the auth API
- Display field-specific error messages for validation failures
- Display appropriate error messages for invalid credentials, pending users, and inactive users
- Add loading state to submit button during authentication

**User Status Validation**
- Check user status before allowing authentication
- Only users with `status = 'active'` can successfully authenticate
- Return "Account is pending activation" error for users with `status = 'pending'`
- Return "Account has been deactivated" error for users with `status = 'inactive'`
- Query user status from `users` table using Drizzle ORM

**Session Management**
- Create session record in `sessions` table upon successful authentication
- Store session token in HTTP-only secure cookie (Secure flag in production)
- Session lookup and validation via Better Auth middleware for protected routes
- Clear session from database and cookie on logout
- Do not implement token rotation (keep session management simple)

**Post-Login Routing Logic**
- Query user's memberships from `memberships` table after successful authentication
- If user has `agency_admin` role with `tenantId = null`: redirect to `/admin/dashboard`
- If user has exactly one tenant membership: redirect to `/dashboard` with tenant context
- If user has multiple tenant memberships: redirect to `/select-workspace`

**Workspace Selection Page**
- Create new page at `src/pages/select-workspace.astro` for multi-membership users
- Display list of user's available workspaces showing tenant name and user's role
- Allow user to click a workspace to set it as active and redirect to tenant dashboard
- Store selected workspace/tenant context in session or cookie for subsequent requests
- Style consistently with existing login page design

**Authentication Middleware**
- Create middleware to validate session on protected routes
- Redirect unauthenticated users to `/login` with return URL parameter
- Make authenticated user and session data available to Astro pages via `Astro.locals`
- Protect all routes under `/dashboard`, `/admin`, `/reports`, and similar paths

**Logout Functionality**
- Create logout API endpoint or action at `/api/auth/logout`
- Delete session record from `sessions` table
- Clear session cookie from browser
- Redirect to `/login` page after logout
- Add logout button/link to `DashboardLayout.astro` header

**API Endpoints**
- `POST /api/auth/login` - Authenticate user credentials and create session
- `POST /api/auth/logout` - Destroy session and clear cookie
- `GET /api/auth/session` - Return current session and user info (for client-side checks)
- Follow RESTful conventions with appropriate HTTP status codes (200, 401, 403)

## Visual Design

No visual assets provided. Follow existing design patterns from `src/pages/login.astro` for consistency.

## Existing Code to Leverage

**Database Schema (`src/lib/db/schema.ts`)**
- `users` table with `id`, `email`, `passwordHash`, `status` (user_status enum) already defined
- `sessions` table with `id`, `userId`, `token`, `expiresAt`, `createdAt` ready for session storage
- `memberships` table with `userId`, `tenantId`, `role` (membership_role enum) for routing logic
- Enums `userStatusEnum` (active, inactive, pending) and `membershipRoleEnum` (agency_admin, tenant_admin, tenant_viewer) already exist

**Database Client (`src/lib/db/index.ts`)**
- Drizzle ORM client exported as `db` with all schema tables
- Connection configured via `DATABASE_URL` environment variable
- Re-exports all schema types for use across the application

**Login Page (`src/pages/login.astro`)**
- Complete login form UI with email/password fields already styled
- Uses `Layout.astro` wrapper with proper meta tags and title
- "Remember me" checkbox and "Forgot password" link present (forgot password is out of scope)
- Form needs to be connected to auth backend with form action and error handling

**UI Components (`src/components/ui/`)**
- `Button.tsx` with variants (default, destructive, outline, secondary, ghost, link)
- `Card.tsx` with CardHeader, CardTitle, CardContent, CardFooter for consistent containers
- `cn` utility from `src/lib/utils/cn.ts` for Tailwind class merging

**Dashboard Layout (`src/layouts/DashboardLayout.astro`)**
- Header with navigation links and user placeholder area
- User area needs logout button and workspace context display
- Protected routes should use this layout after authentication

## Out of Scope

- User invite flow (separate roadmap item #3)
- Password reset flow (separate roadmap item #4)
- User registration (users are created via invite flow only)
- OAuth/social login providers
- Two-factor authentication (2FA)
- Rate limiting on login attempts
- "Remember me" checkbox functionality (session duration is already long)
- Email verification after login
- Account lockout after failed attempts
- Session activity logging to audit_log table
