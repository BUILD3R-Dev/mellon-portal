ALTER TABLE "pipeline_stage_counts" ADD COLUMN "dollar_value" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "clienttether_access_token" text;--> statement-breakpoint
CREATE INDEX "lead_metrics_tenant_id_idx" ON "lead_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lead_metrics_report_week_id_idx" ON "lead_metrics" USING btree ("report_week_id");--> statement-breakpoint
CREATE INDEX "pipeline_stage_counts_tenant_id_idx" ON "pipeline_stage_counts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pipeline_stage_counts_report_week_id_idx" ON "pipeline_stage_counts" USING btree ("report_week_id");