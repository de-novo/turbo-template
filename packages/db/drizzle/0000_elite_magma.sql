CREATE TABLE "system_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"event_version" text DEFAULT '1' NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" text
);
--> statement-breakpoint
CREATE INDEX "system_events_event_name_idx" ON "system_events" USING btree ("event_name");