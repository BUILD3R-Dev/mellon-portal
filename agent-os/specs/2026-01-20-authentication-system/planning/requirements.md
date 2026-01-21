# Spec Requirements: Authentication System

## Initial Description

Implement email/password login, secure session management, and logout using Better Auth with PostgreSQL session storage. This is roadmap item #2 in Milestone 1: Foundations.

## Requirements Discussion

### First Round Questions

**Q1:** Which authentication library should we use - Better Auth (formerly Auth.js/NextAuth) or implement custom authentication?
**Answer:** Use Better Auth (user confirms Auth.js is now called Better Auth).

**Q2:** After successful login, where should users be redirected based on their role?
**Answer:** Agency users (agency_admin role, no tenant) should be redirected to the admin dashboard. Tenant users should be redirected to their tenant's dashboard.

**Q3:** What session duration and management approach should we use?
**Answer:** Long session duration to keep things simple. Straightforward session management with HTTP-only secure cookies, no token rotation on each request.

**Q4:** How should user status affect login capability?
**Answer:** Only `active` users can authenticate. `pending` users cannot log in (they need to complete the invite flow first). `inactive` users cannot log in (deactivated accounts).

**Q5:** What CSRF protection approach should we use?
**Answer:** Better Auth's built-in CSRF protection is sufficient.

**Q6:** How should we handle users with multiple tenant memberships?
**Answer:** Implement a "select workspace" screen for users with multiple memberships.

**Q7:** What features should be explicitly out of scope for this authentication spec?
**Answer:** Invite flow (separate roadmap item #3) and password reset flow (separate roadmap item #4) are out of scope.

### Existing Code to Reference

**Similar Features Identified:**
- Database schema: `src/lib/db/schema.ts` - Contains users, sessions, and memberships tables with proper enums for user_status (active, inactive, pending) and membership_role (agency_admin, tenant_admin, tenant_viewer)
- Database client: `src/lib/db/index.ts` - Drizzle ORM database connection
- Existing login page: `src/pages/login.astro` - Static login form with email/password fields, remember me checkbox, and forgot password link (needs to be connected to auth backend)

**Schema Details from Existing Code:**
- `users` table: id, email (unique), name, passwordHash, status (user_status enum), inviteToken, inviteExpiresAt, createdAt, updatedAt
- `sessions` table: id, userId (FK to users), token (unique), expiresAt, createdAt - indexed on userId
- `memberships` table: id, userId (FK to users), tenantId (FK to tenants, nullable for agency users), role (membership_role enum), createdAt - indexed on both userId and tenantId

### Follow-up Questions

No follow-up questions were needed.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements

**Authentication Flow:**
- Email/password credential-based login using Better Auth
- Validate user credentials against stored passwordHash
- Check user status before allowing authentication (only `active` users can log in)
- Return appropriate error messages for invalid credentials, pending users, and inactive users
- Create session upon successful authentication

**Session Management:**
- Store sessions in PostgreSQL using existing sessions table schema
- Use HTTP-only secure cookies for session tokens
- Implement long session duration (e.g., 30 days)
- No token rotation on each request (keep it simple)
- Session lookup and validation on protected routes

**Post-Login Routing:**
- Query user's memberships after successful authentication
- If user has agency_admin role with no tenant: redirect to admin dashboard
- If user has single tenant membership: redirect to tenant dashboard
- If user has multiple tenant memberships: show workspace selection screen

**Workspace Selection (Multiple Memberships):**
- Display list of user's available workspaces/tenants
- Allow user to select which workspace to access
- Store selected workspace context for the session
- Provide ability to switch workspaces later

**Logout:**
- Clear session from database
- Clear session cookie
- Redirect to login page

**CSRF Protection:**
- Use Better Auth's built-in CSRF protection mechanisms

### Reusability Opportunities

- Existing login page UI (`src/pages/login.astro`) can be enhanced with form submission logic
- Database schema already supports all required tables (users, sessions, memberships)
- User status enum already includes required states (active, inactive, pending)
- Membership role enum already includes required roles (agency_admin, tenant_admin, tenant_viewer)

### Scope Boundaries

**In Scope:**
- Better Auth configuration and setup
- Login form submission and validation
- Session creation and management
- Session-based authentication middleware
- Post-login routing logic based on role and memberships
- Workspace selection screen for multi-membership users
- Logout functionality
- Protected route guards

**Out of Scope:**
- User invite flow (roadmap item #3)
- Password reset flow (roadmap item #4)
- User registration (users are created via invite flow)
- OAuth/social login providers
- Two-factor authentication
- Rate limiting (can be added later)

### Technical Considerations

**Integration Points:**
- Better Auth library for authentication logic
- PostgreSQL for session storage (existing sessions table)
- Drizzle ORM for database queries (existing setup in `src/lib/db/index.ts`)
- Astro SSR for server-side session validation

**Existing System Constraints:**
- Must use existing database schema (users, sessions, memberships tables)
- Must integrate with Astro SSR architecture
- Must work with React islands for interactive components (workspace selector)

**Technology Stack:**
- Framework: Astro SSR with React islands
- Auth Library: Better Auth
- Database: PostgreSQL with Drizzle ORM
- Session Storage: PostgreSQL-backed sessions
- Cookies: HTTP-only, Secure flag in production

**Security Requirements:**
- Password hashing (bcrypt or argon2 via Better Auth)
- HTTP-only cookies to prevent XSS access to session tokens
- Secure cookie flag in production
- CSRF protection via Better Auth
- User status validation before authentication
