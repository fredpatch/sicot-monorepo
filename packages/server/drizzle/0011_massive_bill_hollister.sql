CREATE TABLE "gemini_usage_quotidien" (
	"id" serial PRIMARY KEY NOT NULL,
	"modele" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"nombre_appels" integer DEFAULT 0 NOT NULL,
	"thinking_tokens_total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapports_ia_quotidien" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"nombre_generes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rapports_ia_quotidien_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gemini_usage_modele_date_idx" ON "gemini_usage_quotidien" USING btree ("modele","date");