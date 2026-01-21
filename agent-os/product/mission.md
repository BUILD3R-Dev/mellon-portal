# Product Mission

## Pitch

Mellon Franchising Client Portal is a multi-tenant, co-branded web application that helps franchise brand clients access real-time performance data, pipeline visibility, and weekly narratives by replacing manual PDF reporting with a modern self-service portal available 24/7.

## Users

### Primary Customers

- **Mellon Agency**: Marketing agency managing multiple franchise brand clients, requiring efficient report generation and client communication
- **Franchise Brands**: Client organizations (tenants) needing visibility into their marketing performance and lead pipeline

### User Personas

**Mellon Agency Admin/Staff** (25-55)
- **Role:** Marketing Account Manager or Operations Lead at Mellon
- **Context:** Manages multiple franchise brand accounts, creates weekly reports, monitors data sync status
- **Pain Points:** Manual PDF creation is time-consuming; email distribution is error-prone; clients constantly request historical reports
- **Goals:** Efficiently publish weekly updates for all clients; spend less time on report logistics and more on strategy

**Tenant Admin (Client)** (35-60)
- **Role:** Franchise Development Director or Marketing Manager at a franchise brand
- **Context:** Oversees franchise growth strategy, reports to executive leadership on marketing ROI
- **Pain Points:** Waits for weekly emails to see performance data; struggles to share reports with team members; cannot access historical data easily
- **Goals:** Access performance data on-demand; empower team with self-service visibility; track trends over time

**Tenant Viewer (Client)** (25-50)
- **Role:** Regional Director, Franchise Sales Rep, or Marketing Coordinator
- **Context:** Needs visibility into leads and pipeline for their area of responsibility
- **Pain Points:** Relies on others to forward reports; lacks context on weekly initiatives and priorities
- **Goals:** Stay informed on marketing performance; understand current priorities and hot leads

## The Problem

### Manual PDF Reporting is Unsustainable

Mellon Agency staff currently spend hours each week creating PDF reports for each franchise brand client, then manually emailing them out. Clients have no way to access data between reports or browse historical performance. This manual process does not scale as the client base grows.

**Our Solution:** A self-service portal where clients log in anytime to view up-to-date dashboards, read weekly narratives, and browse historical reports, all automatically synced from ClientTether.

### Clients Lack Real-Time Visibility

Franchise brands only see their performance data when Mellon sends the weekly PDF. If they have questions mid-week or need to share data with stakeholders, they must request it manually.

**Our Solution:** Automated hourly data sync from ClientTether with dashboard views showing leads, pipeline, hot list, notes, and scheduled activities, available 24/7.

### No Self-Service Access to History

When clients need to reference past performance or compare month-over-month trends, they must dig through email archives or request historical PDFs from Mellon.

**Our Solution:** A reports history feature allowing clients to browse and filter previous weeks by year and month, all within the portal.

## Differentiators

### Co-Branded Multi-Tenant Experience

Unlike generic reporting tools, the Mellon Portal provides each franchise brand with their own co-branded experience featuring their logo and accent colors alongside Mellon branding. This reinforces the agency-client partnership and creates a professional, white-label feel.

### Graceful Degradation with Cached Data

Unlike dashboards that break when external APIs are unavailable, the Mellon Portal maintains usability by serving cached data from the local database when ClientTether sync fails. Users see freshness warnings but can still access their reports and dashboards.

### Combined Automation and Editorial Control

Unlike fully automated dashboards that lack context, the Mellon Portal combines real-time synced metrics with manually authored weekly narratives, initiatives, and "needs from client" sections. This hybrid approach provides both data and strategic insight.

## Key Features

### Core Features

- **Email/Password Authentication:** Secure login with invite flow and password reset for controlled user onboarding
- **Multi-Tenant Architecture:** Complete data isolation per franchise brand with tenant-specific configuration
- **Co-Branding:** Tenant logo and accent colors displayed alongside Mellon branding for a partnership feel
- **Role-Based Access Control:** Agency Admin, Tenant Admin, and Tenant Viewer roles with appropriate permissions

### Report Management Features

- **Report Week Workflow:** Draft and Published states with Monday-Friday week periods for editorial control
- **Manual Weekly Content:** Rich text editor for narratives, initiatives, and needs from client sections
- **Reports History:** Browse and filter historical weeks by year and month for trend analysis

### Data & Dashboard Features

- **ClientTether API Sync:** Hourly automated sync with raw snapshots and normalized tables
- **Performance Dashboards:** Leads, Pipeline, Hot List, Notes, and Schedule views with clear visualizations
- **Cached Fallback:** Serve from local database if sync fails, with freshness warnings displayed to users

### Advanced Features

- **PDF Export:** Optional feature-flagged capability to generate PDF reports from published weeks
