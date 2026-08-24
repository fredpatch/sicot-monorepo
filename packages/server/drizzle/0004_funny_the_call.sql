CREATE TYPE "public"."parametre_type" AS ENUM('entier', 'booleen', 'texte');--> statement-breakpoint
CREATE TABLE "parametres" (
	"id" serial PRIMARY KEY NOT NULL,
	"cle" varchar(100) NOT NULL,
	"valeur" text NOT NULL,
	"type" "parametre_type" NOT NULL,
	"module" varchar(20) NOT NULL,
	"description" text,
	"modifie_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parametres_cle_unique" UNIQUE("cle")
);
--> statement-breakpoint
ALTER TABLE "parametres" ADD CONSTRAINT "parametres_modifie_par_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;