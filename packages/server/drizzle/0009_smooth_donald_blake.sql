CREATE TYPE "public"."rapport_format" AS ENUM('pdf', 'excel');--> statement-breakpoint
CREATE TYPE "public"."rapport_type" AS ENUM('mensuel', 'a_la_demande');--> statement-breakpoint
ALTER TYPE "public"."document_categorie" ADD VALUE 'rapport' BEFORE 'autre';--> statement-breakpoint
CREATE TABLE "rapports" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "rapport_type" NOT NULL,
	"periode_debut" timestamp NOT NULL,
	"periode_fin" timestamp NOT NULL,
	"modules_inclus" jsonb NOT NULL,
	"format" "rapport_format" NOT NULL,
	"document_id" integer NOT NULL,
	"genere_par_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_genere_par_user_id_users_id_fk" FOREIGN KEY ("genere_par_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;