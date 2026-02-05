# Raw Idea

**API Integration for Mellon Portal** - Wire up real ClientTether API data to the dashboard. The feedback PDF defines what each KPI card should show, pipeline stage definitions, and weekly lead capture requirements. The project already has a ClientTether client but the dashboard shows placeholder data. Key areas include:

- Connecting to the ClientTether API using X-Access-Token and X-Web-Key authentication
- Updating dashboard KPI cards to show correct metrics (New Leads Past 7 Days, Total Leads in Pipeline, Priority Candidates, Weighted Pipeline Value)
- Pipeline value = combined dollar amount from "New Lead" through "FA Sent" stages
- Qualified Candidates = candidates from "QR Returned" through "FA Sent" stages
- Weekly lead capture and snapshot functionality
- Sync worker already exists but needs to be wired to real API data

The project is located at /Users/dustin/dev/github/mellon-portal
