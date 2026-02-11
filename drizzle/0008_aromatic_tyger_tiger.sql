ALTER TABLE "ct_notes" ADD COLUMN "source" varchar(50) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "ct_notes" ADD COLUMN "author_user_id" uuid;--> statement-breakpoint
ALTER TABLE "ct_notes" ADD COLUMN "author_user_name" varchar(255);--> statement-breakpoint
ALTER TABLE "ct_notes" ADD CONSTRAINT "ct_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;