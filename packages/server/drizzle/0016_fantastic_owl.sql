CREATE TYPE "public"."job_execution_source" AS ENUM('manuel', 'cron');--> statement-breakpoint
CREATE TABLE "job_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_cle" varchar(100) NOT NULL,
	"module" varchar(20) NOT NULL,
	"source" "job_execution_source" NOT NULL,
	"succes" boolean NOT NULL,
	"resume" text NOT NULL,
	"erreur" text,
	"duree_ms" integer NOT NULL,
	"declenche_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_declenche_par_users_id_fk" FOREIGN KEY ("declenche_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_executions_cle_idx" ON "job_executions" USING btree ("job_cle");--> statement-breakpoint
CREATE INDEX "job_executions_created_at_idx" ON "job_executions" USING btree ("created_at");