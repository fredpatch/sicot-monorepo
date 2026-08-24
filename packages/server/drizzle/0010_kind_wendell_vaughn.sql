CREATE TYPE "public"."statut_relecture_ia" AS ENUM('non_applicable', 'en_attente', 'valide', 'rejete');--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "contenu_ia" text;--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "contenu_ia_valide" text;--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "statut_relecture_ia" "statut_relecture_ia" DEFAULT 'non_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "moteur_ia" varchar(50);--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "relecteur_ia_id" integer;--> statement-breakpoint
ALTER TABLE "rapports" ADD COLUMN "relus_le_ia" timestamp;--> statement-breakpoint
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_relecteur_ia_id_users_id_fk" FOREIGN KEY ("relecteur_ia_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;