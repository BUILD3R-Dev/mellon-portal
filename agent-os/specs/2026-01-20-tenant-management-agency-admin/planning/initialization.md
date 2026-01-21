# Spec Initialization

## Feature
Tenant Management (Agency Admin)

## Description
Create CRUD interface for agency admins to create, view, update, and delete tenants (franchise brands)

## Context from PRD
This is for the Mellon Franchising Client Portal - a multi-tenant portal for franchise brand clients.

From the PRD:
- Mellon Agency Admin/Staff creates and manages tenants (franchise brands)
- Tenant = franchise brand with isolated data and branding settings
- Tenant settings include: Name, timezone, branding (logos, colors), ClientTether integration settings

## Existing Schema (from src/lib/db/schema.ts)
- `tenants` table: id, name, timezone, status (active/inactive/suspended), clienttetherWebKey, createdAt, updatedAt
- `tenantBranding` table: tenantId, mellonLogoUrl, tenantLogoUrl, primaryColor, accentColor, headerLayout, updatedAt
- `tenantFieldMappings` table: for ClientTether field mapping configuration

## Tech Stack
- Astro SSR + React islands
- PostgreSQL + Drizzle ORM
- Tailwind CSS + shadcn/ui

## Already Implemented
- Authentication system with agency admin role detection
- Admin dashboard at `/admin/dashboard`
- Protected routes middleware
- User management UI at `/admin/users`
