ALTER TABLE "missions" ADD COLUMN "logistique_billet_reserve" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "logistique_hebergement_confirme" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "logistique_financement_valide" boolean DEFAULT false NOT NULL;