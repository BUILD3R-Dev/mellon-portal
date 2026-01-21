-- Add composite index on (tenant_id, week_ending_date) for efficient queries
-- This index supports common queries that filter by tenant and order by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "report_weeks_tenant_week_ending_idx"
ON "report_weeks" ("tenant_id", "week_ending_date");

-- Add index on status field for filtering
-- Supports filtering report weeks by draft/published status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "report_weeks_status_idx"
ON "report_weeks" ("status");
