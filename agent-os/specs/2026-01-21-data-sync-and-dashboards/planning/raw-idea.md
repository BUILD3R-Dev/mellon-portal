# Raw Idea: Milestone 3 - Data Sync & Dashboards

## Feature Description

Milestone 3 focuses on integrating with the ClientTether API to sync external marketing data and display it through interactive dashboards within the portal. This milestone enables the agency to pull real-time data about leads, pipeline, hot list items, notes, and scheduled activities, then present this data to clients through various dashboard views.

## Scope

This milestone includes 13 features (items 20-32 from the roadmap):

1. **ClientTether API Client** - Build typed API client for fetching leads, pipeline, hot list, notes, and schedule data from ClientTether
2. **Raw Snapshot Storage** - Store raw API responses with timestamps for audit trail and debugging purposes
3. **Normalized Data Tables** - Define and migrate tables for leads, pipeline_items, hot_list_items, notes, and scheduled_activities
4. **Sync Worker Implementation** - Build Node.js worker that runs hourly to fetch and normalize ClientTether data per tenant
5. **Sync Status Tracking** - Track last successful sync time per tenant and display freshness indicator in UI
6. **Sync Error Handling** - Implement retry logic with exponential backoff and error logging for failed syncs
7. **Cached Fallback Display** - Serve dashboard data from local database when sync fails, with warning banner showing data age
8. **Leads Dashboard** - Build dashboard view showing lead counts, sources, and status breakdown with ECharts visualizations
9. **Pipeline Dashboard** - Create pipeline view with stage breakdown, values, and progression charts
10. **Hot List View** - Display prioritized hot list items with key details and status indicators
11. **Notes View** - Show recent notes and communications with filtering and search capabilities
12. **Schedule View** - Display scheduled activities and appointments in list and calendar formats
13. **Dashboard Navigation** - Build tabbed navigation between dashboard views with active state and deep linking

## Dependencies

- Requires Milestone 1 (tenant infrastructure) to be complete
- Can parallelize with Milestone 2
- Does not depend on Milestone 2 features

## Key Technical Components

- External API integration (ClientTether)
- Background worker/cron job system
- Data normalization and storage
- Error handling and resilience
- Data visualization (ECharts)
- Dashboard UI components
- Real-time sync status indicators
