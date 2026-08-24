CREATE TYPE "public"."accord_statut" AS ENUM('actif', 'expire', 'suspendu', 'en_renouvellement');--> statement-breakpoint
CREATE TYPE "public"."courrier_direction" AS ENUM('entrant', 'sortant');--> statement-breakpoint
CREATE TYPE "public"."courrier_reponse_statut" AS ENUM('oui', 'non', 'pour_information');--> statement-breakpoint
CREATE TYPE "public"."courrier_suivi_statut" AS ENUM('en_attente', 'repondu', 'archive');--> statement-breakpoint
CREATE TYPE "public"."demande_priorite" AS ENUM('normale', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."demande_statut" AS ENUM('soumise', 'en_cours', 'en_relecture', 'validee', 'archivee');--> statement-breakpoint
CREATE TYPE "public"."document_categorie" AS ENUM('accord', 'correspondance', 'mission', 'traduction', 'glossaire', 'autre');--> statement-breakpoint
CREATE TYPE "public"."document_statut_ocr" AS ENUM('en_attente', 'traite', 'a_retraiter', 'echec');--> statement-breakpoint
CREATE TYPE "public"."mission_statut" AS ENUM('planifiee', 'en_cours', 'terminee', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."moteur_traduction" AS ENUM('libretranslate', 'deepl', 'manuel');--> statement-breakpoint
CREATE TYPE "public"."organisation_type" AS ENUM('anac_etrangere', 'organisation_internationale', 'autre');--> statement-breakpoint
CREATE TYPE "public"."recommandation_statut" AS ENUM('en_attente', 'en_cours', 'realisee');--> statement-breakpoint
CREATE TYPE "public"."traduction_direction" AS ENUM('fr_en', 'en_fr');--> statement-breakpoint
CREATE TYPE "public"."traduction_statut" AS ENUM('a_reviser', 'en_relecture', 'approuvee', 'archivee', 'manuelle_requise');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('agent', 'traducteur', 'relecteur', 'admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "accords" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(20) NOT NULL,
	"titre" varchar(255) NOT NULL,
	"statut" "accord_statut" DEFAULT 'actif' NOT NULL,
	"date_signature" timestamp NOT NULL,
	"date_expiration" timestamp,
	"parent_id" integer,
	"document_id" integer,
	"notes" text,
	"cree_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accords_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "accords_organisations" (
	"accord_id" integer NOT NULL,
	"organisation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"module" varchar(20) NOT NULL,
	"entite_id" integer,
	"details" jsonb,
	"ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"nom" varchar(100) NOT NULL,
	"prenom" varchar(100) NOT NULL,
	"email" varchar(255),
	"telephone" varchar(30),
	"poste" varchar(150),
	"principal" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(20) NOT NULL,
	"reference_expediteur" varchar(100),
	"direction" "courrier_direction" NOT NULL,
	"objet" varchar(500) NOT NULL,
	"expediteur_organisation_id" integer,
	"destinataire_organisation_id" integer,
	"date_reception" timestamp NOT NULL,
	"reponse_requise" "courrier_reponse_statut" NOT NULL,
	"date_limite_reponse" timestamp,
	"suivi_statut" "courrier_suivi_statut" DEFAULT 'en_attente' NOT NULL,
	"reponse_a_id" integer,
	"accord_id" integer,
	"mission_id" integer,
	"cree_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courriers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "demandes_traduction" (
	"id" serial PRIMARY KEY NOT NULL,
	"demandeur_id" integer NOT NULL,
	"traducteur_id" integer,
	"document_id" integer,
	"texte_libre" text,
	"direction" "traduction_direction" NOT NULL,
	"priorite_demandee" "demande_priorite" DEFAULT 'normale' NOT NULL,
	"priorite_validee" "demande_priorite",
	"statut" "demande_statut" DEFAULT 'soumise' NOT NULL,
	"traduction_id" integer,
	"verrou" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"nom_original" varchar(255) NOT NULL,
	"chemin" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"taille" integer NOT NULL,
	"categorie" "document_categorie" DEFAULT 'autre' NOT NULL,
	"langue" varchar(10),
	"texte_extrait" text,
	"statut_ocr" "document_statut_ocr" DEFAULT 'en_attente' NOT NULL,
	"hash_md5" varchar(32) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" integer,
	"uploade_par" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossaire" (
	"id" serial PRIMARY KEY NOT NULL,
	"terme_fr" varchar(255) NOT NULL,
	"terme_en" varchar(255) NOT NULL,
	"domaine" varchar(100),
	"contexte" text,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossaire_historique" (
	"id" serial PRIMARY KEY NOT NULL,
	"terme_id" integer NOT NULL,
	"ancien_terme_fr" varchar(255),
	"ancien_terme_en" varchar(255),
	"modifie_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_participants" (
	"mission_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"pays" varchar(100) NOT NULL,
	"date_debut" timestamp NOT NULL,
	"date_fin" timestamp NOT NULL,
	"statut" "mission_statut" DEFAULT 'planifiee' NOT NULL,
	"rapport_document_id" integer,
	"cree_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"pays" varchar(100) NOT NULL,
	"region" varchar(100),
	"type" "organisation_type" NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommandations" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"texte" text NOT NULL,
	"responsable_id" integer,
	"date_limite" timestamp,
	"statut" "recommandation_statut" DEFAULT 'en_attente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"texte_original" text,
	"texte_ia" text,
	"texte_final" text,
	"direction" "traduction_direction" NOT NULL,
	"statut" "traduction_statut" DEFAULT 'a_reviser' NOT NULL,
	"moteur_utilise" "moteur_traduction" DEFAULT 'libretranslate' NOT NULL,
	"traducteur_id" integer,
	"relecteur_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"matricule" varchar(20) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"prenom" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"mot_de_passe_hash" varchar(255),
	"otp_hash" varchar(255),
	"otp_expires_at" timestamp,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"actif" boolean DEFAULT false NOT NULL,
	"premiere_connexion" boolean DEFAULT true NOT NULL,
	"tentatives_echouees" integer DEFAULT 0 NOT NULL,
	"bloque_jusqu_a" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_matricule_unique" UNIQUE("matricule"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accords" ADD CONSTRAINT "accords_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accords" ADD CONSTRAINT "accords_cree_par_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accords_organisations" ADD CONSTRAINT "accords_organisations_accord_id_accords_id_fk" FOREIGN KEY ("accord_id") REFERENCES "public"."accords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accords_organisations" ADD CONSTRAINT "accords_organisations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_expediteur_organisation_id_organisations_id_fk" FOREIGN KEY ("expediteur_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_destinataire_organisation_id_organisations_id_fk" FOREIGN KEY ("destinataire_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_accord_id_accords_id_fk" FOREIGN KEY ("accord_id") REFERENCES "public"."accords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_cree_par_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_traduction" ADD CONSTRAINT "demandes_traduction_demandeur_id_users_id_fk" FOREIGN KEY ("demandeur_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_traduction" ADD CONSTRAINT "demandes_traduction_traducteur_id_users_id_fk" FOREIGN KEY ("traducteur_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_traduction" ADD CONSTRAINT "demandes_traduction_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_traduction" ADD CONSTRAINT "demandes_traduction_traduction_id_traductions_id_fk" FOREIGN KEY ("traduction_id") REFERENCES "public"."traductions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploade_par_users_id_fk" FOREIGN KEY ("uploade_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossaire" ADD CONSTRAINT "glossaire_cree_par_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossaire_historique" ADD CONSTRAINT "glossaire_historique_terme_id_glossaire_id_fk" FOREIGN KEY ("terme_id") REFERENCES "public"."glossaire"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossaire_historique" ADD CONSTRAINT "glossaire_historique_modifie_par_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_participants" ADD CONSTRAINT "mission_participants_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_participants" ADD CONSTRAINT "mission_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_rapport_document_id_documents_id_fk" FOREIGN KEY ("rapport_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_cree_par_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommandations" ADD CONSTRAINT "recommandations_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommandations" ADD CONSTRAINT "recommandations_responsable_id_users_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traductions" ADD CONSTRAINT "traductions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traductions" ADD CONSTRAINT "traductions_traducteur_id_users_id_fk" FOREIGN KEY ("traducteur_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traductions" ADD CONSTRAINT "traductions_relecteur_id_users_id_fk" FOREIGN KEY ("relecteur_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_module_idx" ON "audit_logs" USING btree ("module");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "courriers_direction_idx" ON "courriers" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "courriers_statut_idx" ON "courriers" USING btree ("suivi_statut");--> statement-breakpoint
CREATE INDEX "demandes_statut_idx" ON "demandes_traduction" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "demandes_traducteur_idx" ON "demandes_traduction" USING btree ("traducteur_id");--> statement-breakpoint
CREATE INDEX "documents_hash_idx" ON "documents" USING btree ("hash_md5");--> statement-breakpoint
CREATE INDEX "documents_categorie_idx" ON "documents" USING btree ("categorie");--> statement-breakpoint
CREATE INDEX "documents_statut_ocr_idx" ON "documents" USING btree ("statut_ocr");--> statement-breakpoint
CREATE INDEX "glossaire_terme_fr_idx" ON "glossaire" USING btree ("terme_fr");--> statement-breakpoint
CREATE INDEX "glossaire_terme_en_idx" ON "glossaire" USING btree ("terme_en");--> statement-breakpoint
CREATE UNIQUE INDEX "users_matricule_idx" ON "users" USING btree ("matricule");