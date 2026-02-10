CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_tenant_feature_key_idx" ON "feature_flags" USING btree ("tenant_id","feature_key");--> statement-breakpoint
CREATE INDEX "feature_flags_tenant_id_idx" ON "feature_flags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_exports_tenant_report_week_idx" ON "report_exports" USING btree ("tenant_id","report_week_id");--> statement-breakpoint
CREATE INDEX "report_exports_tenant_report_week_lookup_idx" ON "report_exports" USING btree ("tenant_id","report_week_id");