# Specification: Tenant Management & Branding System

## Goal
Enable Agency Admins to create, manage, and brand franchise tenants through a CRUD interface, and implement a co-branded layout system that displays tenant branding alongside Mellon branding throughout the portal.

## User Stories
- As an Agency Admin, I want to create and manage franchise brand tenants so that I can onboard new clients and maintain their accounts.
- As an Agency Admin, I want to configure tenant branding (logo, theme, accent color) so that each tenant sees a personalized, co-branded experience.

## Specific Requirements

**Tenant List Page**
- Display all tenants in a table with columns: name, status (active/inactive), created date
- Include status badges using existing StatusBadge pattern (green for active, gray for inactive)
- Add "Create Tenant" button in header, following UserManagement component pattern
- Support empty state with call-to-action to create first tenant
- Restrict access to Agency Admin role only (check `memberships` for `agency_admin` with `tenantId === null`)

**Create/Edit Tenant Modal**
- Modal form with fields: tenant name (required), timezone (dropdown, default: America/New_York), status (active/inactive)
- Follow InviteUserModal pattern for modal structure, validation, and accessibility
- Client-side and server-side validation: name required, max 255 characters
- On create, initialize tenant_branding record with default values
- Success notification and table refresh on save

**Tenant Deactivation**
- Soft delete by setting status to 'inactive' (existing `tenantStatusEnum` supports this)
- Show confirmation modal before deactivating
- On deactivation, delete all sessions for users belonging to that tenant using `deleteAllUserSessions` pattern
- Query memberships to find all users with that tenantId, then invalidate their sessions

**Tenant Branding Configuration Page**
- Dedicated page at `/admin/tenants/[id]/branding` for configuring individual tenant branding
- Logo upload section with live preview of current logo
- Theme selector with 3-5 predefined theme options
- Accent color override picker (hex input or color picker)
- Save button with loading state, validation feedback

**Logo Upload Handling**
- Accept PNG, JPG, SVG formats only (validate MIME type and extension)
- Max file size: 500KB (validate client-side and server-side)
- Max dimensions: 400x150 pixels (validate server-side, reject if exceeded)
- Store logos in `/public/uploads/logos/[tenantId]/` directory (or S3 in production)
- Update `tenant_branding.tenantLogoUrl` with relative path to uploaded file
- Display current logo preview; show placeholder if none uploaded

**Theme System Architecture**
- Define 4 predefined themes as configuration objects: Light (default), Dark, Blue, Green
- Each theme maps to Tailwind color families (e.g., gray, slate, blue, green)
- Store selected theme identifier in new `themeId` column on `tenant_branding` table
- Themes define: background colors, text colors, border colors, and default accent color
- Allow accent color override via `accentColorOverride` column (nullable hex value)

**CSS Custom Properties Integration**
- Generate CSS custom properties at runtime based on tenant's theme and accent color
- Inject variables in DashboardLayout: `--accent-color`, `--accent-hover`, `--accent-text`
- Apply accent color to: primary buttons, links, section headers, card borders
- Use Tailwind's CSS variable syntax (e.g., `bg-[var(--accent-color)]`)
- Fall back to default Mellon branding when tenant has no custom configuration

**Co-Branded Header Layout**
- Modify DashboardLayout.astro to display tenant logo in header when in tenant context
- Position: tenant logo left side, Mellon text/logo right side
- Logo should scale responsively (max-height: 40px on mobile, 48px on desktop)
- Query tenant branding from database based on `tenantId` in Astro.locals

**Co-Branded Footer**
- Add footer to DashboardLayout with "Powered by Mellon Franchising" text
- Include Mellon logo (small, subtle presentation)
- Footer styling: centered text, gray color, consistent padding
- Apply tenant accent color as subtle underline or accent element

**API Endpoints**
- `GET /api/tenants` - List all tenants (existing, may need enhancement for branding data)
- `POST /api/tenants` - Create new tenant with initial branding
- `GET /api/tenants/[id]` - Get tenant details including branding
- `PATCH /api/tenants/[id]` - Update tenant details (name, timezone, status)
- `POST /api/tenants/[id]/branding` - Update branding settings (theme, accent color)
- `POST /api/tenants/[id]/logo` - Upload tenant logo (multipart form data)
- `DELETE /api/tenants/[id]/logo` - Remove tenant logo

## Visual Design
No visual assets provided.

## Existing Code to Leverage

**UserManagement.tsx (`/src/components/admin/UserManagement.tsx`)**
- Reuse table pattern with rounded-xl container, header with action button
- Copy StatusBadge component for tenant status display
- Follow notification pattern for success/error feedback
- Use same table structure: thead with uppercase labels, tbody with hover states

**InviteUserModal.tsx (`/src/components/admin/InviteUserModal.tsx`)**
- Replicate modal structure: backdrop, focus trap, escape key handling
- Follow form validation pattern with field-specific errors
- Use same button styling and loading states
- Copy success confirmation flow for create/edit actions

**DashboardLayout.astro (`/src/layouts/DashboardLayout.astro`)**
- Extend header to conditionally render tenant logo
- Add footer section after main content slot
- Use existing Astro.locals pattern for tenant context access
- Maintain mobile menu responsive behavior

**Session Management (`/src/lib/auth/session.ts`)**
- Use `deleteAllUserSessions(userId)` function for deactivation logout
- Reference `getUserMemberships` pattern for tenant user queries
- Follow existing session validation flow for protected routes

**API Pattern (`/src/pages/api/tenants/index.ts`)**
- Follow response type pattern: `{ success: true, data }` or `{ success: false, error, code }`
- Use same authentication check with SESSION_COOKIE_NAME
- Apply agency admin verification pattern before allowing operations

## Out of Scope
- Bulk tenant operations (import/export, bulk status changes)
- Branding preview before save (live preview in modal)
- Tenant logo history or version management
- Tenant admin access to branding settings (Agency Admin only)
- Custom font selection per tenant
- Full custom color palette beyond accent color override
- Animated theme transitions or dark mode toggle
- Tenant subdomain or custom domain support
- Automatic logo resizing or cropping tool
- Multi-language support for tenant names
