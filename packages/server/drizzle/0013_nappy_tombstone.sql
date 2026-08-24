CREATE TABLE "courrier_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"courrier_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "expediteur_contact_id" integer;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "destinataire_contact_id" integer;--> statement-breakpoint
ALTER TABLE "courrier_documents" ADD CONSTRAINT "courrier_documents_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courrier_documents" ADD CONSTRAINT "courrier_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courrier_documents_courrier_idx" ON "courrier_documents" USING btree ("courrier_id");--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_expediteur_contact_id_contacts_id_fk" FOREIGN KEY ("expediteur_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_destinataire_contact_id_contacts_id_fk" FOREIGN KEY ("destinataire_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: courriers.document_id was the only document link before this
-- migration — carry existing links into the new multi-document join table
-- so nothing already attached goes missing from the "documents joints" list.
INSERT INTO "courrier_documents" ("courrier_id", "document_id")
SELECT "id", "document_id" FROM "courriers" WHERE "document_id" IS NOT NULL;