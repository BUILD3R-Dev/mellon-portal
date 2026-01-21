CREATE TABLE "ct_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" varchar(255),
	"note_date" timestamp NOT NULL,
	"author" varchar(255),
	"content" text,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ct_scheduled_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_type" varchar(100),
	"scheduled_at" timestamp NOT NULL,
	"contact_name" varchar(255),
	"description" text,
	"status" varchar(100),
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ct_notes" ADD CONSTRAINT "ct_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ct_scheduled_activities" ADD CONSTRAINT "ct_scheduled_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ct_notes_tenant_id_idx" ON "ct_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ct_notes_note_date_idx" ON "ct_notes" USING btree ("note_date");--> statement-breakpoint
CREATE INDEX "ct_scheduled_activities_tenant_id_idx" ON "ct_scheduled_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ct_scheduled_activities_scheduled_at_idx" ON "ct_scheduled_activities" USING btree ("scheduled_at");
