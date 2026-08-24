CREATE TYPE "public"."notification_statut" AS ENUM('envoyee', 'echec');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('accord_echeance', 'courrier_relance', 'recommandation_rappel');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"entite_id" integer NOT NULL,
	"destinataire_email" varchar(255) NOT NULL,
	"destinataire_nom" varchar(200),
	"message" text NOT NULL,
	"declenche_par" integer NOT NULL,
	"statut" "notification_statut" DEFAULT 'envoyee' NOT NULL,
	"erreur" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_declenche_par_users_id_fk" FOREIGN KEY ("declenche_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_entite_idx" ON "notifications" USING btree ("type","entite_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");