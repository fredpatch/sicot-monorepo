CREATE TABLE "portail_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(36) NOT NULL,
	"expires_at" timestamp,
	"utilise_le" timestamp,
	"ip_utilisateur" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portail_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "visibilite_portail" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "portail_token_duree_jours" integer;--> statement-breakpoint
ALTER TABLE "portail_tokens" ADD CONSTRAINT "portail_tokens_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portail_tokens_token_idx" ON "portail_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "portail_tokens_document_idx" ON "portail_tokens" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "portail_tokens_email_idx" ON "portail_tokens" USING btree ("email");