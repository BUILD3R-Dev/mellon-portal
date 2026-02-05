# Spec Requirements: ClientTether API Integration

## Initial Description
API Integration for Mellon Portal - Wire up real ClientTether API data to the dashboard. The feedback PDF defines what each KPI card should show, pipeline stage definitions, and weekly lead capture requirements. The project already has a ClientTether client but the dashboard shows placeholder data. Key areas include:

- Connecting to the ClientTether API using X-Access-Token and X-Web-Key authentication
- Updating dashboard KPI cards to show correct metrics (New Leads Past 7 Days, Total Leads in Pipeline, Priority Candidates, Weighted Pipeline Value)
- Pipeline value = combined dollar amount from "New Lead" through "FA Sent" stages
- Qualified Candidates = candidates from "QR Returned" through "FA Sent" stages
- Weekly lead capture and snapshot functionality
- Sync worker already exists but needs to be wired to real API data

## Requirements Discussion

### First Round Questions

**Q1:** The feedback PDF defines "Qualified Candidates" as candidates in stages "QR Returned" through "FA Sent". The dashboard KPI card is labeled "Priority Candidates". Are these the same metric, or is "Priority Candidates" different (e.g., based on the ClientTether "Priority" flag)?
**Answer:** Priority Candidates = Qualified Candidates. They are the same thing. Candidates from "QR Returned" through "FA Sent" stages.

**Q2:** "New Leads - Past 7 Days" -- should this be leads with a Created Date within the last 7 rolling days, or based on the current report week (Monday through Sunday)?
**Answer:** Keep it as current report week (Monday through current day). BUT add a configuration option to switch the entire dashboard view to "rolling 7 days" instead. This toggle would change all dashboard metrics to use rolling 7-day window.

**Q3:** For "Total Leads in Pipeline", should this include only active pipeline contacts, or all contacts regardless of status?
**Answer:** Only active pipeline contacts.

**Q4:** Are pipeline stage names consistent across all tenant accounts in ClientTether, or does each franchise brand have their own stage names?
**Answer:** Consistent across all tenants. No need for dynamic stage name handling.

**Q5:** The feedback PDF mentions "Capture Leads on a weekly basis" and shows a "Week To Date" report filter. Is this for weekly report snapshots to support the Lead Trends chart?
**Answer:** Yes, this is for the weekly report. Need a weekly snapshot of leads from Monday through Sunday to support the Lead Trends chart and weekly reports.

**Q6:** The dashboard shows two chart areas: "Lead Trends" and "Pipeline by Stage". What time range should these charts display by default?
**Answer:** Start with 4 weeks default. Make it selectable so more ranges can be added later.

**Q7:** Should the dashboard ever call the ClientTether API in real-time, or always read from local synced tables?
**Answer:** Always read from local synced tables. No real-time API calls from the dashboard.

**Q8:** Should this spec include changes to the Hot List, Notes, or Schedule dashboard tabs, or focus only on the main dashboard KPIs and charts?
**Answer:** Only the main dashboard KPIs and charts. Do not touch Hot List, Notes, or Schedule tabs.

### Existing Code to Reference

**Similar Features Identified:**

- Feature: Dashboard page - Path: `src/pages/dashboard.astro` (static HTML with "--" placeholders, needs to be wired to live data)
- Feature: KPI Card component - Path: `src/components/dashboard/KPICard.tsx` (exists but unused, needs to be integrated)
- Feature: Chart components - Paths: `src/components/dashboard/LeadsChart.tsx`, `src/components/dashboard/PieChart.tsx`, `src/components/dashboard/HorizontalBarChart.tsx` (exist but not wired up)
- Feature: Sync status banner - Path: `src/components/dashboard/SyncStatusBanner.tsx`
- Feature: Database schema - Path: `src/lib/db/schema.ts` (has `leadMetrics`, `pipelineStageCounts`, `hotListItems` tables)
- Feature: Dashboard API (leads) - Path: `src/pages/api/dashboard/leads.ts`
- Feature: Dashboard API (notes) - Path: `src/pages/api/dashboard/notes.ts`
- Feature: Dashboard API (schedule) - Path: `src/pages/api/dashboard/schedule.ts`
- Feature: Sync status API - Path: `src/pages/api/sync/status.ts`
- Feature: Sync worker - Path: `worker/sync.ts` (exists with full normalization logic)
- Feature: ClientTether client - Path: `src/lib/clienttether/client.ts`

**Missing API routes that need to be created:**
- `/api/dashboard/kpi` - new endpoint for KPI card data
- `/api/dashboard/pipeline` - new endpoint for pipeline stage breakdown

### Follow-up Questions

**Follow-up 1:** The dashboard time toggle between "current report week" and "rolling 7 days" -- is this a per-tenant setting managed by Agency Admins, or a per-user UI toggle that individual viewers can flip?
**Answer:** This should be a per-user UI toggle, not a per-tenant admin setting. Each individual user can switch their own dashboard view between "current report week" (Monday through current day) and "rolling 7 days".

**Follow-up 2:** Confirmation of existing code paths for dashboard page, KPI cards, chart components, schema, API routes, sync worker, and ClientTether client.
**Answer:** All paths confirmed as listed above in "Existing Code to Reference". The dashboard page is currently static HTML with "--" placeholders. KPI card and chart React components exist but are not wired up. The sync worker exists with full normalization logic. The schema already has the needed tables.

## Visual Assets

### Files Provided:
- `Mellon Dashboard Feedback 1.28.26.pdf` (6 pages): Annotated feedback document defining KPI card meanings, pipeline stage definitions, and weekly lead capture requirements
  - Page 1: Title page - "Mellon Feedback on Dashboard" dated 1.28.26
  - Page 2: Annotated screenshot of current Mellon Portal dashboard showing 4 KPI cards with color-coded circles labeling each card: #1 "New Leads - Past 7 Days" (purple), #2 "Total Leads in Pipeline" (blue), #3 "Priority Candidates" (green), #4 "Weighted Pipeline Value" (orange). All cards show "--" placeholder values. Below the cards: "Lead Trends" and "Pipeline by Stage" chart areas with "Chart will be rendered here" text. Yellow "Data last synced" banner at bottom.
  - Page 3: ClientTether Prospects Pipeline view showing early stages (New Lead, Outbound Call, Inbound Contact, Initial Call Scheduled, Initial Call Complete, QR). Orange circles highlight the first stages. Annotation at bottom: "Pipeline value is combined dollar amount in all stages from 'New Lead' to 'FA Sent'". Shows "199 in Prospects Pipeline" total.
  - Page 4: Continuation of pipeline showing later stages (QR Returned, FDD Sent, FDD Signed at $90,000 with 3 contacts, FDD Review Call Sched., FDD Review Call Compl.). Green circle around "QR Returned" with annotation: "Qualified Candidates are all candidates from QR Returned through FA Sent Stages". Green arrow pointing right through the later stages.
  - Page 5: Individual contact detail in ClientTether showing fields: dollar value ($90,000), close date, action plan, sales cycle stage, lead source, whiteboard/notes area, contact info, and assigned user.
  - Page 6: Prospects List view with table columns (Name, Email, Cell Phone, Action Plan, Sales Cycle, Lead Source, Created Date, Assigned User). Annotation "Capture Leads on a weekly basis" pointing to Created Date column. Bottom section shows report filter with "Week To Date" option and date range selectors.

- `clienttether-api-settings.png`: Screenshot of ClientTether backend settings page at ct.clienttether.com/backend/settings showing API configuration. Displays Username, User Id (33590), ClientTether Number, and Web Key. API Details section shows Access Token labeled as [X-Access-Token] and Web Key labeled as [X-Web-Key] with instructions to use them as request headers.

### Visual Insights:
- The 4 KPI cards are already laid out on the existing dashboard page with defined positions and labels
- Pipeline stages follow a defined linear progression: New Lead > Outbound Call > Inbound Contact > Initial Call Scheduled > Initial Call Complete > QR Returned > FDD Sent > FDD Signed > FDD Review Call Sched. > FDD Review Call Compl. > (additional stages)
- "FA Sent" is referenced as a boundary stage but not explicitly visible in the screenshots; it falls somewhere in the pipeline progression
- Each pipeline stage shows a dollar amount and contact count (e.g., "$90,000 - 3")
- Individual contact records have dollar values, close dates, and stage assignments that feed into pipeline value calculations
- The "Created Date" column in the Prospects List is key for weekly lead capture snapshots
- ClientTether uses "Week To Date" report filtering which aligns with the weekly snapshot requirement
- Authentication uses two headers: X-Access-Token and X-Web-Key, both provided on the API settings page
- Fidelity level: These are annotated screenshots of the production ClientTether UI and the existing Mellon Portal, not wireframes. They serve as functional specifications defining metric calculations rather than visual design direction.

## Requirements Summary

### Functional Requirements
- Wire up the 4 dashboard KPI cards to show real data from locally synced ClientTether tables:
  - **New Leads (Current Report Week)**: Count of leads created from Monday of the current week through the current day
  - **Total Leads in Pipeline**: Count of all active contacts across all pipeline stages
  - **Priority Candidates (Qualified Candidates)**: Count of contacts in stages "QR Returned" through "FA Sent"
  - **Weighted Pipeline Value**: Combined dollar amount of contacts in stages "New Lead" through "FA Sent"
- Implement a per-user UI toggle to switch all dashboard metrics between "current report week" (Monday through current day) and "rolling 7 days"
- Wire up the "Lead Trends" chart to show weekly new lead counts over time, defaulting to 4 weeks
- Wire up the "Pipeline by Stage" chart to show count or dollar breakdown by stage, defaulting to 4 weeks
- Make chart time range selectable (start with 4 weeks default, designed for easy addition of more ranges later)
- Implement weekly lead snapshot functionality: capture lead counts from Monday through Sunday to support Lead Trends chart and weekly reports
- Create new API endpoint `/api/dashboard/kpi` to serve KPI card data from local tables
- Create new API endpoint `/api/dashboard/pipeline` to serve pipeline stage breakdown data from local tables
- Connect existing React components (KPICard, LeadsChart, PieChart, HorizontalBarChart) to live API data
- Replace static HTML placeholder dashboard with interactive React island components
- Dashboard reads exclusively from locally synced tables, never calls ClientTether API directly

### Reusability Opportunities
- `src/components/dashboard/KPICard.tsx` -- existing component, needs to be wired to API data
- `src/components/dashboard/LeadsChart.tsx`, `PieChart.tsx`, `HorizontalBarChart.tsx` -- existing chart components, need data integration
- `src/components/dashboard/SyncStatusBanner.tsx` -- existing sync status display
- `src/lib/db/schema.ts` -- existing schema with `leadMetrics`, `pipelineStageCounts`, `hotListItems` tables
- `src/pages/api/dashboard/leads.ts` -- existing API route pattern to follow for new `/kpi` and `/pipeline` routes
- `worker/sync.ts` -- existing sync worker with normalization logic
- `src/lib/clienttether/client.ts` -- existing API client

### Scope Boundaries
**In Scope:**
- Wiring up the 4 main dashboard KPI cards to real synced data
- Creating `/api/dashboard/kpi` and `/api/dashboard/pipeline` API endpoints
- Connecting existing React chart components to live data
- Per-user UI toggle for "current report week" vs "rolling 7 days" metric window
- Weekly lead snapshot mechanism for Lead Trends chart
- Selectable chart time ranges (4-week default)
- Replacing static dashboard HTML with functional React island components

**Out of Scope:**
- Hot List dashboard tab (do not modify)
- Notes dashboard tab (do not modify)
- Schedule dashboard tab (do not modify)
- Dynamic pipeline stage name handling (stages are consistent across tenants)
- Real-time ClientTether API calls from the dashboard
- Any changes to the sync worker's schedule or core normalization logic
- PDF export functionality
- Reports History features

### Technical Considerations
- Authentication to ClientTether uses two headers: X-Access-Token and X-Web-Key (stored as environment variables per existing conventions)
- Pipeline stage names are hardcoded/consistent across all tenants -- no dynamic stage discovery needed
- Dashboard data served exclusively from local PostgreSQL tables populated by the hourly sync worker
- The per-user time window toggle needs client-side state management (could use localStorage or a lightweight preference store; does not require database persistence unless desired)
- Existing Drizzle ORM schema already has `leadMetrics` and `pipelineStageCounts` tables to query against
- Chart time range selector should be designed for extensibility (adding 8-week, 12-week, or quarter ranges later)
- Weekly snapshots need to be created reliably each week (likely tied to the existing sync worker or a separate scheduled job)
- Astro SSR with React islands architecture means dashboard interactivity (toggle, chart controls) lives in React components hydrated on the client
