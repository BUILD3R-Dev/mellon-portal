# Specification: ClientTether API Integration - Dashboard Data Wiring

## Goal
Wire the existing dashboard page to display real KPI metrics, lead trend charts, and pipeline stage breakdowns sourced from locally synced ClientTether data, replacing all static placeholder values with live, queryable data from the PostgreSQL database.

## User Stories
- As a tenant user, I want to see my real KPI numbers (new leads, total pipeline, priority candidates, weighted pipeline value) on the dashboard so that I can monitor franchise development performance at a glance.
- As a tenant user, I want to toggle between "current report week" and "rolling 7 days" so that I can view metrics through whichever time window is most relevant to me.
- As a tenant user, I want to see lead trend and pipeline stage charts populated with historical weekly data so that I can track performance over time.

## Specific Requirements

**KPI Card Data Wiring**
- Replace the 4 static HTML KPI cards in `dashboard.astro` with the existing `KPICard.tsx` React component rendered as Astro client islands (`client:load`)
- Card 1 "New Leads": Count of leads created from Monday of the current week through the current day (or rolling 7 days if toggled)
- Card 2 "Total Leads in Pipeline": Count of all active contacts across all pipeline stages (not time-window dependent)
- Card 3 "Priority Candidates": Count of contacts in stages from "QR Returned" through "FA Sent" (not time-window dependent)
- Card 4 "Weighted Pipeline Value": Combined dollar amount from contacts in stages "New Lead" through "FA Sent" (not time-window dependent)
- Each KPI card should use the existing `loading` prop to show a skeleton pulse state while data is being fetched

**New API Endpoint: /api/dashboard/kpi**
- Create `GET /api/dashboard/kpi` that returns all four KPI values in a single response
- Accept a query parameter `timeWindow` with values `report-week` (default) or `rolling-7` to control the New Leads calculation
- Follow the exact authentication and tenant-scoping pattern established in `leads.ts` and `notes.ts` (session cookie validation, tenant cookie, membership check)
- Return typed `{ success: true, data: { newLeads, totalPipeline, priorityCandidates, weightedPipelineValue } }` response shape
- Query from `pipelineStageCounts` and `leadMetrics` tables; do not call ClientTether API directly

**New API Endpoint: /api/dashboard/pipeline**
- Create `GET /api/dashboard/pipeline` that returns per-stage contact counts and dollar amounts
- Accept a query parameter `weeks` (default `4`) to control how many weeks of historical data to return for chart rendering
- Return data shaped for the `HorizontalBarChart` component: an array of `{ stage, count }` objects for the current snapshot
- Also return weekly trend data shaped for the `LeadsChart` component: an array of `{ source: weekLabel, leads: count }` objects
- Follow the same auth/tenant pattern as existing dashboard API routes

**Per-User Time Window Toggle**
- Add a toggle UI element to the dashboard page header area allowing users to switch between "Current Report Week" and "Rolling 7 Days"
- Store the preference in `localStorage` so it persists across page reloads without requiring a database column
- When toggled, re-fetch KPI data from `/api/dashboard/kpi` with the updated `timeWindow` parameter
- Only the "New Leads" KPI is affected by this toggle; the other three KPIs are pipeline-wide and not time-filtered

**Chart Data Integration**
- Wire the existing `LeadsChart.tsx` component to display weekly new lead counts over the selected time range (default 4 weeks)
- Wire the existing `HorizontalBarChart.tsx` component to display the pipeline-by-stage breakdown using current `pipelineStageCounts` data
- Add a time range selector (dropdown or segmented control) above the charts area with a "4 weeks" default value, designed so additional ranges (8 weeks, 12 weeks) can be added as simple option values later
- Charts fetch data from `/api/dashboard/pipeline` and re-fetch when the time range selector changes

**Dashboard Page Conversion**
- Replace the static HTML placeholders in `dashboard.astro` with React island components using `client:load` directive
- The page layout (grid structure, heading, "View Latest Report" link) stays in Astro; only interactive elements become React islands
- Replace the static sync banner HTML with the existing `SyncStatusBanner.tsx` component (also as a `client:load` island)
- Create a single parent `DashboardIsland.tsx` React component that coordinates fetching KPI and chart data, manages the time window toggle state, and renders the KPI cards, charts, and time range selector together

**Schema and Sync Adjustments**
- The `pipelineStageCounts` table needs a `dollarValue` decimal column to store the combined dollar amount per stage (currently only stores `count`)
- The sync worker's `normalizePipelineStages` function needs to sum `value` from `CTOpportunityResponse` per stage and write it to the new `dollarValue` column
- The `ClientTetherClient.request()` method currently sends `Authorization: Bearer` but ClientTether uses `X-Access-Token` header per the API settings page; update the header to use `X-Access-Token` instead of `Authorization: Bearer`
- Add a per-tenant `clienttetherAccessToken` text column to the `tenants` table (the `clienttetherWebKey` column already exists) so each tenant can store its own access token

**Weekly Lead Snapshot Mechanism**
- Extend the sync worker to create a weekly snapshot of lead counts and pipeline stage counts tied to the `reportWeeks` table each Sunday (or at the end of the Monday-Sunday week cycle)
- The snapshot should insert rows into `leadMetrics` and `pipelineStageCounts` with a `reportWeekId` linking them to the corresponding `reportWeeks` record
- These report-week-linked rows are the historical data that powers the Lead Trends chart over multiple weeks
- Current/live data rows continue to have `reportWeekId = null` as the sync worker already does

## Visual Design

**`planning/visuals/feedback-page-2.png`**
- Shows 4 KPI cards in a horizontal row: #1 "New Leads - Past 7 Days" (purple circle), #2 "Total Leads in Pipeline" (blue circle), #3 "Priority Candidates" (green circle), #4 "Weighted Pipeline Value" (orange circle)
- All cards currently display "--" placeholder values that need to be replaced with live data
- Below the cards: "Lead Trends" chart area on the left, "Pipeline by Stage" chart area on the right, both showing "Chart will be rendered here" placeholder text
- Yellow "Data last synced" banner at bottom of page with green dot indicator

**`planning/visuals/feedback-page-3.png`**
- Shows the ClientTether Prospects Pipeline view with early stages: New Lead, Outbound Call, Inbound Contact, Initial Call Scheduled, Initial Call Complete, QR
- Each stage column shows a dollar amount and contact count (e.g., "$0 - 3")
- "199 in Prospects Pipeline" total count is highlighted, confirming "Total Leads in Pipeline" = total active contacts
- Annotation at bottom: "Pipeline value is combined dollar amount in all stages from New Lead to FA Sent"

**`planning/visuals/feedback-page-4.png`**
- Shows later pipeline stages: QR Returned, FDD Sent, FDD Signed ($90,000 - 3), FDD Review Call Sched., FDD Review Call Compl.
- Green circle around "QR Returned" with annotation: "Qualified Candidates are all candidates from QR Returned through FA Sent Stages"
- Green arrow pointing right through the later stages, confirming the stage range for the Priority Candidates KPI
- Individual contact cards show dollar values confirming per-contact value data is available

**`planning/visuals/feedback-page-5.png`**
- Shows individual contact detail view with dollar value ($90,000), close date, sales cycle stage, lead source fields
- Confirms that per-contact dollar values and stage assignments are the source data for pipeline value calculations

**`planning/visuals/feedback-page-6.png`**
- Shows the Prospects List view with "Created Date" column highlighted and annotation "Capture Leads on a weekly basis"
- Bottom section shows report filter with "Week To Date" option and date range selectors (January 26-January 26, 2026)
- Confirms the "Created Date" field is the basis for weekly lead capture snapshots

**`planning/visuals/clienttether-api-settings.png`**
- Shows API Details section with Access Token labeled as `[X-Access-Token]` and Web Key labeled as `[X-Web-Key]`
- Instructions state to use them as request headers: `X-Access-Token: <value>` and `X-Web-Key: <value>`
- Confirms the existing client's `Authorization: Bearer` approach is incorrect and must be changed to `X-Access-Token` header

## Existing Code to Leverage

**`src/pages/api/dashboard/leads.ts` - API route auth pattern**
- Provides the exact authentication flow to replicate: session cookie validation, tenant cookie extraction, membership-based access check, agency admin handling
- Response shape pattern `{ success: true, data: {...} }` and error shape `{ success: false, error: string, code: string }` should be reused identically in the new `/kpi` and `/pipeline` endpoints
- Uses Drizzle ORM `db.select().from().where()` query pattern that should be followed

**`src/components/dashboard/KPICard.tsx` - KPI display component**
- Already built with `label`, `value`, `subtitle`, `loading`, and `className` props
- Has built-in skeleton loading state with `animate-pulse`
- Uses the same Tailwind classes as the static HTML cards in `dashboard.astro`, so swapping in this component is a direct visual replacement

**`src/components/dashboard/LeadsChart.tsx` and `HorizontalBarChart.tsx` - Chart components**
- Both use `echarts-for-react` with SVG renderer and are ready to accept data props
- `LeadsChart` expects `{ source: string, leads: number }[]` -- `source` can be repurposed as a week label for the lead trends chart
- `HorizontalBarChart` expects `{ stage: string, count: number }[]` -- directly matches the pipeline stage breakdown data shape

**`worker/sync.ts` - Sync worker with normalization logic**
- Already fetches leads and opportunities from ClientTether and normalizes into `leadMetrics` and `pipelineStageCounts` tables
- `normalizePipelineStages()` groups opportunities by stage and writes counts; needs to be extended to also sum dollar values
- `normalizeLeadMetrics()` groups by source and status; the weekly snapshot mechanism should extend this to write report-week-linked rows
- Uses `fetchWithRetry()` with exponential backoff that should be kept intact

**`src/lib/clienttether/client.ts` - API client**
- Has typed response interfaces (`CTLeadResponse`, `CTOpportunityResponse`) with `value`, `stage`, `created_at` fields needed for KPI calculations
- The `request()` method needs its auth header changed from `Authorization: Bearer` to `X-Access-Token` per ClientTether's actual API requirements
- `createClientTetherClient()` factory function already reads from env vars and accepts a per-tenant `webKey`

## Out of Scope
- Hot List dashboard tab -- do not modify
- Notes dashboard tab -- do not modify
- Schedule dashboard tab -- do not modify
- Dynamic pipeline stage name discovery or per-tenant stage configuration (stages are consistent across all tenants)
- Real-time ClientTether API calls from the dashboard (always read from local synced tables)
- Changes to the sync worker's cron schedule or core architecture (only extend normalization and add snapshot logic)
- PDF export or report generation functionality
- Reports History page or features
- Any changes to the `PieChart.tsx` component (not used in this spec's dashboard charts)
- User authentication or session management changes
