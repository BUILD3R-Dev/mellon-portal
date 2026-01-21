-- Add unique constraint on report_week_manual.report_week_id
-- This ensures one-to-one relationship between report_weeks and report_week_manual
CREATE UNIQUE INDEX IF NOT EXISTS "report_week_manual_report_week_id_idx" ON "report_week_manual" USING btree ("report_week_id");
