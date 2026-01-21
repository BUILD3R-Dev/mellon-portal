# Mellon Franchising Client Portal — Product Requirements Document (PRD)

**Document status:** Draft (v1)  
**Owner:** Mellon Franchising (Agency) / Implementation by BUILD3R  
**Primary objective:** Replace manual weekly PDF reporting with a modern, co‑branded, multi‑tenant portal that clients can log into any time for up‑to‑date performance, pipeline visibility, and weekly narratives.

---

## 1) Summary

Mellon Franchising currently produces a weekly franchise performance report as a PDF and emails it to clients. The new system will provide a secure portal where:

- **Agency users (Mellon staff)** can manage tenants (franchise brands), invite users, and create/edit weekly narrative content.
- **Tenant users (franchise brand clients)** can log in to view reports, dashboards, charts, and historical weeks.
- Performance data is pulled from **ClientTether API**, synchronized into a local database on a schedule (hourly to start), and served from the local DB for speed and reliability.
- Weekly “Report Weeks” support a **Draft → Published** workflow, so Mellon staff can curate content and publish an official snapshot for each week.

---

## 2) Goals and non‑goals

### Goals
1. **Professional, modern UI** with clean typography, layout, charts, and consistent spacing.
2. **Multi‑tenant, co‑branded** experience: Mellon branding + tenant brand identity (logo/colors).
3. **Role‑based access control**:
   - Mellon can see and manage all tenants.
   - Tenant users only see their tenant’s data.
4. **Near real‑time insights** via scheduled sync (hourly, adjustable), with cached fallback.
5. **Historical browsing** of weekly reports and trend views.
6. **Weekly report workflow**: create/edit draft content and publish.

### Non‑goals (initial release)
- Multi‑tenant billing/subscriptions.
- Webhook‑driven real‑time updates (design should not block this later).
- Advanced self‑serve analytics builder or custom dashboards for tenants.
- Complex filter/query builders (start minimal; expand later).

---

## 3) Personas

### 3.1 Mellon Agency Admin / Staff
- Creates and manages tenants (franchise brands).
- Invites agency users and tenant users.
- Edits weekly manual content (narrative, initiatives, needs from client).
- Publishes weekly reports.
- Monitors sync status and troubleshooting.

### 3.2 Tenant Admin (Client)
- Represents a franchise brand.
- Can invite/manage **view‑only** users within their tenant.
- Views all reports and dashboards for their tenant.

### 3.3 Tenant Viewer (Client)
- View‑only access to tenant dashboards and reports.

---

## 4) Tenancy model

- **Tenant = franchise brand**.
- Each tenant has isolated data and branding settings.
- Some users (agency) can access **all tenants**; tenant users access **one tenant**.

### Co‑branding rules (default)
- Mellon logo + tenant logo displayed in the header.
- Tenant colors influence accents (buttons, highlights, chart palette accents), while the overall UI remains neutral/professional to avoid “over‑theming.”

---

## 5) Definitions

### 5.1 Report Week (core concept)
A Report Week is a first‑class object that unifies:
- Synced metrics from ClientTether
- Manual narrative content written by Mellon
- A “snapshot” view once published

**Work week definition**
- Week runs **Monday → Friday**, “week ending” is **Friday**.
- Store tenant timezone; compute boundaries in tenant timezone:
  - `period_start_at`: Monday 00:00:00
  - `period_end_at`: Friday 23:59:59
  - `week_ending_date`: Friday (date)
- Publishing may occur after period end; the Report Week is the official version.

### 5.2 Draft → Published
- `DRAFT`: Mellon can edit manual sections; numbers are shown from latest synced data.
- `PUBLISHED`: “official snapshot” for that week; displayed as “Latest Published” for clients.

---

## 6) High‑level user journeys

### 6.1 Tenant user (client) journey
1. Receives invite email → sets password / completes onboarding
2. Logs in → sees Dashboard
3. Views “Latest Published” week + can browse historical weeks
4. Navigates to Leads / Pipeline / Hot List / Notes / Schedule
5. Optional: downloads PDF (if enabled)

### 6.2 Mellon staff journey
1. Creates tenant and sets branding
2. Invites tenant admin + optional tenant viewers
3. Reviews data freshness / sync status
4. Creates/edits this week’s Report Week draft content
5. Previews report
6. Publishes the week

---

## 7) Functional requirements

### 7.1 Authentication & account lifecycle
- Email + password authentication (session cookie).
- Invite flow:
  - Admin creates user (agency or tenant) → email invite token
  - User sets password (and optionally name, timezone)
- Password reset (required for production readiness).

### 7.2 Roles & permissions (RBAC)
| Capability | Agency Admin | Tenant Admin | Tenant Viewer |
|---|---:|---:|---:|
| View tenant dashboards/reports | ✅ all tenants | ✅ own tenant | ✅ own tenant |
| Manage tenants (create/edit branding) | ✅ | ❌ | ❌ |
| Invite/manage agency users | ✅ | ❌ | ❌ |
| Invite/manage tenant users | ✅ | ✅ (viewers only) | ❌ |
| Edit manual weekly content | ✅ | ❌ | ❌ |
| Publish Report Week | ✅ | ❌ | ❌ |
| View sync logs / trigger manual sync | ✅ | ❌ | ❌ |

### 7.3 Tenant administration
- Create tenant (franchise brand)
- Tenant settings:
  - Name, timezone
  - Branding: logos, primary/accent colors, optional header layout
  - ClientTether integration settings (web key per tenant and other mapping fields)
- Tenant user list:
  - Invite user
  - Disable/remove user access

### 7.4 Reporting UI (client-facing)
**Primary navigation (tenant):**
- Dashboard
- Reports (Weekly history)
- Leads
- Pipeline
- Hot List
- Notes (read-only)
- Schedule / Initiatives (read-only)

**Weekly Report view** should modernize and unify the “PDF sections”:
- Leads Report (charts + table)
- Pipeline stage chart / summary
- Pipeline Hot List table
- Candidate Narrative (read-only for clients)
- Initiatives & Discovery Days (read-only)
- What we need from the client (read-only)

### 7.5 Manual weekly content (Mellon-only)
For each Report Week:
- Candidate Narrative (rich text)
- Initiatives & Discovery Days (structured list or rich text)
- What we need from client (rich text)
- “Copy forward last week’s content” helper

### 7.6 Reports history
- List Report Weeks for a tenant
- Filters/sorting:
  - By year / month
  - By published status (tenant users only see Published)
- “Latest Published” indicator

### 7.7 Data ingestion (ClientTether sync)
- Background worker pulls from ClientTether API and stores:
  1) Raw snapshots (JSON payloads)
  2) Normalized tables for fast queries
- Sync cadence:
  - Default: hourly
  - Configurable per tenant (future); optionally limit to business hours (future)
- Incremental updates:
  - Where supported, use modified date windows to avoid full re-pulls
- Sync run tracking:
  - last successful time
  - records processed
  - errors (with trace IDs)

### 7.8 Cached fallback + freshness warnings
- Portal serves from local DB; if sync fails, serve last known data.
- Show freshness indicator:
  - Updated within 24h: normal
  - >24h: warning banner
  - >72h: critical banner + “contact support” callout

### 7.9 PDF export (optional feature flag)
- Generate a PDF for a **Published** Report Week.
- PDF should match portal styling (print from the report page).
- Download link from the report page.

### 7.10 Weekly email (optional, likely disabled initially)
- Opt-in preference at the user or tenant level.
- Friday morning send (week ending Friday or week ending prior Friday depending on chosen publish schedule).
- Not enabled by default (goal is to drive portal adoption).

---

## 8) Data & analytics requirements

### 8.1 Minimum data sets to support V1 UI
The portal must support:
- Lead metrics (by source / campaign / region as available)
- Pipeline stage counts (for chart)
- Hot list candidates (tabular)
- Events or schedule items (if available) OR manual schedule entry
- Manual narrative / initiatives content

### 8.2 Field mapping configurability (important)
ClientTether implementations may vary. Provide a per‑tenant mapping configuration for:
- Lead source identification
- Qualified lead logic (tag/field/stage)
- Pipeline stage mapping (cycle/stage naming differences)
- “Units”, “Weighted Units”, “% likely” (if derived from custom fields)

---

## 9) Non‑functional requirements

### 9.1 Performance
- Dashboard and report pages should load quickly (target: < 1.5s TTFB under normal load).
- Use SSR for initial render; keep client-side JS minimal.

### 9.2 Reliability
- If ClientTether is down, portal must remain usable with cached data.
- Sync worker must be idempotent and safe to retry.

### 9.3 Security
- Secure cookie sessions; CSRF protection where applicable.
- Tenant isolation enforced at query and route layers.
- Secrets stored securely (never in client code).
- Audit log (recommended for V1.1): user invites, role changes, publish events.

### 9.4 Maintainability
- Clear domain boundaries:
  - Web app (SSR)
  - Sync worker (data ingestion)
- Versioned DB migrations.
- Structured logging with correlation IDs.

---

## 10) Proposed technical architecture

### 10.1 Services
1. **Portal Web (Astro SSR)**
   - Serves pages and internal API routes
   - Handles auth, RBAC, admin UI, report rendering

2. **Sync Worker**
   - Scheduled job (hourly)
   - Calls ClientTether API using:
     - Enterprise access token (global)
     - Tenant web key (per tenant)
   - Writes to Postgres

### 10.2 Data storage
- **Postgres** (primary relational store)
- Optional object storage (S3/MinIO) for PDFs (if enabled)

### 10.3 UI technology choices (goal: premium look)
- Tailwind CSS + shadcn/ui for consistent components
- ECharts for charts (polished dashboard visuals)
- React islands for charts, advanced tables, and rich editors

---

## 11) Suggested database schema (high level)

### Core
- `tenants` (id, name, timezone, status, created_at)
- `tenant_branding` (tenant_id, melon_logo_url, tenant_logo_url, primary_color, accent_color, header_layout, updated_at)
- `users` (id, email, name, status, created_at)
- `memberships` (user_id, tenant_id, role, created_at)

### Weekly reporting
- `report_weeks` (id, tenant_id, week_ending_date, period_start_at, period_end_at, status, published_at, published_by)
- `report_week_manual` (report_week_id, narrative_rich, initiatives_rich, needs_rich, discovery_days_rich, updated_at)

### Sync
- `sync_runs` (id, tenant_id, started_at, finished_at, status, error_message, records_updated)
- `ct_raw_snapshots` (id, tenant_id, endpoint, fetched_at, payload_json)

### Normalized metrics (initial)
- `lead_metrics` (tenant_id, report_week_id, dimension_type, dimension_value, clicks, impressions, cost, leads, qualified_leads, created_at)
- `pipeline_stage_counts` (tenant_id, report_week_id, stage, count)
- `hot_list_items` (tenant_id, report_week_id, candidate_name, market, units, weighted_units, iff, weighted_iff, sales_lead, stage, likely_pct, raw_json)

### Optional
- `report_exports` (tenant_id, report_week_id, pdf_url, created_at)
- `audit_log` (actor_user_id, tenant_id, action, metadata_json, created_at)

---

## 12) UX requirements (polish checklist)

### Visual style
- Neutral, modern base palette (grays) with tenant accent color sparingly applied
- Clear hierarchy: headers, KPI cards, section dividers
- Consistent spacing and component sizing (design tokens)
- Professional tables:
  - sticky headers where useful
  - clear number formatting (currency, percent)
  - pagination for large datasets

### Navigation
- Tenant switcher visible only to Mellon agency users
- Breadcrumbs inside Weekly Report view
- “Latest Published” CTA from dashboard

### Empty & error states
- Friendly onboarding empty states (no data yet, sync in progress)
- Sync failure states with cached fallback and clear banner messaging

---

## 13) Milestones & delivery plan

### Milestone 1 — Foundations (Auth + tenants + branding + roles)
- Astro SSR app skeleton
- Auth + invite flow
- Tenant admin UI (create tenant, branding)
- Memberships and RBAC enforcement
- Tenant selection for agency users

**Output:** Users can log in and see tenant-scoped shell UI.

### Milestone 2 — Report Weeks + Draft/Publish + manual content editor
- Report week creation + period calculations (Mon–Fri)
- Manual content editor (Mellon only)
- Preview + publish workflow
- Tenant users view published reports only

**Output:** Mellon can produce curated weekly reports in the portal.

### Milestone 3 — Sync worker + normalized metrics + dashboards
- Sync worker service
- Raw snapshots + first normalized tables (leads, pipeline counts, hot list)
- Data freshness badge + sync status page
- Render Leads/Pipeline/Hot List pages

**Output:** Portal shows real data reliably with caching and freshness warnings.

### Milestone 4 — PDF export (optional)
- Print Published report to PDF
- Store and download PDF
- (Optional) opt-in preference UI for weekly email (disabled by default)

---

## 14) Open questions (track in backlog)

1. **ClientTether tenant separation:** Is there one web key per tenant, or is tenant separation via tags/filters within one web key?
2. **Pipeline stages:** Final canonical stage list/order will be derived from ClientTether sales cycles.
3. **Discovery Days source:** Confirm if these are available as events in ClientTether or remain manual.
4. **Qualified lead definition:** Confirm exact rule per tenant (tag/custom field/stage).
5. **Publish schedule:** Do we publish after Friday end-of-day, or Friday morning as a “week-to-date” snapshot?
6. **Data volume:** Expected counts of leads/opportunities per week to tune pagination and indexing.

---

## 15) Acceptance criteria (release-level)

### V1 is considered successful when:
- Mellon can create tenants, brand them, invite users, and publish weekly reports.
- Tenant users can log in and view:
  - dashboard
  - weekly report history
  - leads/pipeline/hot list sections with modern charts/tables
- Data stays available during API outages via cached DB reads.
- Freshness banner accurately reflects last successful sync.
- Pages are fast and feel premium and professional.

---

## Appendix A — Recommended stack (implementation guidance)

- Astro SSR + React islands
- Tailwind CSS + shadcn/ui
- ECharts (charts)
- Auth.js (sessions + invite flow)
- Postgres + Drizzle ORM
- Sync worker (Node) on schedule
- Playwright for PDF print (optional)
