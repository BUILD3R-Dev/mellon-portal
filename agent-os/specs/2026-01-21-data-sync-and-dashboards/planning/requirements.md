# Spec Requirements: Milestone 3 - Data Sync & Dashboards

## Initial Description

Milestone 3 focuses on integrating with the ClientTether API to sync external marketing data and display it through interactive dashboards within the portal. This milestone enables the agency to pull real-time data about leads, pipeline, hot list items, notes, and scheduled activities, then present this data to clients through various dashboard views.

This milestone includes 13 features (items 20-32 from the roadmap):

1. ClientTether API Client - Build typed API client for fetching leads, pipeline, hot list, notes, and schedule data
2. Raw Snapshot Storage - Store raw API responses with timestamps for audit trail and debugging
3. Normalized Data Tables - Define and migrate tables for leads, pipeline_items, hot_list_items, notes, and scheduled_activities
4. Sync Worker Implementation - Build Node.js worker that runs hourly to fetch and normalize ClientTether data per tenant
5. Sync Status Tracking - Track last successful sync time per tenant and display freshness indicator in UI
6. Sync Error Handling - Implement retry logic with exponential backoff and error logging for failed syncs
7. Cached Fallback Display - Serve dashboard data from local database when sync fails, with warning banner showing data age
8. Leads Dashboard - Build dashboard view showing lead counts, sources, and status breakdown with ECharts visualizations
9. Pipeline Dashboard - Create pipeline view with stage breakdown, values, and progression charts
10. Hot List View - Display prioritized hot list items with key details and status indicators
11. Notes View - Show recent notes and communications with filtering and search capabilities
12. Schedule View - Display scheduled activities and appointments in list and calendar formats
13. Dashboard Navigation - Build tabbed navigation between dashboard views with active state and deep linking

## Requirements Discussion

### First Round Questions

**Q1:** How does the ClientTether API authentication work? Is there one Mellon-owned ClientTether account with multiple clients/brands inside, or does each tenant have their own ClientTether account with separate credentials?
**Answer:** There is ONE ClientTether account owned by Mellon (not individual accounts per tenant). Inside that account, there are multiple clients/brands. They can create a key for each brand to make it easy to fetch data. Start with the basics we currently have and expand from there.

**Q2:** For the sync worker, should we use a simple cron/node-cron approach, or implement a more robust job queue system for handling sync jobs?
**Answer:** Keep it simple - use simple cron/node-cron. No complex job queue system needed.

**Q3:** For failed syncs, what level of notification is needed? Database logging only, or should there be email/Slack notifications to alert agency admins?
**Answer:** Database logging is sufficient for failed syncs. No notifications needed.

**Q4:** For data storage, should we use a simple schema with default field mappings, or build an admin UI for configuring field mappings from ClientTether fields to portal fields?
**Answer:** Stick with simple schema for now. Use default field mappings (no admin UI for mappings needed). Will explore and expand this functionality after basics are set up.

**Q5:** For dashboard views, should the data show current/latest synced data only, or include date range filtering to view historical data?
**Answer:** Primarily show current/latest synced data. No date range filtering for now.

**Q6:** For dashboard navigation, should we use tabs on a single page or separate pages for each dashboard view (/leads, /pipeline, /hot-list, etc.)?
**Answer:** Use separate pages for dashboard views (/leads, /pipeline, /hot-list, etc.).

**Q7:** For the Notes view, what fields should be displayed? (e.g., date, author, content, associated lead/contact?)
**Answer:** Notes view should show: date, author, summary/content.

**Q8:** For the Schedule view, should we display a full calendar component, or a simple list of upcoming scheduled activities?
**Answer:** Simple list of upcoming activities. No calendar component needed.

**Q9:** What should be explicitly excluded from this milestone's scope?
**Answer:** Start with minimal viable sync, expand from there.

### Existing Code to Reference

No similar existing features identified for reference.

### Follow-up Questions

No follow-up questions needed - user provided clear MVP-focused answers for all clarifications.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Requirements Summary

### Functional Requirements

**ClientTether API Integration:**
- Build typed API client for ClientTether API
- Support per-tenant API keys (one key per brand/client within Mellon's single ClientTether account)
- Fetch data for: leads, pipeline, hot list, notes, and schedule
- Store tenant-specific ClientTether API keys in tenant configuration

**Data Sync System:**
- Implement hourly sync using node-cron (simple scheduler)
- Store raw API responses as snapshots with timestamps for audit/debugging
- Normalize data into structured tables: leads, pipeline_items, hot_list_items, notes, scheduled_activities
- Track last successful sync time per tenant
- Log sync errors to database (no external notifications)
- Implement retry logic with exponential backoff for transient failures

**Dashboard Views (Separate Pages):**
- `/leads` - Lead counts, sources, status breakdown with ECharts visualizations
- `/pipeline` - Stage breakdown, values, and progression charts
- `/hot-list` - Prioritized items with key details and status indicators
- `/notes` - Date, author, and summary/content display
- `/schedule` - Simple list of upcoming scheduled activities

**UI/UX:**
- Display freshness indicator showing last sync time
- Show warning banner with data age when serving cached data after sync failure
- Dashboard navigation between views with active state and deep linking
- Show current/latest synced data only (no date range filtering)

### Reusability Opportunities

- Existing tenant infrastructure from Milestone 1
- Auth.js session management for protecting dashboard routes
- Role-based access control for tenant data isolation
- ECharts library already specified in tech stack
- Tailwind CSS and shadcn/ui for dashboard components
- Drizzle ORM patterns for data models

### Scope Boundaries

**In Scope:**
- ClientTether API client with typed responses
- Raw snapshot storage for audit trail
- Normalized data tables (leads, pipeline_items, hot_list_items, notes, scheduled_activities)
- Simple node-cron based sync worker (hourly)
- Sync status tracking per tenant
- Database logging for sync errors
- Retry logic with exponential backoff
- Cached fallback with freshness warnings
- Five dashboard views as separate pages (leads, pipeline, hot-list, notes, schedule)
- Dashboard navigation with deep linking
- ECharts visualizations for leads and pipeline views

**Out of Scope:**
- Complex job queue system (use simple node-cron)
- External notifications for sync failures (email/Slack)
- Admin UI for configuring field mappings
- Date range filtering on dashboards
- Historical data viewing in dashboards
- Calendar component for schedule view
- Per-tenant ClientTether accounts (single Mellon account with per-brand keys)

### Technical Considerations

**API Architecture:**
- Single ClientTether account owned by Mellon
- Multiple clients/brands within that account
- Per-brand API keys stored in tenant configuration
- Start with basic data fields, expand later

**Sync Worker:**
- Node.js with node-cron for scheduling
- Hourly sync interval
- Per-tenant execution with tenant-scoped data
- Exponential backoff retry for transient failures
- Database logging for error tracking

**Data Storage:**
- PostgreSQL with Drizzle ORM
- Raw snapshots table for audit trail
- Normalized tables with tenant_id foreign keys
- Timestamps on all tables (created_at, updated_at)
- Indexes on foreign keys and frequently queried fields

**Frontend:**
- Astro SSR with React islands for interactive charts
- ECharts for data visualizations
- shadcn/ui components for dashboard UI
- Tailwind CSS for styling
- Separate page routes for each dashboard view

**Error Handling:**
- Graceful degradation with cached data fallback
- Clear freshness warnings to users
- Database logging for debugging
- No user-facing error details for security
