CREATE TYPE "public"."logistique_statut" AS ENUM('a_planifier', 'en_cours', 'confirme');--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "confirmation_logistique" "logistique_statut" DEFAULT 'a_planifier' NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "contact_sur_place_id" integer;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_contact_sur_place_id_contacts_id_fk" FOREIGN KEY ("contact_sur_place_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;