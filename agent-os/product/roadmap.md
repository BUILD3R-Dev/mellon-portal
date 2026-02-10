# Product Roadmap

## Milestone 1: Foundations

1. [x] Database Schema Setup — Define and migrate core tables for users, tenants, tenant_users, and sessions using Drizzle ORM with proper indexes and constraints `S`
2. [x] Authentication System — Implement email/password login, secure session management, and logout using Auth.js with Postgres session storage `M`
3. [x] User Invite Flow — Build invite token generation, email sending, and registration page for new users to join via invite links `M`
4. [x] Password Reset Flow — Implement forgot password request, reset token validation, and password update functionality `S`
5. [x] Tenant Management (Agency Admin) — Create CRUD interface for agency admins to create, edit, and deactivate franchise brand tenants `M`
6. [x] Tenant Branding Configuration — Build settings page for uploading tenant logo and configuring accent color that applies across the tenant UI `S`
7. [x] Co-Branded Layout System — Implement dynamic layout that displays Mellon logo alongside tenant logo and applies tenant accent colors to UI elements `S`
8. [x] Role-Based Access Control — Enforce Agency Admin, Tenant Admin, and Tenant Viewer permissions across all routes and API endpoints `M`
9. [x] Tenant User Management — Allow Tenant Admins to invite, list, and deactivate view-only users within their tenant `M`
10. [x] User Profile & Settings — Build profile page for users to update their name and password `XS`

## Milestone 2: Report Weeks & Manual Content

11. [x] Report Week Data Model — Define schema for report weeks with start/end dates, status (draft/published), and tenant association `S`
12. [x] Report Week CRUD — Build interface for agency admins to create, list, and manage report weeks per tenant with date validation `M`
13. [x] Draft/Publish Workflow — Implement status transitions with publish action that locks the report week from further edits `S`
14. [x] Rich Text Editor Integration — Add rich text editor component for authoring weekly narrative content with formatting support `M`
15. [x] Weekly Narrative Section — Build editable narrative field on report week with autosave and preview functionality `S`
16. [x] Initiatives Section — Add initiatives field for listing current marketing initiatives with bullet point formatting `S`
17. [x] Needs From Client Section — Add field for agency to communicate action items or requests to the client `S`
18. [x] Report Week Preview — Build preview page showing all manual content sections as they will appear to clients `S`
19. [x] Published Report View — Create read-only view of published report weeks with all content sections for tenant users `M`

## Milestone 3: Data Sync & Dashboards

20. [x] ClientTether API Client — Build typed API client for fetching leads, pipeline, hot list, notes, and schedule data from ClientTether `M`
21. [x] Raw Snapshot Storage — Store raw API responses with timestamps for audit trail and debugging purposes `S`
22. [x] Normalized Data Tables — Define and migrate tables for leads, pipeline_items, hot_list_items, notes, and scheduled_activities `M`
23. [x] Sync Worker Implementation — Build Node.js worker that runs hourly to fetch and normalize ClientTether data per tenant `L`
24. [x] Sync Status Tracking — Track last successful sync time per tenant and display freshness indicator in UI `S`
25. [x] Sync Error Handling — Implement retry logic with exponential backoff and error logging for failed syncs `S`
26. [x] Cached Fallback Display — Serve dashboard data from local database when sync fails, with warning banner showing data age `S`
27. [x] Leads Dashboard — Build dashboard view showing lead counts, sources, and status breakdown with ECharts visualizations `M`
28. [x] Pipeline Dashboard — Create pipeline view with stage breakdown, values, and progression charts `M`
29. [x] Hot List View — Display prioritized hot list items with key details and status indicators `S`
30. [x] Notes View — Show recent notes and communications with filtering and search capabilities `M`
31. [x] Schedule View — Display scheduled activities and appointments in list and calendar formats `M`
32. [x] Dashboard Navigation — Build tabbed navigation between dashboard views with active state and deep linking `S`

## Milestone 4: Reports History & PDF Export

33. [x] Reports History Index — Build paginated list of all published report weeks for a tenant with year/month filtering `M`
34. [x] Historical Report Detail — Create detail view for accessing any historical published report with all sections `S`
35. [x] Year/Month Filter Controls — Add dropdown filters for browsing reports by year and month `S`
36. [x] PDF Export Feature Flag — Implement feature flag system to enable/disable PDF export per tenant `XS`
37. [x] PDF Template Design — Create Playwright-compatible HTML template matching the portal report layout for PDF generation `M`
38. [x] PDF Generation Worker — Build background worker using Playwright to render and generate PDF files from published reports `L`
39. [x] PDF Download UI — Add download button on published reports that triggers PDF generation and provides download link `S`

> Notes
> - Order items by technical dependencies and product architecture
> - Each item should represent an end-to-end (frontend + backend) functional and testable feature
> - Milestone 1 establishes all foundational infrastructure before building features
> - Milestone 2 can begin once core auth and tenant management are complete
> - Milestone 3 requires tenant infrastructure but can parallelize with Milestone 2
> - Milestone 4 depends on published reports existing from Milestone 2
