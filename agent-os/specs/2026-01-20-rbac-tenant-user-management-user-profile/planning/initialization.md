# Spec Initialization

## Spec Name
RBAC, Tenant User Management, and User Profile

## Initial Description
This spec covers the final three items to complete Milestone 1: Foundations:

1. **Role-Based Access Control (#8)** - Enforce Agency Admin, Tenant Admin, and Tenant Viewer permissions across all routes and API endpoints

2. **Tenant User Management (#9)** - Allow Tenant Admins to invite, list, and deactivate view-only users within their tenant

3. **User Profile & Settings (#10)** - Build profile page for users to update their name and password

## Context from Existing Codebase
- This is an Astro project with React islands, Drizzle ORM, shadcn/ui
- Auth system is already implemented (Auth.js with Postgres sessions)
- User invite flow and password reset already exist
- Tenant management and branding are complete
- Database has users, tenants, memberships (tenant_users), sessions tables
- Three roles exist: Agency Admin, Tenant Admin, Tenant Viewer
