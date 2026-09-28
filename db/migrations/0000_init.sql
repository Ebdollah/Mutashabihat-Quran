CREATE TABLE "set_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"verse_key" text NOT NULL,
	"surah" smallint NOT NULL,
	"ayah" smallint NOT NULL,
	"phrase_start" smallint NOT NULL,
	"phrase_end" smallint NOT NULL,
	"phrase_text" text NOT NULL,
	"text_snapshot" text NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_members_phrase_range" CHECK ("set_members"."phrase_start" >= 0 AND "set_members"."phrase_end" >= "set_members"."phrase_start"),
	CONSTRAINT "set_members_surah_range" CHECK ("set_members"."surah" BETWEEN 1 AND 114)
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "set_members" ADD CONSTRAINT "set_members_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_members" ADD CONSTRAINT "set_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "set_members_set_verse_uq" ON "set_members" USING btree ("set_id","verse_key");--> statement-breakpoint
CREATE INDEX "set_members_user_verse_idx" ON "set_members" USING btree ("user_id","verse_key");--> statement-breakpoint
CREATE INDEX "sets_user_updated_idx" ON "sets" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");