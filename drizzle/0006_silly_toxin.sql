ALTER TABLE "hot_list_items" ADD COLUMN "source_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "lead_metrics" ADD COLUMN "source_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "pipeline_stage_counts" ADD COLUMN "source_created_at" timestamp;