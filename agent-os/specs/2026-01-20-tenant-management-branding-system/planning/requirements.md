# Spec Requirements: Tenant Management & Branding System

## Initial Description

This spec covers three related roadmap items:

1. **Tenant Management (Agency Admin)** - Create CRUD interface for agency admins to create, edit, and deactivate franchise brand tenants

2. **Tenant Branding Configuration** - Build settings page for uploading tenant logo and configuring accent color that applies across the tenant UI

3. **Co-Branded Layout System** - Implement dynamic layout that displays Mellon logo alongside tenant logo and applies tenant accent colors to UI elements

These are foundational features for a multi-tenant SaaS portal where an agency (Mellon) manages multiple franchise brand tenants, each with their own branding.

## Requirements Discussion

### First Round Questions

**Q1:** For tenant management, I assume Agency Admin users should have full CRUD capabilities (create, read, update, deactivate tenants), while Tenant Admins can only view their own tenant details. Is that correct?
**Answer:** Confirmed. Agency Admin only for all tenant CRUD operations.

**Q2:** When deactivating a tenant, should we implement a soft delete (marking as inactive but preserving data) rather than hard delete? And should deactivation immediately log out all users belonging to that tenant?
**Answer:** Yes, soft delete with inactive status. Yes, log out all users on tenant deactivation.

**Q3:** For the branding configuration, I'm thinking Agency Admins configure branding on behalf of tenants (not tenant admins themselves). Should tenant admins have read-only visibility into their branding settings, or no access at all?
**Answer:** Agency Admin only for branding configuration. Tenant admins do not need access to branding settings.

**Q4:** For the theme/color system, should we offer: (a) a few predefined themes tenants choose from, (b) full custom primary/secondary/accent color pickers, or (c) a hybrid where they pick a base theme and can customize accent color?
**Answer:** Users pick from 3-5 predefined themes (e.g., light, dark, and a few popular options), then can customize/tweak from there. If a theme has an accent color, they can override it with a different color. Simple approach - not too many options.

**Q5:** For logo requirements, I assume we need constraints like max dimensions (e.g., 400x150px), max file size (e.g., 500KB), and accepted formats (PNG, JPG, SVG). What constraints make sense for your use case?
**Answer:** Confirmed constraints:
- Max dimensions: 400x150 pixels
- Max file size: 500KB
- Accepted formats: PNG, JPG, SVG

**Q6:** For co-branding placement, I'm assuming: tenant logo in header area, "Powered by Mellon Franchising" + Mellon logo in footer. Is this the layout you envision?
**Answer:** Confirmed. Tenant logo in header, "Powered by Mellon Franchising" + Mellon logo in footer.

**Q7:** Which UI elements should the accent color affect? I'm thinking: primary buttons, links, active navigation items, and possibly section headers or card borders.
**Answer:** Accent colors affect: buttons, links, section headers, card borders.

**Q8:** Should there be any functionality explicitly excluded from this initial implementation (e.g., bulk tenant operations, branding preview before save, tenant logo history)?
**Answer:** No additional exclusions mentioned. Keep scope focused on core CRUD and branding configuration.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: User Management Table - Path: `/src/components/admin/UserManagement.tsx`
  - Table pattern with status badges and action buttons to reuse for tenant list
- Feature: Invite User Modal - Path: `/src/components/admin/InviteUserModal.tsx`
  - Modal form pattern with validation to reference for tenant create/edit forms
- Feature: Admin Dashboard - Path: `/src/pages/admin/dashboard.astro`
  - Admin page structure and layout patterns
- Feature: Dashboard Layout - Path: `/src/layouts/DashboardLayout.astro`
  - Header layout to enhance for co-branding (tenant logo placement)

### Follow-up Questions

**Follow-up 1:** For the theme system, should themes use Tailwind's default color families, or custom brand colors?
**Answer:** Use Tailwind's default color families. The project uses shadcn/ui, so themes should integrate well with that component library.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files found in planning/visuals/ folder.

## Requirements Summary

### Functional Requirements

**Tenant Management (Agency Admin Only):**
- Create new tenants with name and optional initial branding setup
- View list of all tenants with status indicators (active/inactive)
- Edit tenant details (name, status)
- Deactivate tenants (soft delete - mark as inactive, preserve data)
- Automatically log out all users belonging to a tenant when deactivated
- Only Agency Admin role has access to tenant management

**Tenant Branding Configuration (Agency Admin Only):**
- Upload tenant logo with constraints:
  - Max dimensions: 400x150 pixels
  - Max file size: 500KB
  - Accepted formats: PNG, JPG, SVG
- Select from 3-5 predefined themes (light, dark, plus 2-3 popular options)
- Override accent color from the selected theme with a custom color
- Theme system uses Tailwind default color families
- Integration with shadcn/ui component library
- Only Agency Admin role has access to branding configuration

**Co-Branded Layout System:**
- Display tenant logo in header area
- Display "Powered by Mellon Franchising" text + Mellon logo in footer
- Apply tenant's selected theme across the UI
- Apply accent color (from theme or custom override) to:
  - Primary buttons
  - Links
  - Section headers
  - Card borders
- Graceful fallback to default Mellon branding when tenant has no custom branding configured

### Reusability Opportunities

- Reuse table pattern from `/src/components/admin/UserManagement.tsx` for tenant list display
- Reference modal form pattern from `/src/components/admin/InviteUserModal.tsx` for tenant create/edit forms
- Follow admin page structure from `/src/pages/admin/dashboard.astro`
- Enhance existing `/src/layouts/DashboardLayout.astro` for co-branding header/footer

### Scope Boundaries

**In Scope:**
- Tenant CRUD operations (create, read, update, soft-delete/deactivate)
- User session invalidation on tenant deactivation
- Logo upload with validation (dimensions, file size, format)
- Theme selection from predefined options (3-5 themes)
- Accent color override capability
- Co-branded header with tenant logo
- Co-branded footer with Mellon branding
- CSS custom property system for theme/accent color application

**Out of Scope:**
- Bulk tenant operations
- Branding preview before save
- Tenant logo history/versioning
- Tenant admin access to branding settings
- Custom font selection
- Full custom color palette (beyond accent color override)
- Animated theme transitions

### Technical Considerations

- **Database:** Existing tenants table likely needs branding columns (logo_url, theme_id, accent_color_override)
- **File Storage:** Logo uploads require file storage solution (local filesystem or cloud storage)
- **Session Management:** Need mechanism to invalidate all sessions for a tenant on deactivation
- **CSS Architecture:** Use CSS custom properties for theme values, compatible with Tailwind and shadcn/ui
- **Theme Definition:** Define themes as configuration objects mapping to Tailwind color families
- **Validation:** Client-side and server-side validation for logo uploads (dimensions, size, format)
- **Responsive:** Co-branded layout must work across all breakpoints per existing responsive patterns
